import { NextRequest, NextResponse } from 'next/server';

const UNAUTHORIZED_RESPONSE = {
  error: 'Unauthorized',
  message: 'Invalid or missing API key. Please provide a valid Bearer token.',
};

function validateApiKey(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7).trim();
  const expected = process.env.WORKLESS_API_KEY;
  if (!expected) {
    console.error('🚨 WORKLESS_API_KEY 환경 변수가 설정되지 않았습니다.');
    return false;
  }

  return token === expected;
}

export async function POST(req: NextRequest) {
  if (!validateApiKey(req)) {
    return NextResponse.json(UNAUTHORIZED_RESPONSE, {
      status: 401,
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch (error) {
    console.warn('[Universal Send] invalid JSON payload', error);
    return NextResponse.json(
      { error: 'Bad Request', message: 'Malformed JSON body.' },
      { status: 400 }
    );
  }

  console.log('[Universal Send] inbox called', {
    payload,
    receivedAt: new Date().toISOString(),
  });
  // TODO: Save raw payload to persistence store if needed.

  return NextResponse.json({ ok: true });
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
