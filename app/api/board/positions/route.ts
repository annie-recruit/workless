import { NextRequest, NextResponse } from 'next/server';
import { boardPositionDb } from '@/lib/db';
import { getUserId } from '@/lib/auth';

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
    const groupId = searchParams.get('groupId') || 'all';
    const positions = boardPositionDb.getByGroup(userId, groupId);
    return NextResponse.json({ positions });
  } catch (error) {
    console.error('Board positions GET error:', error);
    return NextResponse.json({ error: '보드 위치 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const groupId = body.groupId || 'all';
    const positions = Array.isArray(body.positions) ? body.positions : [];

    if (positions.length === 0) {
      return NextResponse.json({ ok: true });
    }

    boardPositionDb.upsertMany(userId, groupId, positions);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Board positions POST error:', error);
    return NextResponse.json({ error: '보드 위치 저장 실패' }, { status: 500 });
  }
}
