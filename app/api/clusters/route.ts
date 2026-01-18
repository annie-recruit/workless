import { NextRequest, NextResponse } from 'next/server';
import { clusterDb, memoryDb } from '@/lib/db';
import { organizeMemoriesByContext } from '@/lib/clustering';

// GET: 클러스터 목록 조회
export async function GET(req: NextRequest) {
  try {
    const allMemories = memoryDb.getAll();
    const contextMap = organizeMemoriesByContext(allMemories);

    const clustersWithMemories = Array.from(contextMap.entries()).map(([tag, memories]) => ({
      tag,
      count: memories.length,
      memories: memories.slice(0, 5), // 미리보기용 최근 5개
      latestAt: Math.max(...memories.map(m => m.createdAt)),
    }));

    // 최근 업데이트 순 정렬
    clustersWithMemories.sort((a, b) => b.latestAt - a.latestAt);

    return NextResponse.json({ clusters: clustersWithMemories });
  } catch (error) {
    console.error('Cluster retrieval error:', error);
    return NextResponse.json(
      { error: '클러스터 조회 실패' },
      { status: 500 }
    );
  }
}
