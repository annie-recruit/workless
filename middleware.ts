import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host');

  // 레일웨이 기본 도메인(*.railway.app)으로 접속한 경우 workless.me으로 리다이렉트
  if (host && host.includes('railway.app')) {
    url.host = 'workless.me';
    url.protocol = 'https';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 요청 경로에 대해 미들웨어 실행:
     * - api (API 라우트)
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘 파일)
     * - robots.txt, sitemap.xml 등 정적 자산
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.png|.*\\.svg).*)',
  ],
};
