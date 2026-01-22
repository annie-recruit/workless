import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

// API route에서 사용자 ID 가져오기
export async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('NEXTAUTH_SECRET이 설정되지 않았습니다');
      return null;
    }

    // NextAuth v4에서는 getToken을 사용하여 JWT 토큰에서 사용자 ID 가져오기
    const token = await getToken({ 
      req: req as any,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      console.log('No token found - user may not be logged in');
      return null;
    }
    
    if (!token.sub) {
      console.log('Token found but no sub field:', token);
      return null;
    }
    
    console.log('User ID retrieved:', token.sub);
    return token.sub as string;
  } catch (error) {
    console.error('Failed to get user ID:', error);
    return null;
  }
}
