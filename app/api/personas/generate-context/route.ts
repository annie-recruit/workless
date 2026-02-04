import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const prompt = `
당신은 사용자의 워크스페이스에서 활동할 AI 페르소나의 '시스템 컨텍스트(System Context)'를 작성하는 전문가입니다.
사용자가 입력한 페르소나의 이름과 설명을 바탕으로, 이 페르소나가 AI로서 어떤 관점을 가져야 하는지, 어떤 전문성을 발휘해야 하는지, 어떤 말투를 써야 하는지를 포함한 상세한 AI 시스템 프롬프트를 작성해주세요.

[페르소나 정보]
이름: ${name || '지정되지 않음'}
설명: ${description}

[작성 가이드라인]
1. 이 페르소나의 핵심 역할과 목표를 명확히 정의하세요.
2. 분석이나 답변 시 중점적으로 고려해야 할 가치나 관점을 포함하세요.
3. 선호하는 말투나 태도를 설정하세요 (예: 전문적인, 친절한, 비판적인, 창의적인 등).
4. 결과물은 2~3문장 정도로 간결하지만 핵심적인 내용이 모두 포함되도록 한국어로 작성하세요.
5. "당신은 ~입니다"로 시작하는 형태가 좋습니다.

작성된 컨텍스트만 응답해주세요.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    const context = response.choices[0].message.content?.trim() || '';

    return NextResponse.json({ context });
  } catch (error: any) {
    console.error('Failed to generate persona context:', error);
    return NextResponse.json({ error: 'Failed to generate context' }, { status: 500 });
  }
}
