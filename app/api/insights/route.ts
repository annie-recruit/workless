import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, personaDb } from '@/lib/db';
import { generateInsights } from '@/lib/ai';
import { getUserId } from '@/lib/auth';

// GET: 인사이트 조회
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get('personaId');

    // 페르소나 컨텍스트 조회 (사용자별)
    let personaContext: string | undefined;
    if (personaId) {
      const persona = personaDb.getById(personaId, userId);
      if (persona && persona.context) {
        personaContext = persona.context;
      }
    }

    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return NextResponse.json(
        { 
          error: 'OpenAI API 키가 설정되지 않았습니다. .env.local 파일의 OPENAI_API_KEY를 설정해주세요.',
        },
        { status: 500 }
      );
    }

    const memories = memoryDb.getAll(userId);
    const insights = await generateInsights(memories, personaContext);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Insights generation error:', error);
    
    // OpenAI API 키 오류인 경우 명확한 메시지
    if (error instanceof Error && (error.message.includes('API key') || error.message.includes('401') || error.message.includes('Unauthorized'))) {
      return NextResponse.json(
        { 
          error: 'OpenAI API 키가 올바르지 않습니다. .env.local 파일의 OPENAI_API_KEY를 확인해주세요.',
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    // 빈 객체가 아닌 명확한 에러 메시지 반환
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: '인사이트 생성 실패', 
        details: errorMessage || '알 수 없는 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}
