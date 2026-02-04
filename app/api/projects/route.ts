import { NextRequest, NextResponse } from 'next/server';
import { projectDb, memoryDb, personaDb } from '@/lib/db';
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
        const { sourceMemoryIds, userPrompt, x, y, color, personaId } = body;

        if (!sourceMemoryIds || sourceMemoryIds.length === 0) {
            return NextResponse.json({ error: 'No source memories provided' }, { status: 400 });
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

        // 1. Fetch source memories
        const sources = sourceMemoryIds.map((id: string) => memoryDb.getById(id, userId)).filter(Boolean);
        
        // 1-1. Build combined content with attachment summaries
        const contentParts = await Promise.all(sources.map(async (m: any) => {
            const attachmentSummary = await summarizeAttachments(m.attachments || [], m.content);
            let fullText = stripHtml(m.content || '');
            if (attachmentSummary) {
                fullText += `\n\n[첨부파일/링크 중요 내용]\n${attachmentSummary}`;
            }
            return `[기록 ID: ${m.id}]\n${fullText}`;
        }));
        const combinedContent = contentParts.join('\n\n---\n\n');

        // 2. Generate project structure using AI
        const prompt = `
${personaContext ? `🎯 현재 당신의 페르소나: "${personaName}" (${personaContext})\n이 페르소나의 전문 지식과 관점을 반영하여 프로젝트를 설계해주세요.\n\n` : ''}당신은 생산성 전문가이자 유능한 비서입니다. 제공된 [근거 기록들]을 **철저히 분석**하여, 사용자의 [요청]에 부합하는 구체적이고 현실적인 "액션 프로젝트"를 설계해주세요.

[사용자 요청]
"${userPrompt}"

[근거 기록들]
${combinedContent}

⚠️ **매우 중요한 지침 (MUST FOLLOW):**
1. **첨부파일의 "실제 내용"을 직접적으로 사용하세요**: [근거 기록들] 내의 [첨부파일/링크 중요 내용]에 담긴 구체적인 정보(예: 포트폴리오 내의 구체적인 프로젝트명, 기술 스택, 담당 역할, 달성한 수치 등)를 **반드시** 액션 아이템에서 직접 언급하며 활용하세요. 
   - 예: "포트폴리오 참고하기" (X) -> "포트폴리오에 기재된 'A 서비스 리뉴얼 프로젝트'의 트래픽 30% 개선 사례를 구체화하기" (O)
2. **가상의 내용을 지어내지 마세요**: 기록에 없는 일반적인 마케팅이나 커리어 조언 대신, 오직 제공된 **실제 데이터와 경험**을 기반으로 계획을 세우세요. 
3. **페르소나 관점의 전략적 제안**: ${personaName ? `"${personaName}" 전문가의 시각에서` : '생산성 전문가의 시각에서'} 사용자가 이 기록들을 어떻게 활용하면 가장 효과적일지 고민하여 단계를 나누세요.

요구사항:
1. 제목: 근거 기록의 핵심 키워드와 페르소나의 성격을 반영하여 구체적으로 생성
2. 요약: 프로젝트의 성격과 최종 목표를 2-3문장으로 설명
3. 단계(Milestones): 최소 2~3단계로 구분하여 전략적인 흐름 구성
4. 세부 액션(Actions):
   - **반드시** 기록 및 첨부파일 내의 구체적인 명칭, 숫자, 기술명을 포함할 것
   - 각 액션 끝에 예상 소요 시간을 괄호로 표기 (예: "(1h)", "(30m)")
   - 사용자가 즉시 실행할 수 있는 행동 중심의 문장으로 작성

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
