import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db';
import { classifyMemory, findRelatedMemories, generateSuggestions, summarizeAttachments } from '@/lib/ai';
import { detectRepetition, updateCluster } from '@/lib/clustering';
import { saveFile } from '@/lib/fileUpload';

// POST: 새 기억 생성
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const content = formData.get('content') as string;
    const files = formData.getAll('files') as File[];

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

    // 파일 내용 분석 (이미지 Vision API 사용)
    let fileContext = '';
    if (attachments.length > 0) {
      console.log(`\n🔍 [API] 파일 내용 분석 시작 (${attachments.length}개)`);
      fileContext = await summarizeAttachments(attachments);
      console.log(`🔍 [API] 파일 내용 분석 완료`);
      console.log(`📝 [API] 분석 결과 길이: ${fileContext.length} 문자`);
      console.log(`📝 [API] 분석 결과 미리보기:\n${fileContext.substring(0, 200)}...\n`);
    }

    // 기존 기억 조회
    const existingMemories = memoryDb.getAll();

    // AI 분류 (파일 내용 포함)
    const classification = await classifyMemory(content, existingMemories, fileContext);

    // 관련 기억 찾기
    const relatedIds = await findRelatedMemories(content, existingMemories);

    // 기억 생성
    const memory = memoryDb.create(content, {
      topic: classification.topic,
      nature: classification.nature,
      timeContext: classification.timeContext,
      clusterTag: classification.suggestedCluster,
      relatedMemoryIds: relatedIds,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // 반복 감지 및 카운트 업데이트
    const repeatCount = detectRepetition(memory, existingMemories);
    if (repeatCount > 1) {
      memoryDb.update(memory.id, { repeatCount });
    }

    // 클러스터 업데이트
    if (memory.clusterTag) {
      const clusterMemories = memoryDb.getByCluster(memory.clusterTag);
      updateCluster(memory.clusterTag, clusterMemories);
    }

    // 조건부 제안 생성 (반복 3회 이상)
    let suggestions;
    if (repeatCount >= 3 && memory.clusterTag) {
      const clusterMemories = memoryDb.getByCluster(memory.clusterTag);
      suggestions = await generateSuggestions(clusterMemories);
    }

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
    const { searchParams } = new URL(req.url);
    const cluster = searchParams.get('cluster');
    const topic = searchParams.get('topic');

    let memories;
    if (cluster) {
      memories = memoryDb.getByCluster(cluster);
    } else if (topic) {
      memories = memoryDb.getByTopic(topic);
    } else {
      memories = memoryDb.getAll();
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다' },
        { status: 400 }
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
