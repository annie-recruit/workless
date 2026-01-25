import { NextRequest, NextResponse } from 'next/server';
import { generateLayout } from '@/lib/ai';
import { getUserId } from '@/lib/auth';

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
    const { memories, blocks, connections, currentPositions, cardSize } = body;

    if (!memories || !Array.isArray(memories)) {
      return NextResponse.json({ error: 'Invalid memories data' }, { status: 400 });
    }

    // AI를 사용하여 최적의 레이아웃 생성
    const { layout, blockLayout } = await generateLayout({
      memories,
      blocks,
      connections,
      currentPositions,
      cardSize,
    });

    return NextResponse.json({ layout, blockLayout });
  } catch (error) {
    console.error('Failed to generate layout:', error);
    return NextResponse.json(
      { error: 'Failed to generate layout' },
      { status: 500 }
    );
  }
}
