/**
 * 로컬 우선 메모리 훅
 * 
 * IndexedDB에서 실시간으로 메모리를 읽어오고,
 * 변경사항을 자동으로 반영합니다.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { localDB } from '@/lib/localDB';
import { dataLayer } from '@/lib/dataLayer';
import type { Memory } from '@/types';

export function useLocalMemories(userId: string) {
  // IndexedDB에서 실시간 쿼리
  const memories = useLiveQuery(
    () => localDB.memories
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('createdAt'),
    [userId]
  );

  // 메모리 생성
  const createMemory = useCallback(
    async (content: string, classification?: Partial<Memory>) => {
      return await dataLayer.createMemory(userId, content, classification);
    },
    [userId]
  );

  // 메모리 업데이트
  const updateMemory = useCallback(
    async (id: string, updates: Partial<Memory>) => {
      await dataLayer.updateMemory(id, userId, updates);
    },
    [userId]
  );

  // 메모리 삭제
  const deleteMemory = useCallback(
    async (id: string) => {
      await dataLayer.deleteMemory(id, userId);
    },
    [userId]
  );

  // 메모리 통계
  const stats = useLiveQuery(
    async () => {
      const count = await localDB.memories
        .where('userId')
        .equals(userId)
        .count();
      return { count };
    },
    [userId]
  );

  return {
    memories: memories || [],
    createMemory,
    updateMemory,
    deleteMemory,
    stats,
    isLoading: memories === undefined,
  };
}
