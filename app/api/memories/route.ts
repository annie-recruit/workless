import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db';
import { findRelatedMemories, summarizeAttachments } from '@/lib/ai';
import { saveFile } from '@/lib/fileUpload';
import { extractMentionIds, stripHtml } from '@/lib/text';
import { getUserId } from '@/lib/auth';
import OpenAI from 'openai';

// POST: 새 기억 생성
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    let title, content, derivedFromCardId, files: File[] = [], relatedMemoryIdsRaw;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      title = body.title;
      content = body.content;
      derivedFromCardId = body.derivedFromCardId;
      relatedMemoryIdsRaw = body.relatedMemoryIds ? JSON.stringify(body.relatedMemoryIds) : null;
      // JSON 요청에서는 파일 처리를 생략하거나 이미 업로드된 파일 경로를 받을 수 있음
    } else {
      const formData = await req.formData();
      title = (formData.get('title') as string) || undefined;
      content = formData.get('content') as string;
      derivedFromCardId = (formData.get('derivedFromCardId') as string) || undefined;
      files = formData.getAll('files') as File[];
      relatedMemoryIdsRaw = formData.get('relatedMemoryIds') as string | null;
    }


    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: '내용을 입력해주세요' },
        { status: 400 }
      );
    }

    // 파일 업로드 처리
    console.log('📂 [API] 파일 업로드 처리 시작');
    const attachments = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📂 [API] 파일 ${i + 1}/${files.length}:`, file.name, '크기:', file.size);
      if (file && file.size > 0) {
        console.log(`📂 [API] 파일 저장 중...`);
        const attachment = await saveFile(file);
        console.log(`📂 [API] 파일 저장 완료:`, attachment.filepath);
        attachments.push(attachment);
      }
    }
    console.log('📂 [API] 총 저장된 파일:', attachments.length);

    // 파일 내용 분석 및 URL 요약 (이미지 Vision API 사용)
    let fileContext = '';
    if (attachments.length > 0 || content) {
      console.log(`\n🔍 [API] 파일 내용 분석 시작 (${attachments.length}개 파일, URL 포함)`);
      fileContext = await summarizeAttachments(attachments, content);
      console.log(`🔍 [API] 파일 내용 분석 완료`);
      // console.log(`📝 [API] 분석 결과 길이: ${fileContext.length} 문자`);
      // console.log(`📝 [API] 분석 결과 미리보기:\n${fileContext.substring(0, 200)}...\n`);
    }

    // 기존 기억 조회 (사용자별)
    const existingMemories = memoryDb.getAll(userId);

    // @멘션 기반 연결 + 기존 유사 기록 찾기
    let relatedFromClient: string[] = [];
    if (relatedMemoryIdsRaw) {
      try {
        relatedFromClient = JSON.parse(relatedMemoryIdsRaw) as string[];
      } catch {
        relatedFromClient = [];
      }
    }
    const relatedFromContent = extractMentionIds(content);
    const relatedFromAI = await findRelatedMemories(stripHtml(content), existingMemories);
    const relatedIds = Array.from(new Set([
      ...relatedFromClient,
      ...relatedFromContent,
      ...relatedFromAI,
    ])).filter(Boolean);

    // 기억 생성 (분류 정보 없이)
    const memory = memoryDb.create(content, userId, {
      // topic, nature, timeContext, clusterTag 제거 - 자동 분류 안 함
      title: title,
      derivedFromCardId: derivedFromCardId,
      relatedMemoryIds: relatedIds,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // 양방향 링크 생성 - 관련 기록들에도 새 기록 ID 추가 (같은 사용자의 기록만)
    relatedIds.forEach(relatedId => {
      const relatedMemory = memoryDb.getById(relatedId, userId);
      if (relatedMemory) {
        const existingLinks = relatedMemory.relatedMemoryIds || [];
        // 중복 방지
        if (!existingLinks.includes(memory.id)) {
          memoryDb.update(relatedId, {
            relatedMemoryIds: [...existingLinks, memory.id]
          });
        }
      }
    });

    // AI가 관련 기록 제안 (모든 기록 중에서)
    const candidateMemories = existingMemories
      .filter(m => m.id !== memory.id)
      .slice(0, 30); // 최대 30개만 검토

    let connectionSuggestions: Array<{ id: string; content: string; reason: string }> = [];

    if (candidateMemories.length > 0) {
      try {
        const relatedIds = await findRelatedMemories(stripHtml(content), candidateMemories);

        if (relatedIds.length > 0) {
          // 관련 기록들의 상세 정보 가져오기
          const relatedMemories = relatedIds
            .map(id => candidateMemories.find(m => m.id === id))
            .filter(Boolean) as typeof candidateMemories;

          // AI에게 묶을 수 있는지 확인
          const openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          const suggestionPrompt = `
다음 새 기록과 관련 기록들이 함께 묶일 만한지 분석해주세요.

[새 기록]
"${stripHtml(content).substring(0, 300)}"

[관련 기록 후보들]
${relatedMemories.slice(0, 5).map((m, idx) => {
            const plain = stripHtml(m.content);
            return `${idx}. "${plain.substring(0, 150)}..."`;
          }).join('\n\n')}

각 후보 기록이 새 기록과 함께 묶일 만큼 관련이 있는지 판단해주세요.
- 관련이 있으면: reason에 왜 관련있는지 설명
- 관련이 없으면: reason을 빈 문자열로

JSON 형식:
{
  "suggestions": [
    {"index": 0, "shouldLink": true, "reason": "두 기록 모두 ~에 관한 내용입니다"},
    {"index": 1, "shouldLink": false, "reason": ""}
  ]
}
`;

          const suggestionResponse = await openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: suggestionPrompt }],
            temperature: 0.5,
            response_format: { type: 'json_object' },
          });

          const suggestionResult = JSON.parse(suggestionResponse.choices[0].message.content || '{}');
          const suggestions = suggestionResult.suggestions || [];

          connectionSuggestions = suggestions
            .filter((s: any) => s.shouldLink === true)
            .map((s: any) => {
              const mem = relatedMemories[s.index];
              if (!mem) return null;
              return {
                id: mem.id,
                content: stripHtml(mem.content).substring(0, 100),
                reason: s.reason || '관련된 기록입니다',
              };
            })
            .filter(Boolean);
        }
      } catch (error) {
        console.error('Failed to generate connection suggestions:', error);
        // 에러가 나도 메모리는 저장됨
      }
    }

    return NextResponse.json({
      memory,
      connectionSuggestions: connectionSuggestions.length > 0 ? connectionSuggestions : undefined,
    });
  } catch (error) {
    console.error('Memory creation error:', error);
    return NextResponse.json(
      { error: '기억 저장 실패' },
      { status: 500 }
    );
  }
}

// GET: 기억 조회
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const cluster = searchParams.get('cluster');
    const topic = searchParams.get('topic');

    let memories;
    if (cluster) {
      memories = memoryDb.getByCluster(cluster, userId);
    } else if (topic) {
      memories = memoryDb.getByTopic(topic, userId);
    } else {
      memories = memoryDb.getAll(userId);
    }

    return NextResponse.json({ memories });
  } catch (error) {
    console.error('Memory retrieval error:', error);
    return NextResponse.json(
      { error: '기억 조회 실패' },
      { status: 500 }
    );
  }
}

// DELETE: 기억 삭제
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 사용자 소유 확인
    const memory = memoryDb.getById(id, userId);
    if (!memory) {
      return NextResponse.json(
        { error: '기억을 찾을 수 없거나 권한이 없습니다' },
        { status: 404 }
      );
    }

    memoryDb.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Memory deletion error:', error);
    return NextResponse.json(
      { error: '기억 삭제 실패' },
      { status: 500 }
    );
  }
}

// PUT: 기억 수정
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const { title, content } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: '내용이 필요합니다' },
        { status: 400 }
      );
    }

    // 사용자 소유 확인
    const existing = memoryDb.getById(id, userId);
    if (!existing) {
      return NextResponse.json(
        { error: '기억을 찾을 수 없거나 권한이 없습니다' },
        { status: 404 }
      );
    }

    const existingRelated = existing?.relatedMemoryIds || [];
    const mentionIds = extractMentionIds(content);
    const nextRelated = Array.from(new Set([...existingRelated, ...mentionIds])).filter(Boolean);

    const updates: any = { content, relatedMemoryIds: nextRelated };
    if (title !== undefined) {
      updates.title = title;
    }

    memoryDb.update(id, updates);
    const updatedMemory = memoryDb.getById(id, userId);

    // 새로 추가된 멘션은 양방향 링크 갱신 (같은 사용자의 기록만)
    const newlyAdded = mentionIds.filter((mentionId) => !existingRelated.includes(mentionId));
    newlyAdded.forEach(relatedId => {
      const relatedMemory = memoryDb.getById(relatedId, userId);
      if (relatedMemory) {
        const links = relatedMemory.relatedMemoryIds || [];
        if (!links.includes(id)) {
          memoryDb.update(relatedId, { relatedMemoryIds: [...links, id] });
        }
      }
    });

    return NextResponse.json({ memory: updatedMemory });
  } catch (error) {
    console.error('Memory update error:', error);
    return NextResponse.json(
      { error: '기억 수정 실패' },
      { status: 500 }
    );
  }
}
