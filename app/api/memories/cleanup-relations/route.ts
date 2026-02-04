import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db';
import { getUserId } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memoryId, invalidRelatedId } = await req.json();

    if (!memoryId || !invalidRelatedId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 해당 메모리의 relatedMemoryIds에서 유효하지 않은 ID 제거
    const memory = memoryDb.getById(memoryId, userId);
    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const relatedIds = memory.relatedMemoryIds || [];
    const cleaned = relatedIds.filter((id: string) => id !== invalidRelatedId);

    memoryDb.update(memoryId, {
      relatedMemoryIds: cleaned,
    });

    console.log(`✅ 유효하지 않은 연결 제거: ${memoryId} -> ${invalidRelatedId}`);

    return NextResponse.json({ success: true, cleaned: cleaned.length });
  } catch (error) {
    console.error('Cleanup relations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
