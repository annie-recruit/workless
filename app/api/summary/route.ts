import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 스크립트에서 요약 생성
 */
export async function POST(request: NextRequest) {
  try {
    const { script } = await request.json();

    if (!script || typeof script !== 'string') {
      return NextResponse.json(
        { error: '스크립트가 필요합니다.' },
        { status: 400 }
      );
    }

    // OpenAI로 요약 생성
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 회의 내용을 간결하게 요약하는 전문가입니다. 핵심 내용만 3-5줄로 요약해주세요.',
        },
        {
          role: 'user',
          content: `다음 회의 내용을 요약해주세요:\n\n${script}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const summary = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      summary,
      script, // 원본도 함께 반환
    });
  } catch (error) {
    console.error('[Summary] 요약 생성 실패:', error);
    return NextResponse.json(
      { error: '요약 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
