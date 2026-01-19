import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db';
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

    // AI에게 제안 요청
    const prompt = `
당신은 생산성 코치입니다. 사용자의 기록을 분석하고 실행 가능한 제안을 해주세요.

[기록 내용]
"${memory.content}"

주제: ${memory.topic || '없음'}
성격: ${memory.nature || '없음'}
클러스터: ${memory.clusterTag || '없음'}

다음 세 가지를 제안해주세요:

1. **다음 단계** (Next Steps):
   - 이 기록을 바탕으로 다음에 해야 할 구체적인 행동 2-3개
   - 실행 가능하고 구체적으로

2. **관련 자료** (Resources):
   - 이 주제에 도움이 될 자료/도구/링크 2-3개
   - 구체적인 이름과 간단한 설명

3. **실행 계획** (Action Plan):
   - 단계별로 나눈 실행 계획 3-4단계
   - 각 단계는 명확하고 측정 가능하게

JSON 형식:
{
  "nextSteps": ["단계1", "단계2", "단계3"],
  "resources": [
    {"name": "자료명", "description": "설명", "type": "도구|문서|링크|강의"}
  ],
  "actionPlan": [
    {"step": 1, "action": "행동", "timeframe": "예상 시간"}
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const suggestions = JSON.parse(response.choices[0].message.content || '{}');

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Failed to generate suggestions:', error);
    return NextResponse.json(
      { error: '제안 생성 실패' },
      { status: 500 }
    );
  }
}
