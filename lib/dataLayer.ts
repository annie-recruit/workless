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
      this.syncMode = (saved as SyncMode) || 'disabled';
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

  // ========================================
  // Memories
  // ========================================

  /**
   * 메모리 조회 (로컬 우선)
   */
  async getMemories(userId: string): Promise<Memory[]> {
    try {
      return await localDB.memories
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('createdAt');
    } catch (error) {
      console.error('Failed to get memories from local DB:', error);
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
        console.error('Background sync failed:', error);
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
        console.error('Background sync failed:', error);
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
        console.error('Background sync failed:', error);
        this.addToSyncQueue('delete', 'memories', { id });
      });
    }
  }

  // ========================================
  // Groups
  // ========================================

  async getGroups(userId: string): Promise<Group[]> {
    return await localDB.groups
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('updatedAt');
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
  // Server Sync (백그라운드)
  // ========================================

  private async getMemoriesFromServer(userId: string): Promise<Memory[]> {
    const res = await fetch('/api/memories');
    if (!res.ok) return [];
    const data = await res.json();
    return data.memories || [];
  }

  private async syncMemoryToServer(memory: Memory): Promise<void> {
    await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory),
    });
  }

  private async syncMemoryDeleteToServer(id: string): Promise<void> {
    await fetch(`/api/memories?id=${id}`, {
      method: 'DELETE',
    });
  }

  private async syncGroupToServer(group: Group): Promise<void> {
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
  }

  private async syncGroupDeleteToServer(id: string): Promise<void> {
    await fetch(`/api/groups?id=${id}`, {
      method: 'DELETE',
    });
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
    const data = await localDB.exportAll();
    
    // TODO: 암호화 추가
    // const encrypted = encrypt(data);
    
    await fetch('/api/sync/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, data }),
    });

    await localDB.markClean(userId);
  }

  /**
   * 서버에서 데이터 복원
   */
  async restoreFromServer(userId: string): Promise<void> {
    const res = await fetch(`/api/sync/restore?userId=${userId}`);
    if (!res.ok) {
      throw new Error('Failed to restore from server');
    }

    const { data } = await res.json();
    
    // TODO: 복호화 추가
    // const decrypted = decrypt(data);
    
    await localDB.importAll(data, false);
    await localDB.markClean(userId);
  }
}

// 싱글톤 인스턴스
export const dataLayer = new DataLayer();

// 개발 환경에서 디버깅용
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).dataLayer = dataLayer;
}
