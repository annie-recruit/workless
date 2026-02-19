/**
 * API 라우트 인증 미들웨어 래퍼
 *
 * 30개 이상의 API 라우트에서 반복되는
 * getUserId + 401 응답 패턴을 하나의 함수로 캡슐화합니다.
 *
 * @example
 * export const GET = withAuth(async (req, userId) => {
 *   const data = someDb.getAll(userId);
 *   return NextResponse.json({ data });
 * });
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from './auth';

type AuthenticatedHandler = (
  req: NextRequest,
  userId: string
) => Promise<NextResponse>;

/** 인증이 필요한 API 핸들러를 감싸는 래퍼 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest) => {
    try {
      const userId = await getUserId(req);
      if (!userId) {
        return NextResponse.json(
          { error: '로그인이 필요합니다' },
          { status: 401 }
        );
      }
      return await handler(req, userId);
    } catch (error) {
      console.error(`[API] ${req.method} ${req.nextUrl.pathname} error:`, error);
      return NextResponse.json(
        { error: '서버 오류가 발생했습니다' },
        { status: 500 }
      );
    }
  };
}
