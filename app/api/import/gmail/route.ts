import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { fetchWorklessEmails } from '@/lib/gmail';
import { summarizeGmailEmail } from '@/lib/ai';
import { memoryDb } from '@/lib/db';
import { GmailEmail } from '@/types';

const MAX_IMPORT_PER_RUN = 10;
const CONCURRENCY = 2;

export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Gmail에서 메일 가져오기
        const emails = await fetchWorklessEmails(userId, MAX_IMPORT_PER_RUN);

        // 2. 이미 처리된 메일 제외 (idempotency)
        const newEmails = emails.filter(email => {
            const existing = memoryDb.getBySourceId(email.messageId, userId);
            return !existing;
        });

        if (newEmails.length === 0) {
            return NextResponse.json({ message: 'New emails not found', count: 0 });
        }

        const results = [];

        // 3. 병렬 처리 제한 (CONCURRENCY = 2)
        for (let i = 0; i < newEmails.length; i += CONCURRENCY) {
            const chunk = newEmails.slice(i, i + CONCURRENCY);

            const chunkResults = await Promise.all(
                chunk.map(async (email) => {
                    try {
                        // 4. LLM 요약 호출
                        const summaryData = await summarizeGmailEmail(email);

                        // 5. Memory 생성
                        const content = `${summaryData.summary}\n\nKey Points:\n${summaryData.key_points.map(p => `- ${p}`).join('\n')}`;

                        const memory = memoryDb.create(content, userId, {
                            title: summaryData.title,
                            source: 'gmail',
                            sourceId: email.messageId,
                            sourceLink: email.gmailLink,
                            sourceSender: email.from,
                            sourceSubject: email.subject,
                            topic: summaryData.tags[0] || '기타', // 첫 번째 태그를 주제로 사용하거나 '기타'
                            nature: '단순기록',
                            timeContext: '언젠가'
                        });

                        return { id: memory.id, success: true };
                    } catch (error) {
                        console.error(`Failed to process email ${email.messageId}:`, error);
                        return { messageId: email.messageId, success: false, error: String(error) };
                    }
                })
            );

            results.push(...chunkResults);
        }

        const successCount = results.filter(r => r.success).length;
        return NextResponse.json({
            message: `Imported ${successCount} emails`,
            count: successCount,
            results
        });

    } catch (error) {
        console.error('Gmail import error:', error);
        return NextResponse.json({ error: 'Failed to import emails' }, { status: 500 });
    }
}
