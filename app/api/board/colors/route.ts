import { NextRequest, NextResponse } from 'next/server';
import { boardCardColorDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId') || 'all';
    const colors = boardCardColorDb.getByGroup(groupId);
    return NextResponse.json({ colors });
  } catch (error) {
    console.error('Board colors GET error:', error);
    return NextResponse.json({ error: '카드 색상 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const groupId = body.groupId || 'all';
    const colors = Array.isArray(body.colors) ? body.colors : [];

    if (colors.length === 0) {
      return NextResponse.json({ ok: true });
    }

    boardCardColorDb.upsertMany(groupId, colors);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Board colors POST error:', error);
    return NextResponse.json({ error: '카드 색상 저장 실패' }, { status: 500 });
  }
}
