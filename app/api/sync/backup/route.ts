import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { 
  memoryDb, 
  groupDb, 
  goalDb, 
  boardBlocksDb, 
  boardPositionDb 
} from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data } = await req.json();
    if (!data || data.version !== 1) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // 데이터 백업 (벌크 업서트 사용)
    
    // 1. Memories
    if (data.memories && data.memories.length > 0) {
      memoryDb.upsertMany(userId, data.memories);
    }

    // 2. Groups
    if (data.groups && data.groups.length > 0) {
      groupDb.upsertMany(userId, data.groups);
    }

    // 3. Goals
    if (data.goals && data.goals.length > 0) {
      goalDb.upsertMany(userId, data.goals);
    }

    // 4. Board Blocks
    if (data.boardBlocks && data.boardBlocks.length > 0) {
      boardBlocksDb.upsertMany(userId, data.boardBlocks);
    }

    // 5. Board Positions
    if (data.boardPositions && data.boardPositions.length > 0) {
      // 그룹별로 묶어서 upsertMany 호출
      const positionsByGroup: Record<string, any[]> = {};
      for (const pos of data.boardPositions) {
        if (!positionsByGroup[pos.groupId]) {
          positionsByGroup[pos.groupId] = [];
        }
        positionsByGroup[pos.groupId].push(pos);
      }

      for (const [groupId, positions] of Object.entries(positionsByGroup)) {
        boardPositionDb.upsertMany(userId, groupId, positions);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
