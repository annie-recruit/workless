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

    // 1. 기억 먼저 생성 (AI 분석 전에 저장하여 사용자 경험 개선 및 실패 방지)
    const relatedFromClient: string[] = relatedMemoryIdsRaw 
      ? (typeof relatedMemoryIdsRaw === 'string' ? JSON.parse(relatedMemoryIdsRaw) : relatedMemoryIdsRaw)
      : [];

    const memory = memoryDb.create(content, userId, {
      title: title,
      derivedFromCardId: derivedFromCardId,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // 2. AI 분석 및 연관 기록 찾기 (별도 try-catch로 감싸서 실패해도 저장은 유지)
    let relatedIds: string[] = [];
    let connectionSuggestions: Array<{ id: string; content: string; reason: string }> = [];

    try {
      // @멘션 기반 연결 (동기적으로 즉시 처리 가능)
      const relatedFromContent = extractMentionIds(content);
      
      // AI 기반 유사 기록 찾기 (최근 50개로 제한하여 성능 및 비용 최적화)
      const candidateMemories = existingMemories
        .filter(m => m.id !== memory.id)
        .slice(0, 50); 

      let relatedFromAI: string[] = [];
      if (candidateMemories.length > 0) {
        relatedFromAI = await findRelatedMemories(stripHtml(content), candidateMemories);
      }

      relatedIds = Array.from(new Set([
        ...relatedFromClient,
        ...relatedFromContent,
        ...relatedFromAI,
      ])).filter(Boolean);

      // 연관 기록 업데이트
      if (relatedIds.length > 0) {
        memoryDb.update(memory.id, { relatedMemoryIds: relatedIds });
        
        // 양방향 링크 생성
        relatedIds.forEach(relatedId => {
          const relatedMemory = memoryDb.getById(relatedId, userId);
          if (relatedMemory) {
            const existingLinks = relatedMemory.relatedMemoryIds || [];
            if (!existingLinks.includes(memory.id)) {
              memoryDb.update(relatedId, {
                relatedMemoryIds: [...existingLinks, memory.id]
              });
            }
          }
        });
      }

      // AI 연결 제안 생성
      if (candidateMemories.length > 0 && relatedFromAI.length > 0) {
        // ... (기존 연결 제안 로직 생략 가능하거나 유지)
        // 여기서는 기존 로직 유지
        const relatedMemoriesForSuggestions = relatedFromAI
          .map(id => candidateMemories.find(m => m.id === id))
          .filter(Boolean) as typeof candidateMemories;

        if (relatedMemoriesForSuggestions.length > 0) {
          const openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          const suggestionPrompt = `
다음 새 기록과 관련 기록들이 함께 묶일 만한지 분석해주세요.

[새 기록]
"${stripHtml(content).substring(0, 300)}"

[관련 기록 후보들]
${relatedMemoriesForSuggestions.slice(0, 5).map((m, idx) => {
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
              const mem = relatedMemoriesForSuggestions[s.index];
              if (!mem) return null;
              return {
                id: mem.id,
                content: stripHtml(mem.content).substring(0, 100),
                reason: s.reason || '관련된 기록입니다',
              };
            })
            .filter(Boolean);
        }
      }
    } catch (aiError) {
      console.error('AI 분석 중 오류 발생 (무시하고 저장 진행):', aiError);
    }

    // 최종 업데이트된 메모리 정보 가져오기
    const finalMemory = memoryDb.getById(memory.id, userId) || memory;

    return NextResponse.json({
      memory: finalMemory,
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
