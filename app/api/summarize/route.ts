import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, clusterDb, personaDb } from '@/lib/db';
import { generateSummary, generateSuggestions } from '@/lib/ai';
import { searchMemories, organizeMemoriesByContext } from '@/lib/clustering';
import { getUserId } from '@/lib/auth';

// POST: 요약 요청
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const { query, personaId } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: '질문을 입력해주세요' },
        { status: 400 }
      );
    }

    // 페르소나 컨텍스트 조회 (사용자별)
    let personaContext: string | undefined;
    if (personaId) {
      const persona = personaDb.getById(personaId, userId);
      if (persona && persona.context) {
        personaContext = persona.context;
      }
    }

    // 전체 기억 조회 (사용자별)
    const allMemories = memoryDb.getAll(userId);

    // 관련 기억 검색
    const relatedMemories = searchMemories(query, allMemories);

    // 요약 생성 (페르소나 컨텍스트 포함)
    const summary = await generateSummary(query, relatedMemories, personaContext);

    // 맥락별 묶음
    const contextMap = organizeMemoriesByContext(relatedMemories);
    const clusters = clusterDb.getAll().filter(c => 
      Array.from(contextMap.keys()).includes(c.name)
    );

    // 조건부 제안 (페르소나 컨텍스트 포함)
    const suggestions = await generateSuggestions(relatedMemories, personaContext);

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
