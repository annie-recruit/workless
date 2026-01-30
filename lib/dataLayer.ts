/**
 * 데이터 레이어: 로컬 우선 데이터 액세스
 * 
 * 모든 데이터 읽기/쓰기는 이 레이어를 통해 이루어집니다.
 * 기본적으로 로컬(IndexedDB)에서 읽고,
 * 동기화가 활성화되어 있으면 백그라운드로 서버에 백업합니다.
 */

import { nanoid } from 'nanoid';
import { localDB } from './localDB';
import type { Memory, Group, Goal, CanvasBlock } from '@/types';

export type DataSource = 'local' | 'server';
export type SyncMode = 'disabled' | 'enabled' | 'auto';

export class DataLayer {
  private syncMode: SyncMode = 'disabled';

  constructor() {
    // 로컬스토리지에서 동기화 설정 로드
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workless:syncMode');
      // 기본값을 auto로 변경하여 신규 사용자가 자연스럽게 동기화되도록 함
      this.syncMode = (saved as SyncMode) || 'auto';
      if (!saved) {
        localStorage.setItem('workless:syncMode', 'auto');
      }
    }
  }

  /**
   * 동기화 모드 설정
   */
  setSyncMode(mode: SyncMode) {
    this.syncMode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('workless:syncMode', mode);
    }
  }

  /**
   * 동기화 활성화 여부
   */
  isSyncEnabled(): boolean {
    return this.syncMode === 'enabled' || this.syncMode === 'auto';
  }

  /**
   * 로컬 데이터 마이그레이션 (email 또는 누락된 ID -> numeric ID)
   */
  async migrateLocalData(email: string, numericId: string): Promise<void> {
    if (!numericId) return;

    console.log(`Checking for local data migration to ${numericId}...`);
    
    // 마이그레이션 대상 ID들 (이메일, 빈 문자열, 구형 테스트 ID 등)
    const sourceIds = [email, '', 'test-user'].filter(id => id !== numericId);
    
    for (const sourceId of sourceIds) {
      // 1. Memories
      const memories = await localDB.memories.where('userId').equals(sourceId).toArray();
      if (memories.length > 0) {
        console.log(`Migrating ${memories.length} memories from ${sourceId} to ${numericId}`);
        const migrated = memories.map(m => ({ ...m, userId: numericId }));
        await localDB.memories.bulkPut(migrated);
      }

      // 2. Groups
      const groups = await localDB.groups.where('userId').equals(sourceId).toArray();
      if (groups.length > 0) {
        console.log(`Migrating ${groups.length} groups from ${sourceId} to ${numericId}`);
        const migrated = groups.map(g => ({ ...g, userId: numericId }));
        await localDB.groups.bulkPut(migrated);
      }

      // 3. Goals
      const goals = await localDB.goals.where('userId').equals(sourceId).toArray();
      if (goals.length > 0) {
        console.log(`Migrating ${goals.length} goals from ${sourceId} to ${numericId}`);
        const migrated = goals.map(g => ({ ...g, userId: numericId }));
        await localDB.goals.bulkPut(migrated);
      }

      // 4. Board Blocks
      const blocks = await localDB.boardBlocks.where('userId').equals(sourceId).toArray();
      if (blocks.length > 0) {
        console.log(`Migrating ${blocks.length} board blocks from ${sourceId} to ${numericId}`);
        const migrated = blocks.map(b => ({ ...b, userId: numericId }));
        await localDB.boardBlocks.bulkPut(migrated);
      }
    }

    console.log('Local data migration check completed');
  }

  // ========================================
  // Memories
  // ========================================

  /**
   * 메모리 조회 (로컬 우선)
   */
  async getMemories(userId: string): Promise<Memory[]> {
    try {
      const localMemories = await localDB.memories
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('createdAt');
      
      // 로컬에 데이터가 없고 동기화가 활성화되어 있으면 서버에서 가져오기 시도
      if (localMemories.length === 0 && this.isSyncEnabled()) {
        console.log('[DataLayer] No local memories found, attempting to fetch from server...');
        const serverMemories = await this.getMemoriesFromServer(userId);
        if (serverMemories.length > 0) {
          // 서버 데이터를 로컬에 저장 (백그라운드)
          await localDB.memories.bulkPut(serverMemories).catch(console.error);
          return serverMemories;
        }
      }
      
      return localMemories;
    } catch (error) {
      console.error('[DataLayer] Failed to get memories from local DB:', error);
      // 폴백: 서버에서 가져오기
      return this.getMemoriesFromServer(userId);
    }
  }

  /**
   * 메모리 생성 (로컬 우선)
   */
  async createMemory(
    userId: string, 
    content: string, 
    classification?: Partial<Memory>
  ): Promise<Memory> {
    const memory: Memory = {
      id: nanoid(),
      userId,
      content,
      createdAt: Date.now(),
      repeatCount: 0,
      ...classification,
    };

    // 1. 로컬에 즉시 저장
    await localDB.memories.add(memory);
    await localDB.markDirty(userId);

    // 2. 동기화 활성화 시 백그라운드로 서버에 전송
    if (this.isSyncEnabled()) {
      this.syncMemoryToServer(memory).catch(error => {
        console.error('[DataLayer] Background sync failed:', error);
        // 실패 시 큐에 추가
        this.addToSyncQueue('create', 'memories', memory);
      });
    }

    return memory;
  }

  /**
   * 메모리 업데이트 (로컬 우선)
   */
  async updateMemory(id: string, userId: string, updates: Partial<Memory>): Promise<void> {
    // 1. 로컬 업데이트
    await localDB.memories.update(id, updates);
    await localDB.markDirty(userId);

    // 2. 동기화
    if (this.isSyncEnabled()) {
      this.syncMemoryToServer({ id, ...updates } as Memory).catch(error => {
        console.error('[DataLayer] Background sync failed:', error);
        this.addToSyncQueue('update', 'memories', { id, ...updates });
      });
    }
  }

  /**
   * 메모리 삭제 (로컬 우선)
   */
  async deleteMemory(id: string, userId: string): Promise<void> {
    // 1. 로컬 삭제
    await localDB.memories.delete(id);
    await localDB.markDirty(userId);

    // 2. 동기화
    if (this.isSyncEnabled()) {
      this.syncMemoryDeleteToServer(id).catch(error => {
        console.error('[DataLayer] Background sync failed:', error);
        this.addToSyncQueue('delete', 'memories', { id });
      });
    }
  }

  // ========================================
  // Groups
  // ========================================

  async getGroups(userId: string): Promise<Group[]> {
    try {
      const localGroups = await localDB.groups
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('updatedAt');

      // 로컬에 그룹이 없고 동기화가 활성화되어 있으면 서버에서 가져오기 시도
      if (localGroups.length === 0 && this.isSyncEnabled()) {
        const res = await fetch('/api/groups');
        if (res.ok) {
          const data = await res.json();
          const serverGroups = data.groups || [];
          if (serverGroups.length > 0) {
            await localDB.groups.bulkPut(serverGroups).catch(console.error);
            return serverGroups;
          }
        }
      }
      return localGroups;
    } catch (error) {
      console.error('[DataLayer] Failed to get groups from local DB:', error);
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        return data.groups || [];
      }
      return [];
    }
  }

  async createGroup(userId: string, name: string, memoryIds: string[]): Promise<Group> {
    const group: Group = {
      id: nanoid(),
      userId,
      name,
      memoryIds,
      isAIGenerated: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await localDB.groups.add(group);
    await localDB.markDirty(userId);

    if (this.isSyncEnabled()) {
      this.syncGroupToServer(group).catch(console.error);
    }

    return group;
  }

  async updateGroup(id: string, userId: string, updates: Partial<Group>): Promise<void> {
    await localDB.groups.update(id, { ...updates, updatedAt: Date.now() });
    await localDB.markDirty(userId);

    if (this.isSyncEnabled()) {
      this.syncGroupToServer({ id, ...updates } as Group).catch(console.error);
    }
  }

  async deleteGroup(id: string, userId: string): Promise<void> {
    await localDB.groups.delete(id);
    await localDB.markDirty(userId);

    if (this.isSyncEnabled()) {
      this.syncGroupDeleteToServer(id).catch(console.error);
    }
  }

  // ========================================
  // Board Blocks
  // ========================================

  async getBlocks(userId: string): Promise<CanvasBlock[]> {
    try {
      const localBlocks = await localDB.boardBlocks
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('createdAt');

      if (localBlocks.length === 0 && this.isSyncEnabled()) {
        const res = await fetch('/api/board/blocks');
        if (res.ok) {
          const data = await res.json();
          const serverBlocks = data.blocks || [];
          if (serverBlocks.length > 0) {
            await localDB.boardBlocks.bulkPut(serverBlocks).catch(console.error);
            return serverBlocks;
          }
        }
      }
      return localBlocks;
    } catch (error) {
      console.error('[DataLayer] Failed to get blocks from local DB:', error);
      const res = await fetch('/api/board/blocks');
      if (res.ok) {
        const data = await res.json();
        return data.blocks || [];
      }
      return [];
    }
  }

  async createBlock(userId: string, block: Omit<CanvasBlock, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<CanvasBlock> {
    const id = nanoid();
    const now = Date.now();
    const newBlock: CanvasBlock = {
      id,
      userId,
      ...block,
      createdAt: now,
      updatedAt: now,
    };

    await localDB.boardBlocks.add(newBlock);
    await localDB.markDirty(userId);

    if (this.isSyncEnabled()) {
      this.syncBlockToServer(newBlock).catch(console.error);
    }

    return newBlock;
  }

  async updateBlock(id: string, userId: string, updates: Partial<CanvasBlock>): Promise<void> {
    await localDB.boardBlocks.update(id, { ...updates, updatedAt: Date.now() });
    await localDB.markDirty(userId);

    if (this.isSyncEnabled()) {
      this.syncBlockToServer({ id, ...updates } as CanvasBlock).catch(console.error);
    }
  }

  async deleteBlock(id: string, userId: string): Promise<void> {
    await localDB.boardBlocks.delete(id);
    await localDB.markDirty(userId);

    if (this.isSyncEnabled()) {
      this.syncBlockDeleteToServer(id).catch(console.error);
    }
  }

  private async syncBlockToServer(block: CanvasBlock): Promise<void> {
    await fetch('/api/board/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(block),
    });
  }

  private async syncBlockDeleteToServer(id: string): Promise<void> {
    await fetch(`/api/board/blocks?id=${id}`, {
      method: 'DELETE',
    });
  }

  // ========================================
  // Server Sync (백그라운드)
  // ========================================

  private async getMemoriesFromServer(userId: string): Promise<Memory[]> {
    const res = await fetch('/api/memories');
    if (!res.ok) return [];
    const data = await res.json();
    return data.memories || [];
  }

  private async syncMemoryToServer(memory: Memory): Promise<void> {
    console.log(`[Sync] Background sync starting for memory ${memory.id}`);
    const res = await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Sync] Background sync failed for memory ${memory.id}:`, err);
      throw new Error(err);
    }
    console.log(`[Sync] Background sync successful for memory ${memory.id}`);
  }

  private async syncMemoryDeleteToServer(id: string): Promise<void> {
    console.log(`[Sync] Background delete starting for memory ${id}`);
    const res = await fetch(`/api/memories?id=${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      console.error(`[Sync] Background delete failed for memory ${id}`);
      throw new Error('Delete failed');
    }
    console.log(`[Sync] Background delete successful for memory ${id}`);
  }

  private async syncGroupToServer(group: Group): Promise<void> {
    console.log(`[Sync] Background sync starting for group ${group.id}`);
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
    if (!res.ok) {
      console.error(`[Sync] Background sync failed for group ${group.id}`);
      throw new Error('Sync failed');
    }
    console.log(`[Sync] Background sync successful for group ${group.id}`);
  }

  private async syncGroupDeleteToServer(id: string): Promise<void> {
    console.log(`[Sync] Background delete starting for group ${id}`);
    const res = await fetch(`/api/groups?id=${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      console.error(`[Sync] Background delete failed for group ${id}`);
      throw new Error('Delete failed');
    }
    console.log(`[Sync] Background delete successful for group ${id}`);
  }

  // ========================================
  // Offline Queue
  // ========================================

  private async addToSyncQueue(
    type: 'create' | 'update' | 'delete',
    collection: string,
    data: any
  ): Promise<void> {
    await localDB.syncQueue.add({
      id: nanoid(),
      type,
      collection,
      data,
      createdAt: Date.now(),
      status: 'pending',
    });
  }

  /**
   * 오프라인 큐 처리
   */
  async processSyncQueue(): Promise<void> {
    const pending = await localDB.syncQueue
      .where('status')
      .equals('pending')
      .toArray();

    console.log(`Processing ${pending.length} queued operations...`);

    for (const item of pending) {
      try {
        // 실제 동기화 수행
        if (item.collection === 'memories') {
          if (item.type === 'create' || item.type === 'update') {
            await this.syncMemoryToServer(item.data);
          } else if (item.type === 'delete') {
            await this.syncMemoryDeleteToServer(item.data.id);
          }
        } else if (item.collection === 'groups') {
          if (item.type === 'create' || item.type === 'update') {
            await this.syncGroupToServer(item.data);
          } else if (item.type === 'delete') {
            await this.syncGroupDeleteToServer(item.data.id);
          }
        }

        // 성공 시 큐에서 제거
        await localDB.syncQueue.update(item.id, { status: 'synced' });
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        await localDB.syncQueue.update(item.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  // ========================================
  // 전체 동기화
  // ========================================

  /**
   * 서버로 전체 데이터 백업
   */
  async backupToServer(userId: string): Promise<void> {
    console.log(`[Sync] Full backup starting for user ${userId}...`);
    const data = await localDB.exportAll();
    
    // 유저 필터링: 현재 유저의 데이터만 백업하도록 클라이언트에서 1차 필터링
    const filteredData = {
      ...data,
      memories: data.memories.filter((m: any) => m.userId === userId),
      groups: data.groups.filter((g: any) => g.userId === userId),
      goals: data.goals.filter((g: any) => g.userId === userId),
      boardBlocks: data.boardBlocks.filter((b: any) => b.userId === userId),
      boardPositions: data.boardPositions.filter((p: any) => p.userId === userId),
    };

    console.log(`[Sync] Backing up ${filteredData.memories.length} memories, ${filteredData.groups.length} groups...`);
    
    const res = await fetch('/api/sync/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, data: filteredData }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Sync] Full backup failed:`, err);
      throw new Error(err);
    }

    console.log(`[Sync] Full backup successful for user ${userId}`);
    await localDB.markClean(userId);
  }

  /**
   * 서버에서 데이터 복원
   */
  async restoreFromServer(userId: string): Promise<void> {
    console.log(`[Sync] Restore starting for user ${userId}...`);
    const res = await fetch(`/api/sync/restore?userId=${userId}`);
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Sync] Restore failed:`, err);
      throw new Error(err);
    }

    const { data } = await res.json();
    console.log(`[Sync] Received ${data.memories?.length || 0} memories from server`);
    
    // 서버 데이터가 비어있으면 로컬을 굳이 덮어씌우지 않음 (병합 모드 사용 권장)
    const hasData = (data.memories?.length || 0) + (data.groups?.length || 0) > 0;
    if (hasData) {
      await localDB.importAll(data, false);
      console.log(`[Sync] Restore completed: imported ${data.memories?.length} memories`);
    } else {
      console.log('[Sync] Server data is empty, skipping restore to prevent local data loss');
    }
    await localDB.markClean(userId);
  }
  /**
   * 모든 로컬 데이터 진단 (ID 무관)
   */
  async debugGetAllLocalData(): Promise<any> {
    const memories = await localDB.memories.toArray();
    const groups = await localDB.groups.toArray();
    return {
      memories,
      groups,
      userIds: Array.from(new Set(memories.map(m => m.userId)))
    };
  }
}

// 싱글톤 인스턴스
export const dataLayer = new DataLayer();

// 개발 환경에서 디버깅용
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).dataLayer = dataLayer;
}
