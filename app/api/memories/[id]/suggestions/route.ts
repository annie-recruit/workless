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
  return handleSuggestions(req, params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleSuggestions(req, params);
}

async function handleSuggestions(
  req: NextRequest,
  params: Promise<{ id: string }>
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
    
    // POST 요청인 경우 바디에서 데이터를 가져올 수 있음
    let bodyData: any = {};
    if (req.method === 'POST') {
      try {
        bodyData = await req.json();
      } catch (e) {
        // ignore
      }
    }
    
    console.log('💡 제안 API - 받은 personaId:', personaId, 'userId:', userId.substring(0, 5) + '...', 'method:', req.method);
    
    // 페르소나 컨텍스트 조회
    let personaContext: string | undefined;
    let personaName: string | undefined;
    if (personaId) {
      const persona = personaDb.getById(personaId, userId);
      console.log('💡 페르소나 조회 결과:', persona ? persona.name : '없음');
      if (persona) {
        personaName = persona.name;
        // context가 있으면 사용, 없으면 description 사용
        personaContext = persona.context || persona.description;
        console.log('🎭 페르소나 적용:', personaName, '컨텍스트:', personaContext?.substring(0, 50) + '...');
      } else {
        console.log('⚠️ 페르소나를 찾을 수 없음:', personaId, 'userId:', userId);
      }
    } else {
      console.log('ℹ️ 페르소나 미선택 - 기본 모드로 제안');
    }

    // 1. DB에서 먼저 조회
    let memory = memoryDb.getById(id, userId);

    // 2. DB에 없으면 클라이언트가 보낸 데이터 사용 (로컬 우선 대응)
    if (!memory && bodyData.content) {
      console.log('ℹ️ DB에 기억이 없음 - 클라이언트 제공 데이터 사용 (로컬 전용)');
      memory = {
        id,
        userId,
        content: bodyData.content,
        title: bodyData.title,
        attachments: bodyData.attachments,
        createdAt: bodyData.createdAt || Date.now(),
        repeatCount: 0,
        topic: bodyData.topic,
        nature: bodyData.nature,
        clusterTag: bodyData.clusterTag
      };
    }

    if (!memory) {
      return NextResponse.json(
        { error: '기억을 찾을 수 없습니다. 아직 동기화되지 않았을 수 있습니다.' },
        { status: 404 }
      );
    }

    // 첨부파일이 있다면 내용 분석 (URL 포함)
    let fullContext = memory.content;
    let hasAttachments = false;
    if (memory.attachments && memory.attachments.length > 0) {
      hasAttachments = true;
      const fileContext = await summarizeAttachments(memory.attachments, memory.content);
      if (fileContext) {
        fullContext += `\n\n[첨부된 파일 내용]\n${fileContext}`;
      }
    } else if (memory.content) {
      // 첨부파일이 없어도 내용에서 URL 추출
      const urlContext = await summarizeAttachments([], memory.content);
      if (urlContext) {
        fullContext += `\n\n[링크 내용]\n${urlContext}`;
      }
    }
    const attachmentNames = memory.attachments?.map(att => att.filename).join(', ') || '없음';

    // AI에게 제안 요청
    const prompt = `
${personaContext ? `🎯 페르소나 관점: "${personaName || '전문가'}" (${personaContext})\n이 페르소나의 전문 분야와 관점을 반영하여 제안해주세요.\n\n` : ''}당신은 개인의 근처에서 인생의 작은 결정부터 최대 결정까지 면밀히 검토하고 조언해주는 코치이자 비서입니다. 사용자의 기록을 **정확히 이해하고** 맥락에 맞는 실행 가능한 제안을 해주세요.

⚠️ 중요: 기록의 내용과 주제를 정확히 파악하고, **그 맥락에 맞는** 제안을 해야 합니다.${personaContext ? `\n\n🎯 페르소나 관점: "${personaContext}" 전문가로서 이 기록을 분석하고, 이 분야의 관점에서 가장 유용한 제안을 해주세요.` : ''}
${hasAttachments ? '\n🚨 **첨부파일 최우선 분석**: 이 기록에는 파일이 첨부되어 있습니다. 반드시 [첨부된 파일 내용] 섹션의 내용을 꼼꼼히 읽고, 파일에 담긴 구체적인 정보(프로젝트 내용, 작업물, 데이터 등)를 기반으로 제안해주세요. 파일 내용을 무시하고 일반적인 조언을 하지 마세요.' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[기록 내용]
"${fullContext}"

📌 첨부 파일:
- 파일명: ${attachmentNames}${hasAttachments ? ' ⚠️ 파일 내용이 [기록 내용]에 포함되어 있습니다. 반드시 확인하세요!' : ''}

📌 분류 정보:
- 주제: ${memory.topic || '미분류'}
- 성격: ${memory.nature || '미분류'}
- 그룹: ${memory.clusterTag || '없음'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

위 기록의 **실제 내용과 맥락**을 바탕으로 다음을 제안해주세요:${hasAttachments ? '\n⚠️ 특히 [첨부된 파일 내용]에 담긴 구체적인 정보를 최우선으로 반영하세요!' : ''}

1. **다음 단계** (Next Steps):
   - ${hasAttachments ? '첨부파일에 담긴 구체적인 내용(프로젝트, 작업물, 데이터 등)을 분석하여' : '이 기록에서 언급된'} **구체적인 상황**을 고려한 행동 2-3개
   - 일반적인 조언이 아닌, **이 기록${hasAttachments ? '과 파일' : ''}에 맞는** 실행 가능한 단계
   - ${hasAttachments ? '파일 내용에서 드러난 구체적인 정보(기술 스택, 디자인 요소, 작성 목적 등)를 반영' : '파일명/내용에 드러난 목적(예: 과제/소설/상상/기획/연구 등)을 스스로 추론해 반영'}
   - 각 항목은 **한 줄**(짧은 문장)로만 작성

2. **관련 자료** (Resources):
   - ${hasAttachments ? '파일 내용과 직접 관련된' : '이 기록의 **주제와 직접 관련된**'} 자료/도구 2-3개
   - 예: ${hasAttachments ? '파일이 React 프로젝트라면 → React 공식 문서, 관련 라이브러리 등' : '기록이 "React 공부"라면 → React 공식 문서, 튜토리얼 등'}
   - ${hasAttachments ? '파일이 디자인 작업물이라면 → 디자인 시스템, 참고 사이트 등' : '예: 기록이 "디자인 작업"이라면 → Figma, 디자인 참고 사이트 등'}
   - 가능하면 **공식 URL**을 포함해 주세요 (없으면 비워도 됨)
   - 설명은 **한 줄**로 짧게

3. **실행 계획** (Action Plan):
   - **${hasAttachments ? '파일 내용을 바탕으로 이 프로젝트/작업의 목표를 달성하기 위한' : '이 기록의 목표를 달성하기 위한'}** 단계별 계획 3-4단계
   - 각 단계는 ${hasAttachments ? '파일에 담긴 구체적인 정보' : '이 기록의 맥락'}에 맞게 구체적으로
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

⚠️ 다시 한번 강조: ${hasAttachments ? '첨부파일의 **구체적인 내용**(프로젝트 세부사항, 작업물 특성, 기술 요소 등)을 정확히 반영하고' : '기록의 **실제 내용**을 정확히 반영하고'}, 일반적인 생산성 팁이나 커리어 조언이 아닌 **이 ${hasAttachments ? '파일과 ' : ''}기록에 특화된** 제안을 해주세요.${hasAttachments ? ' 파일 내용이 없다면 "커리어", "프로젝트" 같은 키워드에 반응하지 말고, 실제 파일에 담긴 정보를 기반으로 제안하세요.' : ''}
`;

    const systemMessage = personaContext
      ? `당신은 "${personaName || '전문가'}" 페르소나의 관점에서 조언하는 코치이자 비서입니다.

페르소나 정보:
- 이름: ${personaName || '전문가'}
- 관점: ${personaContext}

이 페르소나의 전문 분야의 지식과 경험을 바탕으로 사용자의 기록을 정확히 이해하고 맥락에 맞는 구체적인 제안을 하세요. ${hasAttachments ? '특히 첨부된 파일의 구체적인 내용을 최우선으로 분석하고, ' : ''}일반적인 조언보다는 기록의 실제 내용${hasAttachments ? '과 파일에 담긴 정보' : ''}에 기반한 실행 가능한 제안에 집중하세요.`
      : `당신은 개인의 근처에서 인생의 작은 결정부터 최대 결정까지 면밀히 검토하고 조언해주는 코치이자 비서입니다. ${hasAttachments ? '사용자가 첨부한 파일의 내용을 정확히 분석하여 파일에 담긴 구체적인 정보를 기반으로 제안하세요. ' : ''}사용자의 기록을 정확히 이해하고 맥락에 맞는 구체적인 제안을 하며, 일반적인 조언보다는 기록의 실제 내용${hasAttachments ? '과 파일 내용' : ''}에 기반한 실행 가능한 제안에 집중하세요.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage
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
        error: '제안 생성 실패',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
