import { Memory, Cluster } from '@/types';
import { clusterDb, memoryDb } from './db';

// 맥락 기반 클러스터링
export function organizeMemoriesByContext(memories: Memory[]): Map<string, Memory[]> {
  const clusters = new Map<string, Memory[]>();

  memories.forEach(memory => {
    const tag = memory.clusterTag || '미분류';
    if (!clusters.has(tag)) {
      clusters.set(tag, []);
    }
    clusters.get(tag)!.push(memory);
  });

  return clusters;
}

// 클러스터 생성 또는 업데이트
export function updateCluster(clusterTag: string, memories: Memory[]): Cluster {
  const existing = clusterDb.getAll().find(c => c.name === clusterTag);
  
  const memoryIds = memories.map(m => m.id);

  if (existing) {
    // 기존 클러스터 업데이트
    clusterDb.update(existing.id, {
      memoryIds,
    });
    return { ...existing, memoryIds, updatedAt: Date.now() };
  } else {
    // 새 클러스터 생성
    return clusterDb.create(clusterTag, memoryIds);
  }
}

// 반복 감지 및 카운트 업데이트
export function detectRepetition(newMemory: Memory, existingMemories: Memory[]): number {
  if (!newMemory.clusterTag) return 0;

  const sameCluster = existingMemories.filter(
    m => m.clusterTag === newMemory.clusterTag
  );

  return sameCluster.length + 1; // 현재 기억 포함
}

// 시간 간격 재등장 감지
export function detectReemergence(clusterTag: string, memories: Memory[]): boolean {
  const clusterMemories = memories
    .filter(m => m.clusterTag === clusterTag)
    .sort((a, b) => a.createdAt - b.createdAt);

  if (clusterMemories.length < 2) return false;

  // 마지막 두 기억 사이 간격이 7일 이상이면 "재등장"으로 판단
  const last = clusterMemories[clusterMemories.length - 1];
  const secondLast = clusterMemories[clusterMemories.length - 2];

  const daysDiff = (last.createdAt - secondLast.createdAt) / (1000 * 60 * 60 * 24);

  return daysDiff >= 7;
}

// 관련 기억 검색 (간단한 구현)
export function searchMemories(query: string, memories: Memory[]): Memory[] {
  const queryLower = query.toLowerCase();
  
  return memories.filter(m => 
    m.content.toLowerCase().includes(queryLower) ||
    m.topic?.toLowerCase().includes(queryLower) ||
    m.clusterTag?.toLowerCase().includes(queryLower)
  );
}
