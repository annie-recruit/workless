import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, goalDb } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { suggestions } = await req.json();

    const memory = memoryDb.getById(id);
    if (!memory) {
      return NextResponse.json(
        { error: '기억을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // AI 제안으로부터 목표 생성
    const title = memory.content.length > 50 
      ? memory.content.substring(0, 50) + '...' 
      : memory.content;

    // nextSteps를 설명으로
    const nextStepsText = suggestions.nextSteps 
      ? '다음 단계:\n• ' + suggestions.nextSteps.join('\n• ') 
      : '';
    
    const resourcesText = suggestions.resources 
      ? '\n\n관련 자료:\n• ' + suggestions.resources.map((r: any) => `${r.name} (${r.type})`).join('\n• ')
      : '';

    const description = nextStepsText + resourcesText;

    // actionPlan을 milestones로 변환 (Goal 인터페이스에 맞게)
    const milestones = suggestions.actionPlan 
      ? suggestions.actionPlan.map((plan: any) => ({
          text: `${plan.action}${plan.timeframe ? ` (${plan.timeframe})` : ''}`,
          completed: false
        }))
      : [];

    // category 결정 (memory topic 기반)
    let category: 'idea' | 'request' | 'habit' = 'idea';
    if (memory.topic === '아이디어') category = 'idea';
    else if (memory.topic === '요청' || memory.topic === '질문') category = 'request';
    else if (memory.topic === '습관' || memory.topic === '일상') category = 'habit';

    // goalDb.create signature: (title, sourceMemoryIds, category, description?)
    const goal = goalDb.create(
      title,
      [id], // sourceMemoryIds
      category,
      description
    );

    // milestones 업데이트 (create 후에)
    if (milestones.length > 0) {
      goalDb.update(goal.id, { milestones });
    }

    return NextResponse.json({ 
      success: true, 
      goal,
      message: '목표가 성공적으로 생성되었습니다!'
    });
  } catch (error) {
    console.error('Failed to convert to goal:', error);
    return NextResponse.json(
      { error: '목표 전환 실패' },
      { status: 500 }
    );
  }
}
