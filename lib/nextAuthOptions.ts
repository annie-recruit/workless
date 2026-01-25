import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { userDb } from '@/lib/db';

const getBaseUrl = () => {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.NODE_ENV === 'development') {
    return process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
  }
  throw new Error('NEXTAUTH_URL 환경 변수가 설정되지 않았습니다.');
};

const baseUrl = getBaseUrl();

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️ Google OAuth 환경 변수가 설정되지 않았습니다. GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET을 설정해주세요.');
}

console.log('📌 NEXTAUTH_URL:', baseUrl);
console.log('📌 예상 리디렉션 URI:', `${baseUrl}/api/auth/callback/google`);

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
        const userId = account.providerAccountId || user.id || user.email || '';
        userDb.upsert(
          userId,
          user.email || '',
          user.name || undefined,
          user.image || undefined
        );

        if (account.access_token) {
          userDb.updateTokens(
            userId,
            account.access_token,
            account.refresh_token || undefined,
            account.expires_at ? account.expires_at * 1000 : undefined
          );
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
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
        (session.user as any).id = token.sub;
      }
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
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
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
