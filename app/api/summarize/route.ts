import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, clusterDb } from '@/lib/db';
import { generateSummary, generateSuggestions } from '@/lib/ai';
import { searchMemories, organizeMemoriesByContext } from '@/lib/clustering';

// POST: 요약 요청
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: '질문을 입력해주세요' },
        { status: 400 }
      );
    }

    // 전체 기억 조회
    const allMemories = memoryDb.getAll();

    // 관련 기억 검색
    const relatedMemories = searchMemories(query, allMemories);

    // 요약 생성
    const summary = await generateSummary(query, relatedMemories);

    // 맥락별 묶음
    const contextMap = organizeMemoriesByContext(relatedMemories);
    const clusters = clusterDb.getAll().filter(c => 
      Array.from(contextMap.keys()).includes(c.name)
    );

    // 조건부 제안
    const suggestions = await generateSuggestions(relatedMemories);

    return NextResponse.json({
      summary,
      relatedMemories,
      clusters,
      suggestions,
    });
  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: '요약 생성 실패' },
      { status: 500 }
    );
  }
}
