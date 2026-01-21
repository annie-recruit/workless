import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: '오디오 파일이 필요합니다' },
        { status: 400 }
      );
    }

    // File을 Buffer로 변환
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // OpenAI Whisper API는 File-like 객체를 받음
    // Buffer를 File로 변환
    const file = new File([buffer], audioFile.name, { 
      type: audioFile.type || 'audio/webm' 
    });

    // 1. 음성을 텍스트로 변환 (스크립트)
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'ko', // 한국어로 지정
    });

    const script = transcription.text;

    // 2. 스크립트를 요약 (노션 AI 회의록 스타일)
    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '너는 회의록 요약 전문가야. 회의 내용을 간결하고 명확하게 요약해줘. 다음 형식으로 작성해줘:\n\n## 회의 요약\n\n### 주요 논의 사항\n- [핵심 내용 1]\n- [핵심 내용 2]\n- [핵심 내용 3]\n\n### 결정 사항\n- [결정된 내용]\n\n### 다음 액션 아이템\n- [해야 할 일]'
        },
        {
          role: 'user',
          content: `다음 회의 스크립트를 요약해줘:\n\n${script}`
        }
      ],
      temperature: 0.3,
    });

    const summary = summaryResponse.choices[0]?.message?.content || '요약을 생성하지 못했습니다.';

    return NextResponse.json({
      script: script,
      summary: summary,
    });
  } catch (error: any) {
    console.error('음성 변환 실패:', error);
    return NextResponse.json(
      { error: error.message || '음성 변환 실패' },
      { status: 500 }
    );
  }
}
