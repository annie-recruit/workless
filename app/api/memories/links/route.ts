import { NextRequest, NextResponse } from 'next/server';
import { memoryLinkDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const memoryIds = Array.isArray(body.memoryIds) ? body.memoryIds : [];

    if (memoryIds.length === 0) {
      return NextResponse.json({ links: [] });
    }

    const links = memoryLinkDb.getByMemoryIds(memoryIds);
    return NextResponse.json({ links });
  } catch (error) {
    console.error('Memory links fetch error:', error);
    return NextResponse.json({ error: '연결 메모 조회 실패' }, { status: 500 });
  }
}
