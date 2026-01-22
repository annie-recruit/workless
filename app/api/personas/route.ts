import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/lib/db';
import { getUserId } from '@/lib/auth';

// GET: 모든 페르소나 조회
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const personas = personaDb.getAll(userId);
    return NextResponse.json({ personas });
  } catch (error) {
    console.error('Failed to fetch personas:', error);
    return NextResponse.json({ error: '페르소나 조회 실패' }, { status: 500 });
  }
}

// POST: 새 페르소나 생성
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const { name, icon, description, context } = await req.json();

    if (!name || !icon) {
      return NextResponse.json({ error: '이름과 아이콘은 필수입니다' }, { status: 400 });
    }

    const persona = personaDb.create(name, userId, icon, description, context);
    return NextResponse.json({ persona });
  } catch (error) {
    console.error('Failed to create persona:', error);
    return NextResponse.json({ error: '페르소나 생성 실패' }, { status: 500 });
  }
}

// PUT: 페르소나 수정
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
      return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
    }

    // 사용자 소유 확인
    const persona = personaDb.getById(id, userId);
    if (!persona) {
      return NextResponse.json(
        { error: '페르소나를 찾을 수 없거나 권한이 없습니다' },
        { status: 404 }
      );
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
      return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
    }

    // 사용자 소유 확인
    const persona = personaDb.getById(id, userId);
    if (!persona) {
      return NextResponse.json(
        { error: '페르소나를 찾을 수 없거나 권한이 없습니다' },
        { status: 404 }
      );
    }

    personaDb.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete persona:', error);
    return NextResponse.json({ error: '페르소나 삭제 실패' }, { status: 500 });
  }
}
