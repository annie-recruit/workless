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
        const { synergyType, memoryIds, blockIds, projectIds, personaId } = await req.json();

        if (!synergyType) {
            return NextResponse.json({ error: 'Synergy type is required' }, { status: 400 });
        }

        // 페르소나 정보 가져오기
        let personaContext = '';
        let personaName = '';
        if (personaId) {
            const persona = personaDb.getById(personaId, userId);
            if (persona) {
                personaName = persona.name;
                personaContext = persona.context || persona.description || '';
            }
        }

        switch (synergyType) {
            case 'meeting-recorder-calendar':
                return await handleMeetingRecorderCalendar(userId, blockIds, personaContext, personaName);
            case 'database-memory':
                return await handleDatabaseMemory(userId, blockIds, memoryIds, personaContext, personaName);
            case 'calendar-memory':
                return await handleCalendarMemory(userId, blockIds, memoryIds, personaContext, personaName);
            case 'action-plan-calendar':
                return await handleActionPlanCalendar(userId, blockIds, projectIds);
            case 'meeting-recorder-action-plan':
                return await handleMeetingRecorderActionPlan(userId, blockIds, projectIds, personaContext, personaName);
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
async function handleMeetingRecorderCalendar(userId: string, blockIds: string[], personaContext?: string, personaName?: string) {
  // ... (중략)
  const meetingContent = meetingConfig.summary || meetingConfig.script || '';

  // AI에게 회의록 분석 요청 (액션 아이템 및 날짜 추출)
  const prompt = `
${personaContext ? `🎯 페르소나 관점: "${personaName}" (${personaContext})\n` : ''}다음 회의록에서 액션 아이템과 날짜를 추출해주세요. 페르소나의 관점을 반영하여 중요도가 높은 항목 위주로 선별해주세요.

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

  const propertiesInfo = dbConfig.properties.map(p => `- ID: ${p.id}, 이름: ${p.name}, 타입: ${p.type}`).join('\n');
  const prompt = `다음 기록들을 데이터베이스 행으로 변환해주세요.

데이터베이스 속성 정의:
${propertiesInfo}

기록들:
${JSON.stringify(memoriesText, null, 2)}

중요: 각 행의 JSON 키는 반드시 위에서 정의된 'ID'를 사용하세요. 이름이나 다른 텍스트를 키로 사용하지 마세요.

JSON 형식으로 응답:
{
  "rows": [
    {"[ID1]": "값1", "[ID2]": "값2", ...}
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
  const extractedRows = Array.isArray(extractedData.rows) ? extractedData.rows : [];
  
  extractedRows.forEach((row: Record<string, any>) => {
    // AI가 속성 ID를 키로 사용하지 않고 이름 등을 사용했을 경우를 대비한 매핑 보정
    const mappedProperties: Record<string, any> = {};
    
    dbConfig.properties.forEach(prop => {
      // 1. 정확한 ID 매칭
      if (row[prop.id] !== undefined) {
        mappedProperties[prop.id] = row[prop.id];
      } 
      // 2. 속성 이름으로 매칭 (AI가 실수했을 경우 대비)
      else if (row[prop.name] !== undefined) {
        mappedProperties[prop.id] = row[prop.name];
      }
      // 3. 소문자 이름으로 매칭
      else {
        const foundKey = Object.keys(row).find(k => k.toLowerCase() === prop.name.toLowerCase());
        if (foundKey) {
          mappedProperties[prop.id] = row[foundKey];
        }
      }
    });

    if (Object.keys(mappedProperties).length > 0) {
      newRows.push({
        id: `row-${Date.now()}-${Math.random()}`,
        properties: mappedProperties,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
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
async function handleMeetingRecorderActionPlan(userId: string, blockIds: string[], projectIds: string[], personaContext?: string, personaName?: string) {
  // ... (중략)
  const meetingContent = meetingConfig.summary || meetingConfig.script || '';

  // AI에게 회의록을 액션플랜으로 변환 요청
  const prompt = `
${personaContext ? `🎯 현재 당신의 페르소나: "${personaName}" (${personaContext})\n이 페르소나의 전문 지식과 관점을 반영하여 회의록을 분석하고 액션 플랜을 세워주세요.\n\n` : ''}당신은 생산성 전문가입니다. 다음 회의록 내용을 **철저히 분석**하여 구체적이고 실행 가능한 "액션 프로젝트"를 설계해주세요.

회의록 내용:
${meetingContent}

⚠️ **중요 지침:**
1. **결정사항 중심**: 회의에서 나온 구체적인 결정사항, 담당자, 마감 기한을 액션 아이템에 포함하세요.
2. **구체적 수치**: 논의된 숫자나 데이터가 있다면 반드시 활용하세요.
3. **페르소나 반영**: ${personaName ? `"${personaName}" 전문가의 시각에서` : '전문가의 시각에서'} 이 회의 이후에 가장 먼저 해야 할 전략적인 일들을 제안하세요.

JSON 형식으로 응답:
{
  "title": "...",
  "summary": "...",
  "expectedDuration": "...",
  "milestones": [
    {
      "id": "milestone-1",
      "title": "마일스톤 제목",
      "actions": [
        {"id": "action-1", "text": "매우 구체적인 액션 내용 (예: ~를 위해 ~하기)", "duration": "1h", "completed": false}
      ]
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
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
    color: 'bg-purple-50',
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
      const propName = prop.name.toLowerCase().trim();
      
      if (['title', '제목', '이름', 'name'].includes(propName)) {
        properties[prop.id] = project.title;
      } else if (['summary', '요약', '설명', 'description', '내용'].includes(propName)) {
        properties[prop.id] = project.summary;
      } else if (['duration', 'expectedduration', '기간', '예상기간', '소요시간'].includes(propName)) {
        properties[prop.id] = project.expectedDuration;
      } else if (['milestones', '단계', '할일', '마일스톤'].includes(propName)) {
        properties[prop.id] = JSON.stringify(milestones);
      } else if (['createdat', 'created', '생성일', '날짜', 'date'].includes(propName)) {
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
