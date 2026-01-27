import { NextRequest, NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { getUserId } from '@/lib/auth';

/**
 * DELETE: 사용자 계정 및 모든 데이터 삭제 (계정 탈퇴)
 * 법적 요구사항(개인정보보호법)에 따른 데이터 삭제 권리 보장
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // DB에서 해당 사용자의 모든 데이터 삭제
    userDb.deleteUser(userId);

    return NextResponse.json({ 
      success: true, 
      message: '계정 및 모든 데이터가 안전하게 삭제되었습니다.' 
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: '계정 삭제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
