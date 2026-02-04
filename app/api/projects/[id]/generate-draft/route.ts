import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, projectDb } from '@/lib/db';
import { getUserId } from '@/lib/auth';
import { summarizeAttachments } from '@/lib/ai';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: projectId } = await params;
        const { milestoneId, actionId, actionText } = await req.json();

        if (!projectId || !milestoneId || !actionId || !actionText) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. 프로젝트 조회
        const project = projectDb.getById(projectId, userId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // 2. 소스 기억 조회
        const sourceMemoryIds = project.sourceMemoryIds || [];
        const memories = memoryDb.getAllByIds(sourceMemoryIds, userId);

        // 3. 컨텍스트 구성 (첨부파일 내용 포함)
        const contextParts = await Promise.all(memories.map(async (m: any) => {
            const attachmentSummary = await summarizeAttachments(m.attachments || [], m.content);
            let fullText = m.content || '';
            if (attachmentSummary) {
                fullText += `\n\n[첨부파일/링크 내용]\n${attachmentSummary}`;
            }
            return `- ${m.title ? `[${m.title}] ` : ''}${fullText}`;
        }));
        const context = contextParts.join('\n\n---\n\n');

        // 4. AI에게 초안 생성을 위한 프롬프트 작성
        const prompt = `
당신은 프로젝트 실행을 돕는 유능한 비서입니다. 사용자가 계획한 특정 실행 항목(Action)에 대해, 아래 제공된 [사용자의 기록]을 **반드시** 참고하여 초안을 작성해주세요.

⚠️ **중요 지침:**
1. **절대로 일반적인 예시(예: 마케팅, 일반 사무 등)를 사용하지 마세요.** 
2. 오직 아래 제공된 [참고할 사용자의 관련 기록]에 명시된 구체적인 경험, 기술, 프로젝트 내용만을 사용하여 초안을 작성하세요.
3. 만약 기록에 "채용담당자" 또는 "인사" 관련 내용이 있다면, 채용 프로세스, 인사 운영, 후보자 관리 등 실제 기록에 기반한 용어와 성과를 사용하세요.
4. 기록이 부족하더라도 뜬구름 잡는 소리 대신, 기록에 나온 키워드를 확장하는 수준에서만 작성하세요.
5. **PDF나 이미지 등 첨부파일에서 추출된 내용이 있다면 그 내용을 최우선으로 반영하세요.**

[프로젝트 정보]
- 프로젝트명: "${project.title}"
- 요약: ${project.summary || '없음'}

[참고할 사용자의 관련 기록]
${context || '관련 기록이 없습니다. (주의: 기록이 없는 경우 매우 간결하게 작성할 것)'}

[작성할 실행 항목(Action)]
"${actionText}"

[작성 형식 가이드]
- 초안은 마크다운(Markdown) 형식을 사용하세요.
- 각 경험은 STAR(Situation, Task, Action, Result) 방식을 사용하되, 기록에 수치가 있다면 반드시 포함하세요.
- "이미 했던 것 중 무엇을 강조해야 하는지" 혹은 "기록 기반으로 어떻게 구체화할지"에 집중하세요.

결과는 JSON 형식으로 반환해주세요:
{
  "type": "writing",
  "content": "마크다운 형식의 초안 내용..."
}
`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: '당신은 사용자의 기록을 "있는 그대로" 분석하여 실행 초안을 만드는 비서입니다. 제공되지 않은 가상의 경력이나 마케팅 사례를 지어내면 절대 안 됩니다.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3, // 일관성을 위해 온도를 낮춤
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        return NextResponse.json({ draft: result });

    } catch (error) {
        console.error('Failed to generate real draft:', error);
        return NextResponse.json({
            error: 'Failed to generate draft',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
