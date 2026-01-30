import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { fetchWorklessEmails } from '@/lib/gmail';
import { summarizeGmailEmail } from '@/lib/ai';
import { memoryDb } from '@/lib/db';

const MAX_IMPORT_PER_RUN = 10;
const CONCURRENCY = 2;

export async function GET(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const emails = await fetchWorklessEmails(userId, MAX_IMPORT_PER_RUN);
        const emailsWithStatus = emails.map(email => {
            const existing = memoryDb.getBySourceId(email.messageId, userId);
            return { ...email, isImported: !!existing };
        });

        return NextResponse.json({ emails: emailsWithStatus });
    } catch (error: any) {
        console.error('Gmail fetch error:', error);
        if (error.message?.includes('insufficient authentication scopes') || error.code === 403 || error.status === 403) {
            return NextResponse.json({ 
                error: 'Insufficient scopes', 
                code: 'INSUFFICIENT_SCOPES' 
            }, { status: 403 });
        }
        return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { messageIds } = await req.json();
        if (!messageIds || !Array.isArray(messageIds)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const emails = await fetchWorklessEmails(userId, MAX_IMPORT_PER_RUN);
        const selectedEmails = emails.filter(email => messageIds.includes(email.messageId));

        const results = [];
        for (let i = 0; i < selectedEmails.length; i += CONCURRENCY) {
            const chunk = selectedEmails.slice(i, i + CONCURRENCY);
            const chunkResults = await Promise.all(
                chunk.map(async (email) => {
                    try {
                        // 1. 메일 본문 요약
                        const summaryData = await summarizeGmailEmail(email);
                        const content = `${summaryData.summary}\n\nKey Points:\n${summaryData.key_points.map(p => `- ${p}`).join('\n')}`;
                        
                        // 2. 첨부파일 내용 분석 (있을 경우)
                        let fileContext = '';
                        if (email.attachments && email.attachments.length > 0) {
                            fileContext = await summarizeAttachments(email.attachments, content);
                        }

                        // 3. 기억 생성
                        const memory = memoryDb.create(content, userId, {
                            title: summaryData.title,
                            source: 'gmail',
                            sourceId: email.messageId,
                            sourceLink: email.gmailLink,
                            sourceSender: email.from,
                            sourceSubject: email.subject,
                            topic: summaryData.tags[0] || '기타',
                            nature: '단순기록',
                            timeContext: '언젠가',
                            attachments: email.attachments,
                        });

                        // 4. 분석된 파일 내용이 있으면 업데이트 (분류 등에 활용될 수 있도록)
                        // Note: memoryDb.create 이후에 AI가 추가 분석을 할 수 있는 구조라면 
                        // 여기서 fileContext를 활용한 추가 로직을 넣을 수 있습니다.
                        
                        return { id: memory.id, success: true };
                        return { id: memory.id, success: true };
                    } catch (error) {
                        return { messageId: email.messageId, success: false, error: String(error) };
                    }
                })
            );
            results.push(...chunkResults);
        }

        const successCount = results.filter(r => r.success).length;
        return NextResponse.json({ count: successCount, results });
    } catch (error: any) {
        console.error('Gmail import error:', error);
        if (error.message?.includes('insufficient authentication scopes') || error.code === 403 || error.status === 403) {
            return NextResponse.json({ 
                error: 'Insufficient scopes', 
                code: 'INSUFFICIENT_SCOPES' 
            }, { status: 403 });
        }
        return NextResponse.json({ error: 'Failed to import emails' }, { status: 500 });
    }
}
