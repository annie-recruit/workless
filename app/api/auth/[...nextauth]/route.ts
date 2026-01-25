import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { userDb } from '@/lib/db';

// 개발 환경에서 NEXTAUTH_URL 자동 감지
const getBaseUrl = () => {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  // 개발 환경에서 자동 감지
  if (process.env.NODE_ENV === 'development') {
    return process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
  }
  // 프로덕션 환경에서는 필수
  throw new Error('NEXTAUTH_URL 환경 변수가 설정되지 않았습니다.');
};

const baseUrl = getBaseUrl();

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️ Google OAuth 환경 변수가 설정되지 않았습니다. GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET을 설정해주세요.');
}

// 디버깅: NEXTAUTH_URL 확인
console.log('📌 NEXTAUTH_URL:', baseUrl);
console.log('📌 예상 리디렉션 URI:', `${baseUrl}/api/auth/callback/google`);

// NEXTAUTH_SECRET 확인
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('⚠️ NEXTAUTH_SECRET이 설정되지 않았습니다. 개발 환경에서는 기본값을 사용합니다.');
  console.warn('⚠️ 프로덕션 환경에서는 반드시 NEXTAUTH_SECRET을 설정해주세요.');
}

export const nextAuthOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        // 사용자 정보를 데이터베이스에 저장
        const userId = account.providerAccountId || user.id || user.email || '';
        userDb.upsert(
          userId,
          user.email || '',
          user.name || undefined,
          user.image || undefined
        );

        // 토큰 저장 (Gmail API 사용을 위함)
        if (account.access_token) {
          userDb.updateTokens(
            userId,
            account.access_token,
            account.refresh_token || undefined,
            account.expires_at ? account.expires_at * 1000 : undefined // NextAuth expires_at is seconds
          );
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // 초기 로그인 시 사용자 정보를 토큰에 저장
      if (user) {
        // NextAuth는 sub를 사용자 식별자로 사용하므로 명시적으로 설정
        const userId = account?.providerAccountId || user.id || user.email || '';
        token.sub = userId;
        token.id = userId;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // 세션에 사용자 ID 추가
        (session.user as any).id = token.sub;
      }
      // 토큰에서 이미지 정보를 세션에 추가
      if (token.picture && session.user) {
        session.user.image = token.picture as string;
      }
      if (token.name && session.user) {
        session.user.name = token.name as string;
      }
      if (token.email && session.user) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'development-secret-key-change-in-production' : undefined),
  // 세션 쿠키 설정
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  // 쿠키 설정 (프로덕션 환경에서 보안 강화)
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

const handler = NextAuth(nextAuthOptions);

export { handler as GET, handler as POST };
