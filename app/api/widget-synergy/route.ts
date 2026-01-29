import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { memoryDb, boardBlocksDb, projectDb } from '@/lib/db';
import { stripHtml } from '@/lib/text';
import { CalendarBlockConfig, MeetingRecorderBlockConfig, DatabaseBlockConfig, ActionProject } from '@/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SynergyType =
  | 'meeting-recorder-calendar'
  | 'database-memory'
  | 'calendar-memory'
  | 'action-plan-calendar'
  | 'meeting-recorder-action-plan'
  | 'action-plan-database';

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { synergyType, memoryIds, blockIds, projectIds } = await req.json();

    if (!synergyType) {
      return NextResponse.json({ error: 'Synergy type is required' }, { status: 400 });
    }

    switch (synergyType) {
      case 'meeting-recorder-calendar':
        return await handleMeetingRecorderCalendar(userId, blockIds);
      case 'database-memory':
        return await handleDatabaseMemory(userId, blockIds, memoryIds);
      case 'calendar-memory':
        return await handleCalendarMemory(userId, blockIds, memoryIds);
      case 'action-plan-calendar':
        return await handleActionPlanCalendar(userId, blockIds, projectIds);
      case 'meeting-recorder-action-plan':
        return await handleMeetingRecorderActionPlan(userId, blockIds, projectIds);
      case 'action-plan-database':
        return await handleActionPlanDatabase(userId, blockIds, projectIds);
      default:
        return NextResponse.json({ error: 'Unknown synergy type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Widget synergy error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// 1. 미팅녹음 - 캘린더
async function handleMeetingRecorderCalendar(userId: string, blockIds: string[]) {
  const meetingRecorderBlock = boardBlocksDb.getById(blockIds.find(id => {
    const block = boardBlocksDb.getById(id, userId);
    return block?.type === 'meeting-recorder';
  }) || '', userId);
  const calendarBlock = boardBlocksDb.getById(blockIds.find(id => {
    const block = boardBlocksDb.getById(id, userId);
    return block?.type === 'calendar';
  }) || '', userId);

  if (!meetingRecorderBlock || !calendarBlock) {
    return NextResponse.json({ error: 'Meeting recorder and calendar blocks are required' }, { status: 400 });
  }

  const meetingConfig = meetingRecorderBlock.config as MeetingRecorderBlockConfig;
  const calendarConfig = calendarBlock.config as CalendarBlockConfig;

  if (!meetingConfig.script && !meetingConfig.summary) {
    return NextResponse.json({ error: 'Meeting recorder has no content' }, { status: 400 });
  }

  const meetingContent = meetingConfig.summary || meetingConfig.script || '';

  // AI에게 회의록 분석 요청 (액션 아이템 및 날짜 추출)
  const prompt = `다음 회의록에서 액션 아이템과 날짜를 추출해주세요.

회의록 내용:
${meetingContent}

중요:
- 회의록에 명확한 날짜가 언급된 경우에만 date 필드에 포함하세요
- 날짜가 명확하지 않으면 date 필드를 생략하세요 (null이나 빈 문자열 대신 아예 생략)
- 날짜 형식: YYYY-MM-DD (예: 2024-02-03)

JSON 형식으로 응답:
{
  "actionItems": [
    {"text": "액션 내용", "date": "2024-01-15", "time": "14:00"}
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const analysis = JSON.parse(completion.choices[0].message.content || '{"actionItems": []}');
  const actionItems = analysis.actionItems || [];
  const todos = calendarConfig.todos || [];

  // 액션 아이템을 투두로 추가
  const newTodos = [...todos];
  actionItems.forEach((item: { text: string; date?: string; time?: string }) => {
    const todoDate = item.date ? new Date(item.date).getTime() : Date.now();
    newTodos.push({
      id: `todo-${Date.now()}-${Math.random()}`,
      text: item.text,
      completed: false,
      date: todoDate,
      time: item.time,
      createdAt: Date.now(),
    });
  });

  // 캘린더 블록 업데이트
  boardBlocksDb.update(calendarBlock.id, userId, {
    config: {
      ...calendarConfig,
      todos: newTodos,
    },
  });

  return NextResponse.json({
    message: `캘린더에 ${actionItems.length}개의 투두가 추가되었습니다`,
    todosAdded: actionItems.length,
  });
}

// 2. 데이터베이스 - 카드
async function handleDatabaseMemory(userId: string, blockIds: string[], memoryIds: string[]) {
  const databaseBlock = boardBlocksDb.getById(blockIds.find(id => {
    const block = boardBlocksDb.getById(id, userId);
    return block?.type === 'database';
  }) || '', userId);

  if (!databaseBlock || memoryIds.length === 0) {
    return NextResponse.json({ error: 'Database block and memories are required' }, { status: 400 });
  }

  const memories = memoryIds.map(id => memoryDb.getById(id, userId)).filter((m): m is NonNullable<typeof m> => m !== null);
  if (memories.length === 0) {
    return NextResponse.json({ error: 'No valid memories found' }, { status: 400 });
  }

  const dbConfig = databaseBlock.config as DatabaseBlockConfig;

  // AI에게 기록 내용을 구조화된 데이터로 변환 요청
  const memoriesText = memories.map(m => ({
    id: m.id,
    title: m.title || '',
    content: stripHtml(m.content),
  }));

  const propertiesList = dbConfig.properties.map(p => `${p.name} (${p.type})`).join(', ');
  const prompt = `다음 기록들을 데이터베이스 행으로 변환해주세요. 데이터베이스 속성: ${propertiesList}

기록들:
${JSON.stringify(memoriesText, null, 2)}

JSON 형식으로 응답:
{
  "rows": [
    {"property1": "value1", "property2": "value2", ...}
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const extractedData = JSON.parse(completion.choices[0].message.content || '{"rows": []}');
  const rows = dbConfig.rows || [];

  // 추출된 데이터를 행으로 추가
  const newRows = [...rows];
  extractedData.rows.forEach((row: Record<string, any>) => {
    newRows.push({
      id: `row-${Date.now()}-${Math.random()}`,
      properties: row,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // 데이터베이스 블록 업데이트
  boardBlocksDb.update(databaseBlock.id, userId, {
    config: {
      ...dbConfig,
      rows: newRows,
      linkedMemoryIds: [...(dbConfig.linkedMemoryIds || []), ...memoryIds],
    },
  });

  return NextResponse.json({
    message: `데이터베이스에 ${extractedData.rows.length}개의 행이 추가되었습니다`,
    rowsAdded: extractedData.rows.length,
  });
}

// 3. 캘린더 - 카드
async function handleCalendarMemory(userId: string, blockIds: string[], memoryIds: string[]) {
  const calendarBlock = boardBlocksDb.getById(blockIds.find(id => {
    const block = boardBlocksDb.getById(id, userId);
    return block?.type === 'calendar';
  }) || '', userId);

  if (!calendarBlock || memoryIds.length === 0) {
    return NextResponse.json({ error: 'Calendar block and memories are required' }, { status: 400 });
  }

  const memories = memoryIds.map(id => memoryDb.getById(id, userId)).filter((m): m is NonNullable<typeof m> => m !== null);
  if (memories.length === 0) {
    return NextResponse.json({ error: 'No valid memories found' }, { status: 400 });
  }

  const calendarConfig = calendarBlock.config as CalendarBlockConfig;
  const todos = calendarConfig.todos || [];

  // AI에게 기록에서 일정 정보 추출 요청
  const memoriesText = memories.map(m => ({
    id: m.id,
    title: m.title || '',
    content: stripHtml(m.content),
    createdAt: m.createdAt,
  }));

  const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/extract-schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memories: memoriesText,
    }),
  });

  if (!aiResponse.ok) {
    return NextResponse.json({ error: 'Failed to extract schedule' }, { status: 500 });
  }

  const scheduleData = await aiResponse.json();
  const newTodos = [...todos];

  scheduleData.schedules.forEach((schedule: { text: string; date: number; time?: string; memoryId?: string }) => {
    newTodos.push({
      id: `todo-${Date.now()}-${Math.random()}`,
      text: schedule.text,
      completed: false,
      date: schedule.date,
      time: schedule.time,
      linkedMemoryIds: schedule.memoryId ? [schedule.memoryId] : undefined,
      createdAt: Date.now(),
    });
  });

  // 캘린더 블록 업데이트
  boardBlocksDb.update(calendarBlock.id, userId, {
    config: {
      ...calendarConfig,
      todos: newTodos,
      linkedMemoryIds: [...(calendarConfig.linkedMemoryIds || []), ...memoryIds],
    },
  });

  return NextResponse.json({
    message: `캘린더에 ${scheduleData.schedules.length}개의 일정이 추가되었습니다`,
    schedulesAdded: scheduleData.schedules.length,
  });
}

// 4. 액션플랜 - 캘린더
async function handleActionPlanCalendar(userId: string, blockIds: string[], projectIds: string[]) {
  const calendarBlock = boardBlocksDb.getById(blockIds.find(id => {
    const block = boardBlocksDb.getById(id, userId);
    return block?.type === 'calendar';
  }) || '', userId);

  if (!calendarBlock || projectIds.length === 0) {
    return NextResponse.json({ error: 'Calendar block and action plans are required' }, { status: 400 });
  }

  // 프로젝트 데이터 가져오기
  const allProjects = projectDb.getAll(userId);
  const projects = allProjects.filter(p => projectIds.includes(p.id));

  if (projects.length === 0) {
    return NextResponse.json({ error: 'No valid projects found' }, { status: 400 });
  }

  const calendarConfig = calendarBlock.config as CalendarBlockConfig;
  const todos = calendarConfig.todos || [];
  const newTodos = [...todos];

  // 각 프로젝트의 마일스톤을 캘린더 투두로 변환
  projects.forEach((project: ActionProject) => {
    project.milestones.forEach((milestone) => {
      milestone.actions.forEach((action) => {
        // 마일스톤의 예상 기간을 기반으로 날짜 계산 (간단한 구현)
        const estimatedDate = Date.now() + (7 * 24 * 60 * 60 * 1000); // 기본 7일 후
        newTodos.push({
          id: `todo-${Date.now()}-${Math.random()}`,
          text: `${project.title} - ${milestone.title}: ${action.text}`,
          completed: action.completed,
          date: estimatedDate,
          linkedMemoryIds: project.sourceMemoryIds,
          createdAt: Date.now(),
        });
      });
    });
  });

  // 캘린더 블록 업데이트
  boardBlocksDb.update(calendarBlock.id, userId, {
    config: {
      ...calendarConfig,
      todos: newTodos,
    },
  });

  return NextResponse.json({
    message: `캘린더에 ${newTodos.length - todos.length}개의 일정이 추가되었습니다`,
    schedulesAdded: newTodos.length - todos.length,
  });
}

// 5. 미팅녹음 - 액션플랜
async function handleMeetingRecorderActionPlan(userId: string, blockIds: string[], projectIds: string[]) {
  const meetingRecorderBlock = boardBlocksDb.getById(blockIds.find(id => {
    const block = boardBlocksDb.getById(id, userId);
    return block?.type === 'meeting-recorder';
  }) || '', userId);

  if (!meetingRecorderBlock) {
    return NextResponse.json({ error: 'Meeting recorder block is required' }, { status: 400 });
  }

  const meetingConfig = meetingRecorderBlock.config as MeetingRecorderBlockConfig;
  const meetingContent = meetingConfig.summary || meetingConfig.script || '';

  if (!meetingContent) {
    return NextResponse.json({ error: 'Meeting recorder has no content' }, { status: 400 });
  }

  // AI에게 회의록을 액션플랜으로 변환 요청
  const prompt = `다음 회의록을 액션플랜으로 변환해주세요.

회의록 내용:
${meetingContent}

JSON 형식으로 응답:
{
  "title": "프로젝트 제목",
  "summary": "프로젝트 요약",
  "expectedDuration": "예상 기간 (예: 20day plan)",
  "milestones": [
    {
      "id": "milestone-1",
      "title": "마일스톤 제목",
      "actions": [
        {"id": "action-1", "text": "액션 내용", "duration": "1h", "completed": false}
      ]
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const actionPlan = JSON.parse(completion.choices[0].message.content || '{}');

  // 액션플랜 생성
  const project = projectDb.create(userId, {
    title: actionPlan.title,
    summary: actionPlan.summary,
    expectedDuration: actionPlan.expectedDuration,
    milestones: actionPlan.milestones,
    sourceMemoryIds: [],
    x: meetingRecorderBlock.x + 300,
    y: meetingRecorderBlock.y,
    color: 'purple',
  });

  return NextResponse.json({
    message: '액션플랜이 생성되었습니다',
    projectId: project.id,
  });
}

// 6. 액션플랜 - 데이터베이스
async function handleActionPlanDatabase(userId: string, blockIds: string[], projectIds: string[]) {
  const databaseBlock = boardBlocksDb.getById(blockIds.find(id => {
    const block = boardBlocksDb.getById(id, userId);
    return block?.type === 'database';
  }) || '', userId);

  if (!databaseBlock || projectIds.length === 0) {
    return NextResponse.json({ error: 'Database block and action plans are required' }, { status: 400 });
  }

  // 프로젝트 데이터 가져오기
  const allProjects = projectDb.getAll(userId);
  const projects = allProjects.filter(p => projectIds.includes(p.id));

  if (projects.length === 0) {
    return NextResponse.json({ error: 'No valid projects found' }, { status: 400 });
  }

  const dbConfig = databaseBlock.config as DatabaseBlockConfig;
  const rows = dbConfig.rows || [];
  const newRows = [...rows];

  // 각 프로젝트를 데이터베이스 행으로 변환
  projects.forEach((project: ActionProject) => {
    const milestones = typeof project.milestones === 'string'
      ? JSON.parse(project.milestones)
      : project.milestones;
    
    const sourceMemoryIds = typeof project.sourceMemoryIds === 'string'
      ? JSON.parse(project.sourceMemoryIds)
      : project.sourceMemoryIds;

    // 데이터베이스 속성에 맞게 매핑
    const properties: Record<string, any> = {};
    dbConfig.properties.forEach(prop => {
      const propNameLower = prop.name.toLowerCase();
      if (propNameLower === 'title') {
        properties[prop.id] = project.title;
      } else if (propNameLower === 'summary') {
        properties[prop.id] = project.summary;
      } else if (propNameLower === 'duration' || propNameLower === 'expectedduration') {
        properties[prop.id] = project.expectedDuration;
      } else if (propNameLower === 'milestones') {
        properties[prop.id] = JSON.stringify(milestones);
      } else if (propNameLower === 'createdat' || propNameLower === 'created') {
        properties[prop.id] = new Date(project.createdAt).toISOString();
      } else {
        // 기본값 설정
        properties[prop.id] = null;
      }
    });

    newRows.push({
      id: `row-${Date.now()}-${Math.random()}`,
      properties,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // 데이터베이스 블록 업데이트
  boardBlocksDb.update(databaseBlock.id, userId, {
    config: {
      ...dbConfig,
      rows: newRows,
    },
  });

  return NextResponse.json({
    message: `데이터베이스에 ${projects.length}개의 액션플랜이 추가되었습니다`,
    rowsAdded: projects.length,
  });
}
