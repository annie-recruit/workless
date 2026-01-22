import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db';
import { findRelatedMemories, summarizeAttachments } from '@/lib/ai';
import { saveFile } from '@/lib/fileUpload';
import { extractMentionIds, stripHtml } from '@/lib/text';
import { getUserId } from '@/lib/auth';

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

    const formData = await req.formData();
    const title = (formData.get('title') as string) || undefined;
    const content = formData.get('content') as string;
    const files = formData.getAll('files') as File[];
    const relatedMemoryIdsRaw = formData.get('relatedMemoryIds') as string | null;

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
      console.log(`📝 [API] 분석 결과 길이: ${fileContext.length} 문자`);
      console.log(`📝 [API] 분석 결과 미리보기:\n${fileContext.substring(0, 200)}...\n`);
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

    // 반복 감지 및 카운트 업데이트 제거 (자동 인덱싱 없음)
    // 클러스터 업데이트 제거 (자동 인덱싱 없음)
    // 조건부 제안 생성 제거 (자동 인덱싱 없음)
    const suggestions = null;

    return NextResponse.json({
      memory,
      suggestions,
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

