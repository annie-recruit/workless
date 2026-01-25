import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

function safeEqualHex(a: string, b: string) {
  const aBuf = Buffer.from(a, 'hex');
  const bBuf = Buffer.from(b, 'hex');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function normalizeSignature(sig: string) {
  // allow: "sha256=<hex>" or just "<hex>" or multi-value "v1=<hex>,v0=<hex>"
  const trimmed = sig.trim();
  const parts = trimmed.split(/[, ]+/).map((p) => p.trim()).filter(Boolean);
  const candidates: string[] = [];

  for (const part of parts) {
    const v = part.includes('=') ? part.split('=')[1] : part;
    const cleaned = v?.replace(/^sha256=/i, '').trim();
    if (cleaned && /^[a-f0-9]+$/i.test(cleaned)) candidates.push(cleaned.toLowerCase());
  }

  return candidates;
}

function hmacHex(secret: string, data: string) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function verifySentryWebhookSignature(params: {
  secret: string;
  rawBody: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
}) {
  const { secret, rawBody, signatureHeader, timestampHeader } = params;
  if (!signatureHeader) return false;

  const signatures = normalizeSignature(signatureHeader);
  if (signatures.length === 0) return false;

  const bodySig = hmacHex(secret, rawBody);
  const timestamp = timestampHeader?.trim();
  const maybeTimestampedSig =
    timestamp && /^[0-9]+$/.test(timestamp) ? hmacHex(secret, `${timestamp}.${rawBody}`) : null;

  for (const sig of signatures) {
    if (safeEqualHex(sig, bodySig)) return true;
    if (maybeTimestampedSig && safeEqualHex(sig, maybeTimestampedSig)) return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  const signatureHeader = req.headers.get('sentry-hook-signature');
  const timestampHeader = req.headers.get('sentry-hook-timestamp');

  const rawBody = await req.text();

  // 시크릿이 설정된 경우에만 서명 검증(권장). 시크릿이 없으면 개발 환경에서만 허용.
  if (secret) {
    const ok = verifySentryWebhookSignature({
      secret,
      rawBody,
      signatureHeader,
      timestampHeader,
    });
    if (!ok) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'SENTRY_WEBHOOK_SECRET is required in production' },
      { status: 403 }
    );
  }

  let payload: unknown = rawBody;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // keep raw body
  }

  const logsDir = join(process.cwd(), 'logs', 'sentry');
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resource = req.headers.get('sentry-hook-resource') ?? 'unknown-resource';
  const filename = `sentry-webhook-${resource}-${timestamp}.json`;
  const filepath = join(logsDir, filename);

  const record = {
    receivedAt: new Date().toISOString(),
    resource,
    event: req.headers.get('sentry-hook-event') ?? undefined,
    id: req.headers.get('sentry-hook-id') ?? undefined,
    timestampHeader: timestampHeader ?? undefined,
    signaturePresent: Boolean(signatureHeader),
    payload,
  };

  writeFileSync(filepath, JSON.stringify(record, null, 2), 'utf-8');
  console.log(`✅ Sentry webhook 저장 완료: ${filepath}`);

  return NextResponse.json({ ok: true, saved: filename });
}

