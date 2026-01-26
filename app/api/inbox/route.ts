import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ingestDb, memoryDb } from '@/lib/db';

const UNAUTHORIZED_RESPONSE = {
  error: 'Unauthorized',
  message: 'Invalid or missing API key. Please provide a valid Bearer token.',
};

function validateApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  
  // 사용자별 API 키 확인
  try {
    const result = db.prepare('SELECT userId FROM user_api_keys WHERE apiKey = ?').get(token) as { userId: string } | undefined;
    if (result) {
      return result.userId;
    }
  } catch (error) {
    console.error('Failed to validate API key:', error);
  }

  // Fallback: 기존 단일 API 키 (개발/테스트용)
  const expected = process.env.WORKLESS_API_KEY;
  if (expected && token === expected) {
    // 환경 변수에서 기본 사용자 ID 가져오기 (없으면 에러)
    const defaultUserId = process.env.DEFAULT_USER_ID || process.env.ADMIN_EMAIL;
    if (defaultUserId) {
      return defaultUserId;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const userId = validateApiKey(req);
  
  if (!userId) {
    return NextResponse.json(UNAUTHORIZED_RESPONSE, {
      status: 401,
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch (error) {
    console.warn('[Universal Send] invalid JSON payload', error);
    return NextResponse.json(
      { error: 'Bad Request', message: 'Malformed JSON body.' },
      { status: 400 }
    );
  }

  // 필수 필드 검증
  if (!payload.text || typeof payload.text !== 'string') {
    return NextResponse.json(
      { error: 'Bad Request', message: 'text field is required and must be a string' },
      { status: 400 }
    );
  }

  if (!payload.source || typeof payload.source !== 'string') {
    return NextResponse.json(
      { error: 'Bad Request', message: 'source field is required and must be a string' },
      { status: 400 }
    );
  }

  // 텍스트 길이 제한
  if (payload.text.length > 50000) {
    return NextResponse.json(
      { error: 'Payload Too Large', message: 'text field exceeds maximum length of 50000 characters' },
      { status: 413 }
    );
  }

  console.log('[Universal Send] inbox called', {
    userId,
    textLength: payload.text.length,
    source: payload.source,
    hasTitle: !!payload.title,
    hasDedupeKey: !!payload.dedupeKey,
    receivedAt: new Date().toISOString(),
  });

  try {
    // 중복 체크 (dedupeKey가 있는 경우)
    if (payload.dedupeKey) {
      const existing = memoryDb.getByDedupeKey(payload.dedupeKey, userId);
      if (existing) {
        return NextResponse.json({
          status: 'ok',
          cardId: existing.id,
          ingestId: existing.ingestId || existing.id,
          deduped: true,
          message: 'Content already exists',
        }, { status: 200 });
      }
    }

    // IngestItem 저장
    const ingest = ingestDb.create({
      userId,
      rawText: payload.text,
      rawMeta: payload.rawMeta || null,
      source: payload.source,
      sourceItemId: payload.sourceItemId || null,
      dedupeKey: payload.dedupeKey || null,
      createdAt: payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now(),
    });

    // Memory 카드 생성
    const memory = memoryDb.create(payload.text, userId, {
      title: payload.title || null,
      ingestId: ingest.id,
      source: payload.source,
      sourceLink: payload.url || null,
      dedupeKey: payload.dedupeKey || null,
    });

    return NextResponse.json({
      status: 'ok',
      cardId: memory.id,
      ingestId: ingest.id,
      deduped: false,
    }, { status: 201 });

  } catch (error) {
    console.error('[Universal Send] Failed to save:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method Not Allowed',
      message: 'Use POST /api/inbox',
    },
    {
      status: 405,
      headers: { Allow: 'POST, OPTIONS' },
    }
  );
}
