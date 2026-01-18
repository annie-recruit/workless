import { NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db';
import { suggestGroups } from '@/lib/ai';

// GET: AI 그룹 제안
export async function GET() {
  try {
    const memories = memoryDb.getAll();
    const suggestions = await suggestGroups(memories);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Group suggestion error:', error);
    return NextResponse.json(
      { error: '그룹 제안 실패' },
      { status: 500 }
    );
  }
}
