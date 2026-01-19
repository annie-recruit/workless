import { NextRequest, NextResponse } from 'next/server';
import { goalDb } from '@/lib/db';
import { Goal } from '@/types';

// GET: 모든 목표 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'active' | 'completed' | 'archived' | null;

    const goals = status ? goalDb.getByStatus(status) : goalDb.getAll();
    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return NextResponse.json(
      { error: '목표 조회 실패' },
      { status: 500 }
    );
  }
}

// POST: 새 목표 생성
export async function POST(req: NextRequest) {
  try {
    const { title, description, category, sourceMemoryIds } = await req.json();

    if (!title || !category || !Array.isArray(sourceMemoryIds)) {
      return NextResponse.json(
        { error: '제목, 카테고리, 소스 기억은 필수입니다.' },
        { status: 400 }
      );
    }

    const newGoal = goalDb.create(title, sourceMemoryIds, category, description);
    return NextResponse.json({ goal: newGoal }, { status: 201 });
  } catch (error) {
    console.error('Failed to create goal:', error);
    return NextResponse.json(
      { error: '목표 생성 실패' },
      { status: 500 }
    );
  }
}

// PUT: 목표 업데이트
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '목표 ID는 필수입니다.' },
        { status: 400 }
      );
    }

    const updates = await req.json();
    goalDb.update(id, updates);
    const updatedGoal = goalDb.getById(id);
    return NextResponse.json({ goal: updatedGoal });
  } catch (error) {
    console.error('Failed to update goal:', error);
    return NextResponse.json(
      { error: '목표 업데이트 실패' },
      { status: 500 }
    );
  }
}

// DELETE: 목표 삭제
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '목표 ID는 필수입니다.' },
        { status: 400 }
      );
    }

    goalDb.delete(id);
    return NextResponse.json({ message: '목표 삭제 성공' });
  } catch (error) {
    console.error('Failed to delete goal:', error);
    return NextResponse.json(
      { error: '목표 삭제 실패' },
      { status: 500 }
    );
  }
}
