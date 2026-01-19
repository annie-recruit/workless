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

    // 첨부파일이 있다면 내용 분석
    let fullContext = memory.content;
    if (memory.attachments && memory.attachments.length > 0) {
      const fileContext = await summarizeAttachments(memory.attachments);
      if (fileContext) {
        fullContext += `\n\n[첨부된 파일 내용]\n${fileContext}`;
      }
    }
    const attachmentNames = memory.attachments?.map(att => att.filename).join(', ') || '없음';

    // AI에게 제안 요청
    const prompt = `
당신은 개인 비서입니다. 사용자의 기록을 **정확히 이해하고** 맥락에 맞는 실행 가능한 제안을 해주세요.

⚠️ 중요: 기록의 내용과 주제를 정확히 파악하고, **그 맥락에 맞는** 제안을 해야 합니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[기록 내용]
"${fullContext}"

📌 첨부 파일:
- 파일명: ${attachmentNames}

📌 분류 정보:
- 주제: ${memory.topic || '미분류'}
- 성격: ${memory.nature || '미분류'}
- 그룹: ${memory.clusterTag || '없음'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

위 기록의 **실제 내용과 맥락**을 바탕으로 다음을 제안해주세요:

1. **다음 단계** (Next Steps):
   - 이 기록에서 언급된 **구체적인 상황**을 고려한 행동 2-3개
   - 일반적인 조언이 아닌, **이 기록에 맞는** 실행 가능한 단계
   - 파일명/내용에 드러난 목적(예: 과제/소설/상상/기획/연구 등)을 스스로 추론해 반영
   - 각 항목은 **한 줄**(짧은 문장)로만 작성

2. **관련 자료** (Resources):
   - 이 기록의 **주제와 직접 관련된** 자료/도구 2-3개
   - 예: 기록이 "React 공부"라면 → React 공식 문서, 튜토리얼 등
   - 예: 기록이 "디자인 작업"이라면 → Figma, 디자인 참고 사이트 등
   - 가능하면 **공식 URL**을 포함해 주세요 (없으면 비워도 됨)
   - 설명은 **한 줄**로 짧게

3. **실행 계획** (Action Plan):
   - **이 기록의 목표를 달성하기 위한** 단계별 계획 3-4단계
   - 각 단계는 이 기록의 맥락에 맞게 구체적으로
   - 일반적인 "계획 세우기" 같은 단계는 피하고, 실제 행동 위주로
   - 각 단계는 **한 줄**로 간결하게 작성

JSON 형식:
{
  "nextSteps": ["이 기록에 맞는 구체적 단계1", "단계2", "단계3"],
  "resources": [
    {"name": "자료명", "description": "이 기록 주제와 관련된 설명", "type": "도구|문서|링크|강의", "url": "https://..."}
  ],
  "actionPlan": [
    {"step": 1, "action": "이 기록의 목표를 위한 구체적 행동", "timeframe": "예상 시간"}
  ]
}

⚠️ 다시 한번 강조: 기록의 **실제 내용**을 정확히 반영하고, 일반적인 생산성 팁이 아닌 **이 기록에 특화된** 제안을 해주세요.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 사용자의 기록을 정확히 이해하고 맥락에 맞는 구체적인 제안을 하는 개인 비서입니다. 일반적인 조언보다는 기록의 실제 내용에 기반한 실행 가능한 제안에 집중하세요.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
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
