import { NextRequest, NextResponse } from 'next/server';
import { boardBlocksDb } from '@/lib/db';
import { getUserId } from '@/lib/auth';
import { CanvasBlock } from '@/types';

// GET: 사용자의 모든 블록 조회
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const blocks = boardBlocksDb.getAll(userId);
    return NextResponse.json({ blocks });
  } catch (error) {
    console.error('Board blocks GET error:', error);
    return NextResponse.json(
      { error: '블록 조회 실패' },
      { status: 500 }
    );
  }
}

// POST: 새 블록 생성
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
    const { type, x, y, width, height, config } = body;

    if (!type || typeof x !== 'number' || typeof y !== 'number') {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      );
    }

    const block = boardBlocksDb.create(userId, {
      type,
      x,
      y,
      width,
      height,
      config: config || {},
    });

    return NextResponse.json({ block });
  } catch (error) {
    console.error('Board blocks POST error:', error);
    return NextResponse.json(
      { error: '블록 생성 실패' },
      { status: 500 }
    );
  }
}

// PUT: 블록 업데이트
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '블록 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updates: Partial<CanvasBlock> = {};

    if (body.x !== undefined) updates.x = body.x;
    if (body.y !== undefined) updates.y = body.y;
    if (body.width !== undefined) updates.width = body.width;
    if (body.height !== undefined) updates.height = body.height;
    if (body.config !== undefined) updates.config = body.config;

    boardBlocksDb.update(id, userId, updates);
    const updatedBlock = boardBlocksDb.getById(id, userId);

    return NextResponse.json({ block: updatedBlock });
  } catch (error) {
    console.error('Board blocks PUT error:', error);
    return NextResponse.json(
      { error: '블록 업데이트 실패' },
      { status: 500 }
    );
  }
}

// DELETE: 블록 삭제
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '블록 ID가 필요합니다' },
        { status: 400 }
      );
    }

    boardBlocksDb.delete(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Board blocks DELETE error:', error);
    return NextResponse.json(
      { error: '블록 삭제 실패' },
      { status: 500 }
    );
  }
}
