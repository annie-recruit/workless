/**
 * 로컬 우선 메모리 훅
 * 
 * IndexedDB에서 실시간으로 메모리를 읽어오고,
 * 변경사항을 자동으로 반영합니다.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { localDB } from '@/lib/localDB';
import { dataLayer } from '@/lib/dataLayer';
import type { Memory } from '@/types';

export function useLocalMemories(userId: string) {
  // session에서 실제 ID 가져오기 (이메일 대신 내부 ID 사용 권장)
  const { data: session } = useSession();
  const actualUserId = (session?.user as any)?.id || userId;

  // IndexedDB에서 실시간 쿼리
  const memories = useLiveQuery(
    () => localDB.memories
      .where('userId')
      .equals(actualUserId)
      .reverse()
      .sortBy('createdAt'),
    [actualUserId]
  );

  // 메모리 생성
  const createMemory = useCallback(
    async (content: string, classification?: Partial<Memory>) => {
      return await dataLayer.createMemory(actualUserId, content, classification);
    },
    [actualUserId]
  );

  // 메모리 업데이트
  const updateMemory = useCallback(
    async (id: string, updates: Partial<Memory>) => {
      await dataLayer.updateMemory(id, actualUserId, updates);
    },
    [actualUserId]
  );

  // 메모리 삭제
  const deleteMemory = useCallback(
    async (id: string) => {
      await dataLayer.deleteMemory(id, actualUserId);
    },
    [actualUserId]
  );

  // 메모리 통계
  const stats = useLiveQuery(
    async () => {
      const count = await localDB.memories
        .where('userId')
        .equals(actualUserId)
        .count();
      return { count };
    },
    [actualUserId]
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
