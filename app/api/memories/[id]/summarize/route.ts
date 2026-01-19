import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db';
import { summarizeAttachments } from '@/lib/ai';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memory = memoryDb.getById(id);

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

    // AI 요약 생성 (2-3줄로 짧게)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 기록을 간결하게 요약하는 AI입니다. 
          주어진 기록과 첨부파일 내용을 종합하여 2-3줄(최대 100자)로 핵심만 요약해주세요.
          요약은 자연스러운 한국어로 작성하고, 이모지는 사용하지 마세요.
          첨부파일이 있다면 그 내용도 반영해주세요.`,
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
    return NextResponse.json(
      { error: '요약 생성 실패' },
      { status: 500 }
    );
  }
}
