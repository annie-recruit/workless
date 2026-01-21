import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, personaDb } from '@/lib/db';
import { generateInsights } from '@/lib/ai';

// GET: 인사이트 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get('personaId');

    // 페르소나 컨텍스트 조회
    let personaContext: string | undefined;
    if (personaId) {
      const persona = personaDb.getById(personaId);
      if (persona && persona.context) {
        personaContext = persona.context;
      }
    }

    const memories = memoryDb.getAll();
    const insights = await generateInsights(memories, personaContext);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Insights generation error:', error);
    return NextResponse.json(
      { error: '인사이트 생성 실패' },
      { status: 500 }
    );
  }
}
