import { NextRequest, NextResponse } from 'next/server';
import { boardSettingsDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId') || 'all';
    const settings = boardSettingsDb.getByGroup(groupId);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Board settings GET error:', error);
    return NextResponse.json({ error: '보드 설정 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const groupId = body.groupId || 'all';
    const cardSize = body.cardSize;
    const cardColor = body.cardColor;

    boardSettingsDb.upsert(groupId, cardSize, cardColor);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Board settings POST error:', error);
    return NextResponse.json({ error: '보드 설정 저장 실패' }, { status: 500 });
  }
}
