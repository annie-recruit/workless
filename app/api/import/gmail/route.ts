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
                        const summaryData = await summarizeGmailEmail(email);
                        const content = `${summaryData.summary}\n\nKey Points:\n${summaryData.key_points.map(p => `- ${p}`).join('\n')}`;
                        const memory = memoryDb.create(content, userId, {
                            title: summaryData.title,
                            source: 'gmail',
                            sourceId: email.messageId,
                            sourceLink: email.gmailLink,
                            sourceSender: email.from,
                            sourceSubject: email.subject,
                            topic: summaryData.tags[0] || '기타',
                            nature: '단순기록',
                            timeContext: '언젠가'
                        });
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
