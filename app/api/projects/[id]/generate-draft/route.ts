import { NextRequest, NextResponse } from 'next/server';
import { memoryDb, projectDb, personaDb } from '@/lib/db';
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
        const { milestoneId, actionId, actionText, personaId } = await req.json();

        if (!projectId || !milestoneId || !actionId || !actionText) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
                fullText += `\n\n[첨부파일/링크 중요 내용]\n${attachmentSummary}`;
            }
            return `- ${m.title ? `[${m.title}] ` : ''}${fullText}`;
        }));
        const context = contextParts.join('\n\n---\n\n');

        // 4. AI에게 초안 생성을 위한 프롬프트 작성
        const prompt = `
${personaContext ? `🎯 현재 당신의 페르소나: "${personaName}" (${personaContext})\n이 페르소나의 전문 지식과 관점을 반영하여 초안을 작성해주세요.\n\n` : ''}당신은 프로젝트 실행을 돕는 유능한 비서이자 ${personaName || '전문가'}입니다. 사용자가 계획한 특정 실행 항목(Action)에 대해, 아래 제공된 [사용자의 기록]을 **철저히 분석**하여 초안을 작성해주세요.

⚠️ **매우 중요한 지침 (MUST FOLLOW):**
1. **첨부파일의 구체적 내용을 직접 녹여내세요**: [참고할 사용자의 관련 기록] 내의 [첨부파일/링크 중요 내용]에 담긴 프로젝트 상세 설명, 기술 명칭, 실질적 성과 수치 등을 **반드시** 초안 내용에 포함하세요.
2. **절대로 일반적인 예시를 사용하지 마세요**: 가상의 마케팅 사례나 뜬구름 잡는 소리 대신, 오직 아래 제공된 **실제 데이터와 경험**만을 사용하세요. 
3. **페르소나의 전문성 발휘**: ${personaName ? `"${personaName}" 전문가의 시각에서` : '전문가의 시각에서'} 이 경험을 어떻게 정리하고 강조해야 실무에서 인정받을 수 있을지 전략적으로 작성하세요.

[프로젝트 정보]
- 프로젝트명: "${project.title}"
- 요약: ${project.summary || '없음'}

[참고할 사용자의 관련 기록]
${context || '관련 기록이 없습니다.'}

[작성할 실행 항목(Action)]
"${actionText}"

[작성 형식 가이드]
- 초안은 마크다운(Markdown) 형식을 사용하세요.
- 각 경험은 STAR(Situation, Task, Action, Result) 방식을 사용하되, 기록에 수치가 있다면 반드시 포함하세요.
- 단순히 "정리하기" 수준이 아니라, 실제 제출 가능한 수준의 구체적인 텍스트 초안을 제안하세요.

결과는 JSON 형식으로 반환해주세요:
{
  "type": "writing",
  "content": "마크다운 형식의 구체적인 초안 내용..."
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
