import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, personaDb } from '@/lib/db';
import { suggestGroups } from '@/lib/ai';

// GET: AI 그룹 제안
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
    const suggestions = await suggestGroups(memories, personaContext);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Group suggestion error:', error);
    return NextResponse.json(
      { error: '그룹 제안 실패' },
      { status: 500 }
    );
  }
}
