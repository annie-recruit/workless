import { NextRequest, NextResponse } from 'next/server';

/**
 * AssemblyAI 임시 스트리밍 토큰 발급
 * 브라우저에서 실시간 스트리밍에 사용
 * 
 * 보안: 임시 토큰을 사용하여 API 키 노출 방지
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AssemblyAI API key가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // AssemblyAI 임시 토큰 생성 API 호출 (Universal Streaming v3)
    // 문서에 따라 GET 요청 사용
    const url = new URL('https://streaming.assemblyai.com/v3/token');
    url.searchParams.append('expires_in_seconds', '600');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'authorization': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AssemblyAI Token] API 오류:', error);
      return NextResponse.json(
        { error: 'AssemblyAI 토큰 생성 실패' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 임시 토큰 반환
    return NextResponse.json({ 
      token: data.token,
      expires_at: data.expires_at,
    });
  } catch (error) {
    console.error('[AssemblyAI Token] 오류:', error);
    return NextResponse.json(
      { error: '토큰 발급 실패' },
      { status: 500 }
    );
  }
}
