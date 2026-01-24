import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * 브라우저 콘솔 로그를 서버로 전송받아 저장하는 API
 * 개발 환경에서만 동작합니다.
 */
export async function POST(req: NextRequest) {
  // 개발 환경에서만 동작
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: '프로덕션 환경에서는 사용할 수 없습니다.' },
      { status: 403 }
    );
  }

  try {
    const { logs } = await req.json();

    if (!Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'logs는 배열이어야 합니다.' },
        { status: 400 }
      );
    }

    // 로그 디렉토리 생성
    const logsDir = join(process.cwd(), 'logs', 'console');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    // 로그 파일 저장
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `console-logs-${timestamp}.json`;
    const filepath = join(logsDir, filename);

    const logData = {
      timestamp: new Date().toISOString(),
      count: logs.length,
      logs,
    };

    writeFileSync(filepath, JSON.stringify(logData, null, 2), 'utf-8');

    console.log(`✅ 콘솔 로그 저장 완료: ${filepath} (${logs.length}개)`);

    return NextResponse.json({
      success: true,
      message: `로그가 저장되었습니다: ${filename}`,
      count: logs.length,
      filepath,
    });
  } catch (error) {
    console.error('❌ 콘솔 로그 저장 실패:', error);
    return NextResponse.json(
      {
        error: '로그 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
