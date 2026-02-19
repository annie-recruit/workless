import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, groupDb } from '@/lib/db';
import { getUserId } from '@/lib/auth';
import OpenAI from 'openai';
import { nanoid } from 'nanoid';
import { stripHtml } from '@/lib/text';
import { Memory } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
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
    
    // POST 바디에서 데이터 가져오기 (로컬 우선 대응)
    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch (e) {
      // ignore
    }

    let memory = memoryDb.getById(id, userId);

    if (!memory && bodyData.content) {
      console.log('ℹ️ DB에 기억이 없음 - 클라이언트 제공 데이터 사용 (로컬 전용)');
      memory = {
        id,
        userId,
        content: bodyData.content,
        title: bodyData.title,
        createdAt: bodyData.createdAt || Date.now(),
        repeatCount: 0
      };
    }

    if (!memory) {
      return NextResponse.json(
        { error: '기억을 찾을 수 없습니다. 아직 동기화되지 않았을 수 있습니다.' },
        { status: 404 }
      );
    }

    // 모든 기억 가져오기 (이미 그룹에 속한 것 제외)
    const allMemories = memoryDb.getAll(userId);
    const existingGroups = groupDb.getAll(userId);
    const groupedMemoryIds = new Set(
      existingGroups.flatMap(g => g.memoryIds)
    );
    
    console.log('📊 AI 그룹 묶기 상태:');
    console.log(`  - 전체 기억: ${allMemories.length}개`);
    console.log(`  - 기존 그룹: ${existingGroups.length}개`);
    console.log(`  - 이미 그룹에 속한 기억: ${groupedMemoryIds.size}개`);
    
    // 그룹에 속하지 않은 메모리들만 후보로 (최대 100개로 증가)
    const candidateMemories = allMemories
      .filter(m => m.id !== id && !groupedMemoryIds.has(m.id))
      .slice(0, 100);
    
    console.log(`  - 후보 기억 (그룹 미포함): ${candidateMemories.length}개`);
    
    if (candidateMemories.length === 0) {
      console.log('⚠️ 묶을 수 있는 관련 기록이 없습니다');
      console.log('💡 힌트: 모든 기록이 이미 그룹에 속해있거나, 현재 기록만 존재합니다.');
      
      // 이미 그룹에 속한 기록이 있는지 확인
      if (groupedMemoryIds.size > 0) {
        return NextResponse.json({
          error: '이미 그룹화된 기록이 있습니다. 그룹 관리 메뉴에서 확인하세요.',
        }, { status: 400 });
      }
      
      return NextResponse.json({
        error: '묶을 수 있는 다른 기록이 없습니다. 기록을 더 추가해주세요.',
      }, { status: 400 });
    }

    // 1단계: 각 후보 메모리와의 유사도 계산
    const targetContent = stripHtml(memory.content);
    const similarityScores: Array<{ index: number; memory: Memory; score: number; reason: string }> = [];
    
    for (let i = 0; i < candidateMemories.length; i++) {
      const candidate = candidateMemories[i];
      const candidateContent = stripHtml(candidate.content);
      
      const similarityPrompt = `
다음 두 기록이 얼마나 관련이 있는지 0-100 점수로 평가해주세요.

[기준 기록]
"${targetContent.substring(0, 500)}"

[비교 기록]
"${candidateContent.substring(0, 500)}"

평가 기준:
- 80-100점: 매우 높은 유사성 (같은 주제, 같은 맥락, 직접적인 연관)
- 60-79점: 높은 유사성 (비슷한 주제, 관련된 맥락)
- 50-59점: 중간 유사성 (약간 관련된 주제, 간접적 연관)
- 0-49점: 낮은 유사성 (거의 관련 없음)

점수가 50점 이상이면 묶을 수 있습니다. 너무 엄격하지 말고, 관련성이 있다고 판단되면 점수를 주세요.

JSON 형식:
{
  "score": 85,
  "reason": "두 기록 모두 ~에 관한 내용으로, ~라는 공통점이 있습니다"
}
`;

      try {
        const similarityResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: similarityPrompt }],
          temperature: 0.3, // 더 일관된 평가를 위해 낮춤
          response_format: { type: 'json_object' },
          max_tokens: 200,
        });

        const content = similarityResponse.choices[0]?.message?.content;
        if (!content) {
          console.error(`유사도 응답이 비어있음 (인덱스 ${i})`);
          continue;
        }

        let similarityResult;
        try {
          similarityResult = JSON.parse(content);
        } catch (parseError) {
          console.error(`JSON 파싱 실패 (인덱스 ${i}):`, content, parseError);
          continue;
        }

        const score = Number(similarityResult.score) || 0;
        
        // 유사도 기준을 50점으로 낮춤 (더 많은 후보를 찾기 위해)
        if (score >= 50) {
          similarityScores.push({
            index: i,
            memory: candidate,
            score: score,
            reason: similarityResult.reason || '관련된 기록입니다',
          });
        }
      } catch (error: any) {
        console.error(`유사도 계산 실패 (인덱스 ${i}):`, error?.message || error);
        // 에러가 나도 계속 진행
      }
    }

    // 유사도 점수로 정렬 (높은 순)
    similarityScores.sort((a, b) => b.score - a.score);
    
    // 상위 5개만 선택 (최소 60점 이상)
    const topRelated = similarityScores.slice(0, 5);
    
    if (topRelated.length === 0) {
      console.log('⚠️ 유사도가 충분히 높은 관련 기록을 찾지 못했습니다');
      console.log(`  - 전체 후보: ${candidateMemories.length}개`);
      console.log(`  - 유사도 50점 이상: ${similarityScores.length}개`);
      return NextResponse.json({
        error: '유사도가 충분히 높은 관련 기록을 찾지 못했습니다',
      }, { status: 400 });
    }

    // 2단계: 선택된 기록들을 그룹으로 묶기
    const groupPrompt = `
다음 기록들을 하나의 그룹으로 묶을 수 있는지 분석해주세요.

[기준 기록]
"${targetContent.substring(0, 500)}"

[관련 기록들]
${topRelated.map((item, idx) => {
  const plain = stripHtml(item.memory.content);
  return `${idx}. "${plain.substring(0, 200)}..." (유사도: ${item.score}점, 이유: ${item.reason})`;
}).join('\n\n')}

이 기록들이 정말로 하나의 그룹으로 묶일 만큼 유사한지 판단해주세요.

요구사항:
1. 모든 기록이 공통된 주제나 맥락을 가져야 함
2. 단순히 비슷한 단어만 있는 것이 아니라, 실제로 관련된 내용이어야 함
3. 그룹 이름은 2-4단어로 짧고 명확하게
4. 묶는 이유를 구체적으로 설명
5. 유사도가 50점 이상인 기록들은 가능한 한 많이 포함하세요 (최소 2개 이상)

JSON 형식:
{
  "shouldGroup": true,
  "groupName": "그룹 이름",
  "reason": "이 기록들은 모두 ~에 관한 내용으로, ~라는 공통점이 있습니다",
  "selectedIndices": [0, 1, 2]
}
`;

    let groupResponse;
    try {
      groupResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: groupPrompt }],
        temperature: 0.5,
        response_format: { type: 'json_object' },
        max_tokens: 300,
      });
    } catch (error: any) {
      console.error('그룹 분석 API 호출 실패:', error?.message || error);
      return NextResponse.json({
        error: 'AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      }, { status: 500 });
    }

    const content = groupResponse.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({
        error: 'AI 응답을 받지 못했습니다. 다시 시도해주세요.',
      }, { status: 500 });
    }

    let groupResult;
    try {
      groupResult = JSON.parse(content);
    } catch (parseError) {
      console.error('그룹 분석 JSON 파싱 실패:', content, parseError);
      return NextResponse.json({
        error: 'AI 응답을 처리하는 중 오류가 발생했습니다.',
      }, { status: 500 });
    }
    
    if (!groupResult.shouldGroup) {
      console.log('⚠️ AI가 묶기를 거부했습니다:', groupResult.reason);
      return NextResponse.json({
        error: '이 기록들을 묶기에는 유사도가 충분하지 않습니다',
      }, { status: 400 });
    }

    // 선택된 인덱스를 실제 메모리로 변환
    const selectedIndices = groupResult.selectedIndices || [];
    const relatedMemories = selectedIndices
      .map((idx: number) => topRelated[idx]?.memory)
      .filter((m: Memory | undefined): m is Memory => m !== undefined);

    const groupMemoryIds = [id, ...relatedMemories.map((m: any) => m.id)];

    // 그룹 생성
    const colors = ['green', 'pink', 'purple'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const group = groupDb.create(
      userId,
      groupResult.groupName || '새 그룹',
      groupMemoryIds,
      true, // isAIGenerated
      randomColor
    );

    return NextResponse.json({
      group,
      relatedMemories: relatedMemories.map((m: any) => {
        const scoreInfo = topRelated.find(item => item.memory.id === m.id);
        return {
          id: m.id,
          content: stripHtml(m.content).substring(0, 100),
          similarityScore: scoreInfo?.score,
          similarityReason: scoreInfo?.reason,
        };
      }),
      reason: groupResult.reason || '유사도가 높은 관련 기록들을 찾았습니다',
      averageSimilarity: topRelated.reduce((sum, item) => sum + item.score, 0) / topRelated.length,
    });
  } catch (error: any) {
    console.error('Failed to auto-group:', error);
    const errorMessage = error?.message || '알 수 없는 오류';
    
    // OpenAI API 에러인 경우
    if (error?.status === 401 || error?.status === 429) {
      return NextResponse.json(
        { error: 'AI 서비스에 접근할 수 없습니다. API 키를 확인해주세요.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: `자동 묶기 실패: ${errorMessage}` },
      { status: 500 }
    );
  }
}
