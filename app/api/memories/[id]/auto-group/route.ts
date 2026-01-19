import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, groupDb } from '@/lib/db';
import OpenAI from 'openai';
import { nanoid } from 'nanoid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
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

    // 모든 기억 가져오기
    const allMemories = memoryDb.getAll();
    
    // AI에게 관련 기억 찾기
    const prompt = `
다음 기록과 관련있는 기록들을 찾아서 그룹으로 묶어주세요.

[대상 기록]
"${memory.content}"
주제: ${memory.topic || '없음'}
성격: ${memory.nature || '없음'}
클러스터: ${memory.clusterTag || '없음'}

[전체 기록들]
${allMemories.filter(m => m.id !== id).slice(0, 30).map((m, idx) => 
  `${idx}. "${m.content.substring(0, 100)}..." (주제: ${m.topic}, 클러스터: ${m.clusterTag})`
).join('\n')}

다음을 분석해주세요:
1. 대상 기록과 비슷한 주제/내용의 기록들의 번호 (최소 1개, 최대 5개)
2. 이 그룹의 적절한 이름 (짧고 명확하게, 2-4단어)
3. 왜 이 기록들을 묶었는지 간단한 설명 (1문장)

JSON 형식:
{
  "relatedIndices": [0, 3, 7],
  "groupName": "그룹 이름",
  "reason": "이 기록들은 모두 ~에 관한 내용입니다"
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // 인덱스를 실제 메모리 ID로 변환
    const relatedMemories = result.relatedIndices
      .map((idx: number) => allMemories.filter(m => m.id !== id)[idx])
      .filter((m: any) => m !== undefined);

    const groupMemoryIds = [id, ...relatedMemories.map((m: any) => m.id)];

    // 그룹 생성
    const colors = ['blue', 'purple', 'green', 'orange', 'pink', 'red', 'yellow'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const group = groupDb.create(
      result.groupName || '새 그룹',
      groupMemoryIds,
      true, // isAIGenerated
      randomColor
    );

    return NextResponse.json({
      group,
      relatedMemories: relatedMemories.map((m: any) => ({
        id: m.id,
        content: m.content.substring(0, 100),
      })),
      reason: result.reason || '관련된 기록들을 찾았습니다',
    });
  } catch (error) {
    console.error('Failed to auto-group:', error);
    return NextResponse.json(
      { error: '자동 묶기 실패' },
      { status: 500 }
    );
  }
}
