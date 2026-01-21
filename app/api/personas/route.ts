import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/lib/db';

// GET: 모든 페르소나 조회
export async function GET() {
  try {
    const personas = personaDb.getAll();
    return NextResponse.json({ personas });
  } catch (error) {
    console.error('Failed to fetch personas:', error);
    return NextResponse.json({ error: '페르소나 조회 실패' }, { status: 500 });
  }
}

// POST: 새 페르소나 생성
export async function POST(req: NextRequest) {
  try {
    const { name, icon, description, context } = await req.json();

    if (!name || !icon) {
      return NextResponse.json({ error: '이름과 아이콘은 필수입니다' }, { status: 400 });
    }

    const persona = personaDb.create(name, icon, description, context);
    return NextResponse.json({ persona });
  } catch (error) {
    console.error('Failed to create persona:', error);
    return NextResponse.json({ error: '페르소나 생성 실패' }, { status: 500 });
  }
}

// PUT: 페르소나 수정
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
    }

    const updates = await req.json();
    personaDb.update(id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update persona:', error);
    return NextResponse.json({ error: '페르소나 수정 실패' }, { status: 500 });
  }
}

// DELETE: 페르소나 삭제
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
    }

    personaDb.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete persona:', error);
    return NextResponse.json({ error: '페르소나 삭제 실패' }, { status: 500 });
  }
}
