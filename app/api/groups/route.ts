import { NextResponse } from 'next/server';
import { groupDb } from '@/lib/db';
import { withAuth } from '@/lib/apiMiddleware';

// GET: 그룹 조회
export const GET = withAuth(async (req, userId) => {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  let groups;
  if (type === 'ai') {
    groups = groupDb.getAIGenerated(userId);
  } else if (type === 'user') {
    groups = groupDb.getUserCreated(userId);
  } else {
    groups = groupDb.getAll(userId);
  }

  return NextResponse.json({ groups });
});

// POST: 그룹 생성
export const POST = withAuth(async (req, userId) => {
  const body = await req.json();
  const { name, memoryIds, color, isAIGenerated = false } = body;

  if (!name || !memoryIds || !Array.isArray(memoryIds)) {
    return NextResponse.json(
      { error: '필수 정보가 누락되었습니다' },
      { status: 400 }
    );
  }

  const group = groupDb.create(userId, name, memoryIds, isAIGenerated, color);
  return NextResponse.json({ group });
});

// PUT: 그룹 수정
export const PUT = withAuth(async (req, userId) => {
  const body = await req.json();
  const { id, name, memoryIds, color } = body;

  if (!id) {
    return NextResponse.json(
      { error: 'ID가 필요합니다' },
      { status: 400 }
    );
  }

  const existing = groupDb.getById(id, userId);
  if (!existing) {
    return NextResponse.json(
      { error: '그룹을 찾을 수 없거나 권한이 없습니다' },
      { status: 404 }
    );
  }

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (memoryIds !== undefined) updates.memoryIds = memoryIds;
  if (color !== undefined) updates.color = color;

  groupDb.update(id, userId, updates);
  return NextResponse.json({ success: true });
});

// DELETE: 그룹 삭제
export const DELETE = withAuth(async (req, userId) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'ID가 필요합니다' },
      { status: 400 }
    );
  }

  const existing = groupDb.getById(id, userId);
  if (!existing) {
    return NextResponse.json(
      { error: '그룹을 찾을 수 없거나 권한이 없습니다' },
      { status: 404 }
    );
  }

  groupDb.delete(id);
  return NextResponse.json({ success: true });
});
