import { NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db';
import { generateInsights } from '@/lib/ai';

// GET: 인사이트 조회
export async function GET() {
  try {
    const memories = memoryDb.getAll();
    const insights = await generateInsights(memories);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Insights generation error:', error);
    return NextResponse.json(
      { error: '인사이트 생성 실패' },
      { status: 500 }
    );
  }
}
