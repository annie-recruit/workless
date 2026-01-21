import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, memoryLinkDb } from '@/lib/db';

// POST: 두 기록 간 링크 추가 (양방향)
export async function POST(req: NextRequest) {
  try {
    const { memoryId1, memoryId2, note } = await req.json();

    if (!memoryId1 || !memoryId2) {
      return NextResponse.json(
        { error: '두 기록 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (memoryId1 === memoryId2) {
      return NextResponse.json(
        { error: '같은 기록끼리 연결할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 두 기록 가져오기
    const memory1 = memoryDb.getById(memoryId1);
    const memory2 = memoryDb.getById(memoryId2);

    if (!memory1 || !memory2) {
      return NextResponse.json(
        { error: '기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 양방향 링크 추가
    const links1 = memory1.relatedMemoryIds || [];
    const links2 = memory2.relatedMemoryIds || [];

    // 중복 방지
    if (!links1.includes(memoryId2)) {
      memoryDb.update(memoryId1, {
        relatedMemoryIds: [...links1, memoryId2]
      });
    }

    if (!links2.includes(memoryId1)) {
      memoryDb.update(memoryId2, {
        relatedMemoryIds: [...links2, memoryId1]
      });
    }

    // 링크 메모 저장 (쌍으로 1개)
    if (typeof note === 'string') {
      memoryLinkDb.upsert(memoryId1, memoryId2, note.trim());
    } else {
      memoryLinkDb.upsert(memoryId1, memoryId2);
    }

    return NextResponse.json({ 
      message: '링크 추가 완료',
      memory1: memoryDb.getById(memoryId1),
      memory2: memoryDb.getById(memoryId2)
    });
  } catch (error) {
    console.error('Failed to link memories:', error);
    return NextResponse.json(
      { error: '링크 추가 실패' },
      { status: 500 }
    );
  }
}

// DELETE: 두 기록 간 링크 삭제 (양방향)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const memoryId1 = searchParams.get('memoryId1');
    const memoryId2 = searchParams.get('memoryId2');

    if (!memoryId1 || !memoryId2) {
      return NextResponse.json(
        { error: '두 기록 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 두 기록 가져오기
    const memory1 = memoryDb.getById(memoryId1);
    const memory2 = memoryDb.getById(memoryId2);

    if (!memory1 || !memory2) {
      return NextResponse.json(
        { error: '기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 양방향 링크 제거
    const links1 = memory1.relatedMemoryIds || [];
    const links2 = memory2.relatedMemoryIds || [];

    memoryDb.update(memoryId1, {
      relatedMemoryIds: links1.filter(id => id !== memoryId2)
    });

    memoryDb.update(memoryId2, {
      relatedMemoryIds: links2.filter(id => id !== memoryId1)
    });

    // 링크 메모 삭제
    memoryLinkDb.delete(memoryId1, memoryId2);

    return NextResponse.json({ 
      message: '링크 삭제 완료',
      memory1: memoryDb.getById(memoryId1),
      memory2: memoryDb.getById(memoryId2)
    });
  } catch (error) {
    console.error('Failed to unlink memories:', error);
    return NextResponse.json(
      { error: '링크 삭제 실패' },
      { status: 500 }
    );
  }
}
