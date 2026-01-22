import { NextRequest, NextResponse } from 'next/server';
import { groupDb, memoryDb } from '@/lib/db';
import { getUserId } from '@/lib/auth';
import OpenAI from 'openai';
import { stripHtml } from '@/lib/text';

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
    const group = groupDb.getById(id, userId);

    if (!group) {
      return NextResponse.json(
        { error: '그룹을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 그룹에 속한 메모리들 가져오기 (null이거나 content가 없는 메모리는 제외)
    const groupMemories = group.memoryIds
      .map(memoryId => {
        const memory = memoryDb.getById(memoryId, userId);
        return memory;
      })
      .filter((memory): memory is NonNullable<typeof memory> => {
        // null, undefined, 또는 content가 없는 메모리는 제외
        if (memory === null || memory === undefined) {
          return false;
        }
        if (memory.content === null || memory.content === undefined) {
          return false;
        }
        return true;
      });

    if (groupMemories.length === 0) {
      return NextResponse.json({
        description: '이 그룹에는 아직 기록이 없습니다.',
      });
    }

    // 그룹 설명 생성
    const memoriesText = groupMemories
      .map((m, idx) => {
        // content가 null이거나 undefined인 경우 안전하게 처리
        const content = m.content || '';
        const plain = stripHtml(content);
        return `${idx + 1}. ${m.title ? `[${m.title}] ` : ''}${plain.substring(0, 200)}${plain.length > 200 ? '...' : ''}`;
      })
      .join('\n\n');

    const prompt = `
다음 기록들이 하나의 그룹으로 묶여 있습니다.

[그룹 이름]
${group.name}

[그룹에 속한 기록들] (${groupMemories.length}개)
${memoriesText}

이 그룹의 기록들을 분석하여 다음을 작성해주세요:
1. 이 그룹의 공통 주제나 맥락
2. 기록들 간의 연관성
3. 이 그룹이 나타내는 패턴이나 인사이트

간결하고 명확하게 2-3문장으로 정리해주세요.

JSON 형식:
{
  "description": "이 그룹에 대한 설명..."
}
`;

    let response;
    try {
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
        max_tokens: 300,
      });
    } catch (apiError: any) {
      console.error('OpenAI API 호출 실패:', apiError);
      const errorMessage = apiError?.message || '알 수 없는 오류';
      if (apiError?.status === 401 || apiError?.status === 429) {
        return NextResponse.json({
          description: 'AI 서비스에 접근할 수 없습니다. API 키를 확인해주세요.',
        });
      }
      return NextResponse.json({
        description: `AI 서비스 오류: ${errorMessage}`,
      });
    }

    // 응답 구조 검증 및 안전한 접근
    try {
      if (!response || !response.choices || response.choices.length === 0) {
        console.error('AI 응답이 비어있음:', response);
        return NextResponse.json({
          description: 'AI 응답을 받지 못했습니다. 다시 시도해주세요.',
        });
      }

      const choice = response.choices[0];
      if (!choice) {
        console.error('AI 응답 choices[0]이 없음:', response);
        return NextResponse.json({
          description: 'AI 응답 형식이 올바르지 않습니다.',
        });
      }

      // message를 안전하게 가져오기
      if (!choice.message) {
        console.error('AI 응답 message가 없음:', { 
          choice, 
          choiceKeys: Object.keys(choice),
          response 
        });
        return NextResponse.json({
          description: 'AI 응답 형식이 올바르지 않습니다.',
        });
      }

      const message = choice.message;

      // content 안전하게 접근
      if (message.content === null || message.content === undefined) {
        console.error('AI 응답 content가 null/undefined:', {
          choice,
          message,
          messageKeys: Object.keys(message),
          response,
        });
        return NextResponse.json({
          description: 'AI 응답을 받지 못했습니다. 다시 시도해주세요.',
        });
      }

      const content = message.content;
      if (typeof content !== 'string' || content.trim() === '') {
        console.error('AI 응답 content가 유효하지 않음:', {
          content,
          contentType: typeof content,
          choice,
          message,
        });
        return NextResponse.json({
          description: 'AI 응답을 받지 못했습니다. 다시 시도해주세요.',
        });
      }

      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        console.error('JSON 파싱 실패:', content, parseError);
        return NextResponse.json({
          description: 'AI 응답을 처리하는 중 오류가 발생했습니다.',
        });
      }
      
      return NextResponse.json({
        description: result.description || '이 그룹에 대한 설명을 생성할 수 없습니다.',
      });
    } catch (parseError: any) {
      console.error('응답 파싱 중 예상치 못한 오류:', parseError);
      console.error('응답 구조:', JSON.stringify(response, null, 2));
      return NextResponse.json({
        description: `그룹 설명 생성 중 오류가 발생했습니다: ${parseError?.message || '알 수 없는 오류'}`,
      });
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON 파싱 실패:', content, parseError);
      return NextResponse.json({
        description: 'AI 응답을 처리하는 중 오류가 발생했습니다.',
      });
    }
    
    return NextResponse.json({
      description: result.description || '이 그룹에 대한 설명을 생성할 수 없습니다.',
    });
  } catch (error: any) {
    console.error('Failed to generate group description:', error);
    const errorMessage = error?.message || '알 수 없는 오류';
    
    // OpenAI API 에러인 경우
    if (error?.status === 401 || error?.status === 429) {
      return NextResponse.json({
        description: 'AI 서비스에 접근할 수 없습니다. API 키를 확인해주세요.',
      });
    }
    
    // 모든 에러는 200으로 반환하여 프론트엔드에서 메시지 표시
    return NextResponse.json({
      description: `그룹 설명 생성 중 오류가 발생했습니다: ${errorMessage}`,
    });
  }
}
