import { NextRequest, NextResponse } from 'next/server';
import { groupDb } from '@/lib/db';

// GET: 그룹 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'ai' | 'user' | 'all'

    let groups;
    if (type === 'ai') {
      groups = groupDb.getAIGenerated();
    } else if (type === 'user') {
      groups = groupDb.getUserCreated();
    } else {
      groups = groupDb.getAll();
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Group retrieval error:', error);
    return NextResponse.json(
      { error: '그룹 조회 실패' },
      { status: 500 }
    );
  }
}

// POST: 그룹 생성
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, memoryIds, color, isAIGenerated = false } = body;

    if (!name || !memoryIds || !Array.isArray(memoryIds)) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      );
    }

    const group = groupDb.create(name, memoryIds, isAIGenerated, color);

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Group creation error:', error);
    return NextResponse.json(
      { error: '그룹 생성 실패' },
      { status: 500 }
    );
  }
}

// PUT: 그룹 수정
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, memoryIds, color } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (memoryIds !== undefined) updates.memoryIds = memoryIds;
    if (color !== undefined) updates.color = color;

    groupDb.update(id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Group update error:', error);
    return NextResponse.json(
      { error: '그룹 수정 실패' },
      { status: 500 }
    );
  }
}

// DELETE: 그룹 삭제
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

    groupDb.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Group deletion error:', error);
    return NextResponse.json(
      { error: '그룹 삭제 실패' },
      { status: 500 }
    );
  }
}
