import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { nextAuthOptions } from '@/lib/nextAuthOptions';
import db from '@/lib/db';
import crypto from 'crypto';

// API 키 생성
export async function POST(req: NextRequest) {
  const session = await getServerSession(nextAuthOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;

  try {
    // 기존 API 키 확인
    const existingKey = db.prepare('SELECT apiKey FROM user_api_keys WHERE userId = ?').get(userId) as { apiKey: string } | undefined;

    if (existingKey) {
      return NextResponse.json({ apiKey: existingKey.apiKey });
    }

    // 새 API 키 생성 (64자 hex)
    const apiKey = crypto.randomBytes(32).toString('hex');

    // DB에 저장
    db.prepare('INSERT INTO user_api_keys (userId, apiKey, createdAt) VALUES (?, ?, ?)').run(
      userId,
      apiKey,
      new Date().toISOString()
    );

    return NextResponse.json({ apiKey }, { status: 201 });
  } catch (error) {
    console.error('Failed to generate API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// API 키 조회
export async function GET(req: NextRequest) {
  const session = await getServerSession(nextAuthOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;

  try {
    const result = db.prepare('SELECT apiKey FROM user_api_keys WHERE userId = ?').get(userId) as { apiKey: string } | undefined;

    if (!result) {
      return NextResponse.json({ apiKey: null });
    }

    return NextResponse.json({ apiKey: result.apiKey });
  } catch (error) {
    console.error('Failed to fetch API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// API 키 재생성
export async function PUT(req: NextRequest) {
  const session = await getServerSession(nextAuthOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;

  try {
    // 새 API 키 생성
    const apiKey = crypto.randomBytes(32).toString('hex');

    // DB 업데이트
    db.prepare('UPDATE user_api_keys SET apiKey = ?, createdAt = ? WHERE userId = ?').run(
      apiKey,
      new Date().toISOString(),
      userId
    );

    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error('Failed to regenerate API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
