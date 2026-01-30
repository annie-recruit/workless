/**
 * 로컬 우선 데이터베이스 (IndexedDB)
 * Obsidian 스타일: 모든 데이터는 기본적으로 로컬에 저장
 */

import Dexie, { Table } from 'dexie';
import type { Memory, Group, Goal, CanvasBlock } from '@/types';

// 보드 포지션 타입
export interface BoardPosition {
  userId: string;
  groupId: string;
  memoryId: string;
  x: number;
  y: number;
  updatedAt: number;
}

// 동기화 메타데이터
export interface SyncMetadata {
  key: string;
  lastSyncedAt: number;
  version: number;
  dirty: boolean; // 서버와 동기화 필요 여부
}

// 오프라인 큐 아이템
export interface QueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  createdAt: number;
  status: 'pending' | 'synced' | 'failed';
  error?: string;
}

/**
 * Workless 로컬 데이터베이스
 * 
 * 모든 데이터는 먼저 여기에 저장되고,
 * 사용자가 동기화를 켜면 서버로 백업됩니다.
 */
export class WorklessDB extends Dexie {
  // 테이블 정의
  memories!: Table<Memory, string>;
  groups!: Table<Group, string>;
  goals!: Table<Goal, string>;
  boardBlocks!: Table<CanvasBlock, string>;
  boardPositions!: Table<BoardPosition, string>;
  syncMetadata!: Table<SyncMetadata, string>;
  syncQueue!: Table<QueueItem, string>;

  constructor() {
    super('workless-local-db');

    // 스키마 버전 1
    this.version(1).stores({
      // 메모리: ID로 조회, userId/createdAt/clusterTag/topic으로 인덱싱
      memories: 'id, userId, createdAt, clusterTag, topic, [userId+clusterTag]',
      
      // 그룹: ID로 조회, userId/updatedAt으로 인덱싱
      groups: 'id, userId, updatedAt, [userId+isAIGenerated]',
      
      // 목표: ID로 조회, userId/status로 인덱싱
      goals: 'id, userId, status, [userId+status]',
      
      // 보드 블록: ID로 조회, userId/type으로 인덱싱
      boardBlocks: 'id, userId, type, [userId+type]',
      
      // 보드 포지션: 복합키 (userId+groupId+memoryId)
      boardPositions: '[userId+groupId+memoryId], userId, groupId',
      
      // 동기화 메타데이터
      syncMetadata: 'key, lastSyncedAt, dirty',
      
      // 오프라인 동기화 큐
      syncQueue: 'id, status, createdAt, [status+createdAt]',
    });
  }

  /**
   * 데이터베이스 초기화
   */
  async initialize(userId: string) {
    // 동기화 메타데이터 초기화
    const metadata = await this.syncMetadata.get('user_' + userId);
    if (!metadata) {
      await this.syncMetadata.add({
        key: 'user_' + userId,
        lastSyncedAt: 0,
        version: 1,
        dirty: false,
      });
    }
  }

  /**
   * 모든 데이터 내보내기 (백업용)
   */
  async exportAll() {
    return {
      version: 1,
      exportedAt: Date.now(),
      memories: await this.memories.toArray(),
      groups: await this.groups.toArray(),
      goals: await this.goals.toArray(),
      boardBlocks: await this.boardBlocks.toArray(),
      boardPositions: await this.boardPositions.toArray(),
      syncMetadata: await this.syncMetadata.toArray(),
    };
  }

  /**
   * 데이터 가져오기 (복원용)
   */
  async importAll(data: any, merge: boolean = false) {
    if (data.version !== 1) {
      throw new Error('지원하지 않는 백업 파일 버전입니다');
    }

    // 병합하지 않으면 기존 데이터 삭제
    if (!merge) {
      await this.transaction('rw', [
        this.memories,
        this.groups,
        this.goals,
        this.boardBlocks,
        this.boardPositions,
      ], async () => {
        await this.memories.clear();
        await this.groups.clear();
        await this.goals.clear();
        await this.boardBlocks.clear();
        await this.boardPositions.clear();
      });
    }

    // 데이터 복원
    await this.transaction('rw', [
      this.memories,
      this.groups,
      this.goals,
      this.boardBlocks,
      this.boardPositions,
    ], async () => {
      if (data.memories?.length) await this.memories.bulkPut(data.memories);
      if (data.groups?.length) await this.groups.bulkPut(data.groups);
      if (data.goals?.length) await this.goals.bulkPut(data.goals);
      if (data.boardBlocks?.length) await this.boardBlocks.bulkPut(data.boardBlocks);
      if (data.boardPositions?.length) await this.boardPositions.bulkPut(data.boardPositions);
    });
  }

  /**
   * 사용자 데이터 통계
   */
  async getStats(userId?: string) {
    // 특정 사용자용 통계
    const [memoriesCount, groupsCount, goalsCount, blocksCount] = await Promise.all([
      userId ? this.memories.where('userId').equals(userId).count() : this.memories.count(),
      userId ? this.groups.where('userId').equals(userId).count() : this.groups.count(),
      userId ? this.goals.where('userId').equals(userId).count() : this.goals.count(),
      userId ? this.boardBlocks.where('userId').equals(userId).count() : this.boardBlocks.count(),
    ]);

    // 전체 DB가 아예 비어있는지 확인용
    const totalGlobalItems = await Promise.all([
      this.memories.count(),
      this.groups.count(),
      this.goals.count(),
      this.boardBlocks.count(),
    ]).then(counts => counts.reduce((a, b) => a + b, 0));

    return {
      memoriesCount,
      groupsCount,
      goalsCount,
      blocksCount,
      totalItems: memoriesCount + groupsCount + goalsCount + blocksCount,
      totalGlobalItems
    };
  }

  /**
   * 동기화 필요 여부 확인
   */
  async needsSync(userId: string): Promise<boolean> {
    const metadata = await this.syncMetadata.get('user_' + userId);
    return metadata?.dirty ?? false;
  }

  /**
   * Dirty 플래그 설정
   */
  async markDirty(userId: string) {
    const key = 'user_' + userId;
    const metadata = await this.syncMetadata.get(key);
    if (metadata) {
      await this.syncMetadata.update(key, { dirty: true });
    } else {
      await this.syncMetadata.put({
        key,
        lastSyncedAt: 0,
        version: 1,
        dirty: true,
      });
    }
  }

  /**
   * Dirty 플래그 해제
   */
  async markClean(userId: string) {
    const key = 'user_' + userId;
    const metadata = await this.syncMetadata.get(key);
    if (metadata) {
      await this.syncMetadata.update(key, { 
        dirty: false,
        lastSyncedAt: Date.now(),
      });
    } else {
      await this.syncMetadata.put({
        key,
        lastSyncedAt: Date.now(),
        version: 1,
        dirty: false,
      });
    }
  }
}

// 싱글톤 인스턴스
export const localDB = new WorklessDB();

// 개발 환경에서 디버깅용
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).localDB = localDB;
}
