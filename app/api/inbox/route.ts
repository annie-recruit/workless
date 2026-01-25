import { NextRequest, NextResponse } from 'next/server';
import { ingestDb, memoryDb } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';

// 상수
const MAX_TEXT_LENGTH = 50000; // 50KB
const RATE_LIMIT_PER_MINUTE = 60;

type SendApiAuthResult =
    | { valid: true; key: string; userId: string }
    | { valid: false; key: string | null; reason: 'missing' | 'invalid' | 'misconfigured' };

function parseSendApiKeyMap(): Record<string, string> {
    const raw = process.env.WORKLESS_SEND_API_KEY_MAP;
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const map: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof key === 'string' && typeof value === 'string' && value.length > 0) {
                map[key] = value;
            }
        }
        return map;
    } catch {
        return {};
    }
}

// API 키 검증 + userId 매핑
function validateSendApiAuth(req: NextRequest): SendApiAuthResult {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { valid: false, key: null, reason: 'missing' };
    }

    const token = authHeader.substring(7);
    const keyMap = parseSendApiKeyMap();
    const mappedUserId = keyMap[token];
    if (mappedUserId) {
        return { valid: true, key: token, userId: mappedUserId };
    }

    // Backward compatible single-key mode
    const validKey = process.env.WORKLESS_SEND_API_KEY;

    if (!validKey) {
        console.error('⚠️ WORKLESS_SEND_API_KEY or WORKLESS_SEND_API_KEY_MAP not configured');
        return { valid: false, key: token, reason: 'misconfigured' };
    }

    if (token !== validKey) {
        return { valid: false, key: token, reason: 'invalid' };
    }

    const fallbackUserId = process.env.WORKLESS_SEND_API_USER_ID || '';
    return { valid: true, key: token, userId: fallbackUserId };
}

// 안전한 로깅 (PII 보호)
function safeLog(message: string, data?: unknown) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[/api/inbox] ${message}`, data);
    }
}

export async function POST(req: NextRequest) {
    const startTime = Date.now();

    // 1. API 키 검증
    const auth = validateSendApiAuth(req);
    if (!auth.valid) {
        safeLog('Authentication failed');
        return NextResponse.json(
            {
                error: 'Unauthorized',
                message: 'Invalid or missing API key. Please provide a valid Bearer token.'
            },
            { status: 401 }
        );
    }

    // 2. Rate limiting
    const rateLimitKey = auth.key || 'unknown';
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_PER_MINUTE);

    if (!rateLimit.allowed) {
        safeLog('Rate limit exceeded', { key: rateLimitKey.substring(0, 8) + '...' });
        return NextResponse.json(
            {
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': RATE_LIMIT_PER_MINUTE.toString(),
                    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                    'X-RateLimit-Reset': rateLimit.resetTime.toString(),
                }
            }
        );
    }

    try {
        const body = await req.json();

        // 3. 필수 필드 검증
        if (!body.text || typeof body.text !== 'string') {
            safeLog('Missing or invalid text field');
            return NextResponse.json(
                { error: 'Bad Request', message: 'text field is required and must be a string' },
                { status: 400 }
            );
        }

        if (!body.source || typeof body.source !== 'string') {
            safeLog('Missing or invalid source field');
            return NextResponse.json(
                { error: 'Bad Request', message: 'source field is required and must be a string' },
                { status: 400 }
            );
        }

        // 4. Payload size 제한
        if (body.text.length > MAX_TEXT_LENGTH) {
            safeLog('Payload too large', { length: body.text.length });
            return NextResponse.json(
                {
                    error: 'Payload Too Large',
                    message: `text field exceeds maximum length of ${MAX_TEXT_LENGTH} characters`
                },
                { status: 413 }
            );
        }

        // 5. userId (세션 기반이 아니라 API 키 매핑 기반)
        const userId = auth.userId;

        // 6. dedupeKey 중복 체크 (dedupeKey, userId)
        const dedupeKey: string | undefined = typeof body.dedupeKey === 'string' ? body.dedupeKey : undefined;
        if (dedupeKey) {
            const existingIngest = ingestDb.getByDedupeKey(dedupeKey, userId);
            if (existingIngest) {
                let existingCard = memoryDb.getByIngestId(existingIngest.id, userId);
                if (!existingCard) {
                    const metaTitle = typeof existingIngest.rawMeta?.title === 'string' ? existingIngest.rawMeta.title : undefined;
                    const metaUrl = typeof existingIngest.rawMeta?.url === 'string' ? existingIngest.rawMeta.url : undefined;
                    const metaSourceItemId =
                        typeof existingIngest.rawMeta?.clientId === 'string' ? existingIngest.rawMeta.clientId : existingIngest.sourceItemId;

                    existingCard = memoryDb.create(existingIngest.rawText, userId, {
                        ingestId: existingIngest.id,
                        title: metaTitle,
                        source: existingIngest.source,
                        sourceLink: metaUrl,
                        sourceId: metaSourceItemId,
                        dedupeKey: existingIngest.dedupeKey,
                        createdAt: existingIngest.createdAt,
                        topic: '기타',
                        nature: '단순기록',
                        timeContext: '언젠가',
                    });
                }
                safeLog('Duplicate detected', {
                    dedupeKey: dedupeKey.substring(0, 20) + '...',
                    existingIngestId: existingIngest.id,
                    existingCardId: existingCard?.id
                });
                return NextResponse.json({
                    status: 'ok',
                    cardId: existingCard.id,
                    ingestId: existingIngest.id,
                    deduped: true,
                    message: 'Content already exists'
                });
            }
        }

        // 7. 원문(raw) 저장: IngestItem
        const createdAt = body.createdAt ? new Date(body.createdAt).getTime() : Date.now();
        const sourceItemId: string | undefined =
            typeof body.sourceItemId === 'string'
                ? body.sourceItemId
                : (typeof body.clientId === 'string' ? body.clientId : undefined);

        const rawMeta =
            typeof body.rawMeta === 'object' && body.rawMeta && !Array.isArray(body.rawMeta)
                ? body.rawMeta
                : {
                    title: typeof body.title === 'string' ? body.title : undefined,
                    url: typeof body.url === 'string' ? body.url : undefined,
                    clientId: typeof body.clientId === 'string' ? body.clientId : undefined,
                };

        let ingestId: string;
        try {
            const ingest = ingestDb.create({
                userId,
                rawText: body.text,
                rawMeta,
                source: body.source,
                sourceItemId,
                dedupeKey,
                createdAt,
            });
            ingestId = ingest.id;
        } catch (error) {
            // 동시 요청 등으로 유니크 제약에 걸렸을 때 (dedupeKey, userId)
            if (dedupeKey) {
                const existingIngest = ingestDb.getByDedupeKey(dedupeKey, userId);
                if (existingIngest) {
                    let existingCard = memoryDb.getByIngestId(existingIngest.id, userId);
                    if (!existingCard) {
                        const metaTitle = typeof existingIngest.rawMeta?.title === 'string' ? existingIngest.rawMeta.title : undefined;
                        const metaUrl = typeof existingIngest.rawMeta?.url === 'string' ? existingIngest.rawMeta.url : undefined;
                        const metaSourceItemId =
                            typeof existingIngest.rawMeta?.clientId === 'string' ? existingIngest.rawMeta.clientId : existingIngest.sourceItemId;

                        existingCard = memoryDb.create(existingIngest.rawText, userId, {
                            ingestId: existingIngest.id,
                            title: metaTitle,
                            source: existingIngest.source,
                            sourceLink: metaUrl,
                            sourceId: metaSourceItemId,
                            dedupeKey: existingIngest.dedupeKey,
                            createdAt: existingIngest.createdAt,
                            topic: '기타',
                            nature: '단순기록',
                            timeContext: '언젠가',
                        });
                    }
                    return NextResponse.json({
                        status: 'ok',
                        cardId: existingCard.id,
                        ingestId: existingIngest.id,
                        deduped: true,
                        message: 'Content already exists'
                    });
                }
            }
            throw error;
        }

        // 8. MemoryCard 생성 (표현/정리 레이어; rawText는 덮어쓰지 않음)
        const memory = memoryDb.create(body.text, userId, {
            ingestId,
            title: body.title || undefined,
            source: body.source,
            sourceLink: body.url || undefined,
            sourceId: sourceItemId,
            dedupeKey,
            createdAt,
            // LLM 분류 없이 기본값 사용 (raw 모드)
            topic: '기타',
            nature: '단순기록',
            timeContext: '언젠가'
        });

        const duration = Date.now() - startTime;
        safeLog('Memory created successfully', {
            cardId: memory.id,
            source: body.source,
            textLength: body.text.length,
            duration: `${duration}ms`
        });

        return NextResponse.json({
            status: 'ok',
            cardId: memory.id,
            ingestId,
            deduped: false
        }, {
            status: 201,
            headers: {
                'X-RateLimit-Limit': RATE_LIMIT_PER_MINUTE.toString(),
                'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            }
        });

    } catch (error) {
        // 8. 내부 에러 처리 (상세 정보 숨김)
        console.error('❌ /api/inbox internal error:', error);
        safeLog('Internal server error', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: 'An unexpected error occurred. Please try again later.'
            },
            { status: 500 }
        );
    }
}

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
