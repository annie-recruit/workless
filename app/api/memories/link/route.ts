import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, memoryLinkDb, projectDb } from '@/lib/db';
import { getUserId } from '@/lib/auth';

// POST: 두 기록 간 링크 추가 (양방향)
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const { memoryId1, memoryId2, note, isAIGenerated, linkType } = await req.json();

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

    // 두 기록 가져오기 (메모리 또는 프로젝트)
    let memory1 = memoryDb.getById(memoryId1, userId) as any;
    let memory2 = memoryDb.getById(memoryId2, userId) as any;

    const isProject1 = !memory1;
    if (isProject1) {
      memory1 = projectDb.getById(memoryId1, userId);
    }

    const isProject2 = !memory2;
    if (isProject2) {
      memory2 = projectDb.getById(memoryId2, userId);
    }

    if (!memory1 || !memory2) {
      return NextResponse.json(
        { error: '기록 또는 프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 양방향 링크 추가
    if (isProject1) {
      const sourceIds = memory1.sourceMemoryIds || [];
      if (!sourceIds.includes(memoryId2)) {
        projectDb.update(memoryId1, userId, {
          sourceMemoryIds: [...sourceIds, memoryId2]
        });
      }
    } else {
      const links = memory1.relatedMemoryIds || [];
      if (!links.includes(memoryId2)) {
        memoryDb.update(memoryId1, {
          relatedMemoryIds: [...links, memoryId2]
        });
      }
    }

    if (isProject2) {
      const sourceIds = memory2.sourceMemoryIds || [];
      if (!sourceIds.includes(memoryId1)) {
        projectDb.update(memoryId2, userId, {
          sourceMemoryIds: [...sourceIds, memoryId1]
        });
      }
    } else {
      const links = memory2.relatedMemoryIds || [];
      if (!links.includes(memoryId1)) {
        memoryDb.update(memoryId2, {
          relatedMemoryIds: [...links, memoryId1]
        });
      }
    }

    // 링크 메모 저장 (쌍으로 1개)
    const validLinkType = ['depends-on', 'derives-from', 'related'].includes(linkType) ? linkType : 'related';
    if (typeof note === 'string') {
      memoryLinkDb.upsert(memoryId1, memoryId2, note.trim(), isAIGenerated === true, userId, validLinkType);
    } else {
      memoryLinkDb.upsert(memoryId1, memoryId2, undefined, isAIGenerated === true, userId, validLinkType);
    }

    return NextResponse.json({
      message: '링크 추가 완료',
      memory1: isProject1 ? projectDb.getById(memoryId1, userId) : memoryDb.getById(memoryId1, userId),
      memory2: isProject2 ? projectDb.getById(memoryId2, userId) : memoryDb.getById(memoryId2, userId)
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
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const memoryId1 = searchParams.get('memoryId1');
    const memoryId2 = searchParams.get('memoryId2');

    if (!memoryId1 || !memoryId2) {
      return NextResponse.json(
        { error: '두 기록 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 두 기록 가져오기 (메모리 또는 프로젝트)
    let memory1 = memoryDb.getById(memoryId1, userId) as any;
    let memory2 = memoryDb.getById(memoryId2, userId) as any;

    const isProject1 = !memory1;
    if (isProject1) {
      memory1 = projectDb.getById(memoryId1, userId);
    }

    const isProject2 = !memory2;
    if (isProject2) {
      memory2 = projectDb.getById(memoryId2, userId);
    }

    if (!memory1 || !memory2) {
      return NextResponse.json(
        { error: '기록 또는 프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 양방향 링크 제거
    if (isProject1) {
      const sourceIds = memory1.sourceMemoryIds || [];
      projectDb.update(memoryId1, userId, {
        sourceMemoryIds: sourceIds.filter((id: string) => id !== memoryId2)
      });
    } else {
      const links = memory1.relatedMemoryIds || [];
      memoryDb.update(memoryId1, {
        relatedMemoryIds: links.filter((id: string) => id !== memoryId2)
      });
    }

    if (isProject2) {
      const sourceIds = memory2.sourceMemoryIds || [];
      projectDb.update(memoryId2, userId, {
        sourceMemoryIds: sourceIds.filter((id: string) => id !== memoryId1)
      });
    } else {
      const links = memory2.relatedMemoryIds || [];
      memoryDb.update(memoryId2, {
        relatedMemoryIds: links.filter((id: string) => id !== memoryId1)
      });
    }

    // 링크 메모 삭제
    memoryLinkDb.delete(memoryId1, memoryId2);

    // 업데이트된 메모리/프로젝트 가져오기
    const updatedMemory1 = isProject1 ? projectDb.getById(memoryId1, userId) : memoryDb.getById(memoryId1, userId);
    const updatedMemory2 = isProject2 ? projectDb.getById(memoryId2, userId) : memoryDb.getById(memoryId2, userId);

    return NextResponse.json({
      message: '링크 삭제 완료',
      memory1: updatedMemory1,
      memory2: updatedMemory2
    });
  } catch (error) {
    console.error('Failed to unlink memories:', error);
    return NextResponse.json(
      { error: '링크 삭제 실패' },
      { status: 500 }
    );
  }
}
