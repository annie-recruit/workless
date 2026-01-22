import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { userDb } from '@/lib/db';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️ Google OAuth 환경 변수가 설정되지 않았습니다. GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET을 설정해주세요.');
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        // 사용자 정보를 데이터베이스에 저장
        const userId = account.providerAccountId || user.id || user.email || '';
        userDb.upsert(
          userId,
          user.email,
          user.name || undefined,
          user.image || undefined
        );
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // 초기 로그인 시 사용자 정보를 토큰에 저장
      if (user) {
        token.id = user.id;
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
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
