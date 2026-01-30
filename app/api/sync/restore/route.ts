import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { 
  memoryDb, 
  groupDb, 
  goalDb, 
  boardBlocksDb, 
  boardPositionDb 
} from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 서버에서 해당 사용자의 모든 데이터 조회
    const memories = memoryDb.getAll(userId);
    const groups = groupDb.getAll(userId);
    const goals = goalDb.getAll(userId);
    const boardBlocks = boardBlocksDb.getAll(userId);
    
    // boardPositions는 그룹별로 저장되어 있어 모든 그룹에 대해 조회 필요
    const boardPositions: any[] = [];
    for (const group of groups) {
      const positions = boardPositionDb.getByGroup(userId, group.id);
      boardPositions.push(...positions);
    }

    const data = {
      version: 1,
      exportedAt: Date.now(),
      memories,
      groups,
      goals,
      boardBlocks,
      boardPositions
    };

    console.log(`[Sync] Restore requested for user ID ${userId.substring(0, 5)}... Returning ${memories.length} memories, ${groups.length} groups.`);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
