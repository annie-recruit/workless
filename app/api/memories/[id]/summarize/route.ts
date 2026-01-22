import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, personaDb } from '@/lib/db';
import { summarizeAttachments } from '@/lib/ai';
import { getUserId } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get('personaId');
    
    console.log('📝 요약 API - 받은 personaId:', personaId, 'userId:', userId);
    
    // 페르소나 컨텍스트 조회
    let personaContext: string | undefined;
    let personaName: string | undefined;
    if (personaId) {
      const persona = personaDb.getById(personaId, userId);
      console.log('📝 페르소나 조회 결과:', persona ? persona.name : '없음');
      if (persona) {
        personaName = persona.name;
        // context가 있으면 사용, 없으면 description 사용
        personaContext = persona.context || persona.description;
        console.log('🎭 페르소나 적용:', personaName, '컨텍스트:', personaContext?.substring(0, 50) + '...');
      } else {
        console.log('⚠️ 페르소나를 찾을 수 없음:', personaId, 'userId:', userId);
      }
    } else {
      console.log('ℹ️ 페르소나 미선택 - 기본 모드로 요약');
    }

    const memory = memoryDb.getById(id, userId);

    if (!memory) {
      return NextResponse.json(
        { error: '기억을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 첨부파일이 있으면 분석
    let attachmentContext = '';
    if (memory.attachments && memory.attachments.length > 0) {
      console.log('📎 첨부파일 분석 시작:', memory.attachments.length, '개');
      attachmentContext = await summarizeAttachments(memory.attachments);
      console.log('📎 첨부파일 분석 완료:', attachmentContext.substring(0, 100) + '...');
    }

    // 기억 내용 + 첨부파일 컨텍스트 합치기
    const fullContext = attachmentContext 
      ? `[기록 내용]\n${memory.content}\n\n[첨부파일 내용]\n${attachmentContext}`
      : memory.content;

    // 페르소나 프롬프트 추가
    const systemMessage = personaContext 
      ? `당신은 "${personaName || '전문가'}" 페르소나의 관점에서 기록을 분석하는 AI입니다.

페르소나 정보:
- 이름: ${personaName || '전문가'}
- 관점: ${personaContext}

이 페르소나의 전문 분야와 관점을 반영하여 기록을 요약해주세요. 주어진 기록과 첨부파일 내용을 종합하여 2-3줄(최대 100자)로 핵심만 요약하되, "${personaContext}" 관점에서 이 기록의 의미와 중요성을 강조해주세요.

요약은 자연스러운 한국어로 작성하고, 이모지는 사용하지 마세요.`
      : `당신은 기록을 간결하게 요약하는 AI입니다. 
주어진 기록과 첨부파일 내용을 종합하여 2-3줄(최대 100자)로 핵심만 요약해주세요.
요약은 자연스러운 한국어로 작성하고, 이모지는 사용하지 마세요.
첨부파일이 있다면 그 내용도 반영해주세요.`;

    // AI 요약 생성 (2-3줄로 짧게)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: fullContext,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const summary = completion.choices[0]?.message?.content || '요약을 생성할 수 없습니다.';

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Failed to generate summary:', error);
    
    // OpenAI API 키 오류인 경우 명확한 메시지
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { 
          error: 'OpenAI API 키가 올바르지 않습니다. .env.local 파일의 OPENAI_API_KEY를 확인해주세요.',
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: '요약 생성 실패',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
