'use server';

import { ingestDb, memoryDb } from '@/lib/db';
import crypto from 'crypto';
import { getServerSession } from 'next-auth/next';
import { nextAuthOptions } from '@/app/api/auth/[...nextauth]/route';

interface QuickAddResult {
    success: boolean;
    cardId?: string;
    ingestId?: string;
    error?: string;
    deduped?: boolean;
}

/**
 * Quick Add Server Action
 * 브라우저에서 직접 /api/inbox를 호출하지 않고 서버에서 처리
 * WORKLESS_SEND_API_KEY 노출 방지
 */
export async function quickAddMemory(
    text: string,
    title?: string
): Promise<QuickAddResult> {
    let resolvedUserId: string | null = null;
    let dedupeKey: string | undefined;

    try {
        const session = await getServerSession(nextAuthOptions);
        const userId = (session?.user as { id?: string } | undefined)?.id;
        resolvedUserId = userId ?? null;

        if (!userId) {
            return {
                success: false,
                error: '로그인이 필요합니다'
            };
        }

        // 1. 입력 검증
        if (!text || typeof text !== 'string' || !text.trim()) {
            return {
                success: false,
                error: '텍스트를 입력해주세요'
            };
        }

        // 2. 길이 제한
        const MAX_LENGTH = 50000;
        if (text.length > MAX_LENGTH) {
            return {
                success: false,
                error: `텍스트가 너무 깁니다 (최대 ${MAX_LENGTH}자)`
            };
        }

        // 3. dedupeKey 생성 (내용 기반; timestamp 제거)
        const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
        const titleNorm = typeof title === 'string' ? normalize(title) : '';
        const urlNorm = '';
        const textNorm = normalize(text);
        const payload = `${titleNorm}|${urlNorm}|${textNorm}`;

        const hash = crypto.createHash('sha256').update(payload).digest('hex');
        dedupeKey = `web:${hash}`;

        // 4. Session 기반 userId
        // 5. 중복 체크 (dedupeKey, userId)
        const existingIngest = ingestDb.getByDedupeKey(dedupeKey, userId);
        if (existingIngest) {
            const existingCard = memoryDb.getByIngestId(existingIngest.id, userId);
            return {
                success: true,
                cardId: existingCard?.id,
                ingestId: existingIngest.id,
                deduped: true
            };
        }

        const createdAt = Date.now();

        // 6. 원문(raw) 저장: IngestItem
        const ingest = ingestDb.create({
            userId,
            rawText: text,
            rawMeta: title ? { title } : undefined,
            source: 'workless-web',
            sourceItemId: undefined,
            dedupeKey,
            createdAt,
        });

        // 7. MemoryCard 생성 (표현/정리 레이어)
        const memory = memoryDb.create(text.trim(), userId, {
            ingestId: ingest.id,
            title: title?.trim() || undefined,
            source: 'workless-web',
            dedupeKey,
            createdAt,
            topic: '기타',
            nature: '단순기록',
            timeContext: '언젠가'
        });

        const persistedMemory = memoryDb.getById(memory.id, userId);
        if (!persistedMemory) {
            throw new Error('메모리가 저장되지 않았습니다');
        }

        console.log('[Quick Add] Memory created:', {
            cardId: memory.id,
            ingestId: ingest.id,
            textLength: text.length,
            hasTitle: !!title,
            userId
        });

        return {
            success: true,
            cardId: memory.id,
            ingestId: ingest.id,
            deduped: false
        };

    } catch (error) {
        console.error('[Quick Add] Error saving memory:', {
            userId: resolvedUserId,
            dedupeKey,
            error: error instanceof Error ? error.message : error,
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : '저장에 실패했습니다'
        };
    }
}
