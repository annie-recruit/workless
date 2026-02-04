import { NextRequest, NextResponse } from 'next/server';
import { projectDb, memoryDb } from '@/lib/db';
import { getUserId } from '@/lib/auth';
import { summarizeAttachments } from '@/lib/ai';
import OpenAI from 'openai';
import { stripHtml } from '@/lib/text';
import { ActionProject, ProjectMilestone, ProjectAction } from '@/types';
import { nanoid } from 'nanoid';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: NextRequest) {
    try {
        const userId = await getUserId(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const projects = projectDb.getAll(userId);
        return NextResponse.json({ projects });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getUserId(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { sourceMemoryIds, userPrompt, x, y, color } = body;

        if (!sourceMemoryIds || sourceMemoryIds.length === 0) {
            return NextResponse.json({ error: 'No source memories provided' }, { status: 400 });
        }

        // 1. Fetch source memories
        const sources = sourceMemoryIds.map((id: string) => memoryDb.getById(id, userId)).filter(Boolean);
        
        // 1-1. Build combined content with attachment summaries
        const contentParts = await Promise.all(sources.map(async (m: any) => {
            const attachmentSummary = await summarizeAttachments(m.attachments || [], m.content);
            let fullText = stripHtml(m.content || '');
            if (attachmentSummary) {
                fullText += `\n\n[첨부파일/링크 내용]\n${attachmentSummary}`;
            }
            return `[기록 ID: ${m.id}]\n${fullText}`;
        }));
        const combinedContent = contentParts.join('\n\n---\n\n');

        // 2. Generate project structure using AI
        const prompt = `
당신은 생산성 전문가입니다. 다음 기록들을 바탕으로 구체적이고 현실적인 "액션 프로젝트"를 설계해주세요.

[사용자 요청]
"${userPrompt}"

[근거 기록들]
${combinedContent}

요구사항:
1. 제목: 멋지게 생성 (예: "🚀 서비스 기획 및 MVP 개발 프로젝트")
2. 전체 예상 기간: 현실적으로 산정 (예: "2주 프로젝트", "3시간 집중 코스" 등)
3. 요약: 프로젝트의 성격과 목표를 2-3문장으로 설명
4. 단계(Milestones): 최소 2~3단계로 구분 (예: [1단계: 준비], [2단계: 실행])
5. 세부 액션(Actions):
   - 매우 구체적이어야 함 (예: "공부하기" X -> "공식 문서의 Quick Start 가이드 따라하며 환경 정리" O)
   - 각 액션 끝에 예상 소요 시간을 괄호로 표기 (예: "(1h)", "(30m)")
   - 사용자가 즉시 행동할 수 있는 "요구 행동" 중심이어야 함.
   - 근거 기록들의 맥락을 최대한 반영.

JSON 형식으로 응답하세요:
{
  "title": "...",
  "expectedDuration": "...",
  "summary": "...",
  "milestones": [
    {
      "title": "[1단계: ...]",
      "actions": [
        { "text": "...", "duration": "30m" },
        { "text": "...", "duration": "1h" }
      ]
    }
  ]
}
`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        // 3. Prepare data for DB
        const milestones: ProjectMilestone[] = (result.milestones || []).map((m: any) => ({
            id: nanoid(),
            title: m.title,
            actions: (m.actions || []).map((a: any) => ({
                id: nanoid(),
                text: a.text,
                duration: a.duration,
                completed: false,
            })),
        }));

        const project = projectDb.create(userId, {
            title: result.title || '새 액션 프로젝트',
            summary: result.summary || '기록을 기반으로 생성된 프로젝트입니다.',
            expectedDuration: result.expectedDuration || '미정',
            milestones,
            sourceMemoryIds,
            x: x || 100,
            y: y || 100,
            color: color || 'bg-indigo-50',
        });

        return NextResponse.json({ project });
    } catch (error: any) {
        console.error('Project creation failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const userId = await getUserId(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id, ...updates } = await req.json();
        projectDb.update(id, userId, updates);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userId = await getUserId(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        projectDb.delete(id, userId);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
