#!/usr/bin/env tsx

/**
 * Puppeteer를 사용하여 브라우저 콘솔 로그를 자동으로 모니터링하는 스크립트
 * 
 * 사용법:
 *   npm run monitor:console -- http://localhost:3000
 *   npm run monitor:console -- https://workless.app --timeout 60000
 */

import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface ConsoleLog {
  timestamp: string;
  type: string;
  text: string;
  location?: {
    url: string;
    lineNumber?: number;
    columnNumber?: number;
  };
}

async function monitorConsole(url: string, options: {
  timeout?: number;
  output?: string;
  headless?: boolean;
}) {
  const { timeout = 30000, output, headless = true } = options;

  console.log(`🚀 브라우저 콘솔 모니터링 시작: ${url}`);
  console.log(`⏱️  타임아웃: ${timeout}ms`);
  console.log(`👁️  헤드리스 모드: ${headless ? 'ON' : 'OFF'}`);

  const logs: ConsoleLog[] = [];
  const errors: ConsoleLog[] = [];
  const warnings: ConsoleLog[] = [];

  const browser = await puppeteer.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // 콘솔 메시지 수집
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();

      const logEntry: ConsoleLog = {
        timestamp: new Date().toISOString(),
        type,
        text,
        location: location
          ? {
              url: location.url || '',
              lineNumber: location.lineNumber,
              columnNumber: location.columnNumber,
            }
          : undefined,
      };

      logs.push(logEntry);

      // 타입별 분류
      if (type === 'error') {
        errors.push(logEntry);
        console.error(`❌ [${type.toUpperCase()}] ${text}`);
      } else if (type === 'warn') {
        warnings.push(logEntry);
        console.warn(`⚠️  [${type.toUpperCase()}] ${text}`);
      } else {
        console.log(`📝 [${type.toUpperCase()}] ${text}`);
      }
    });

    // 페이지 에러 수집
    page.on('pageerror', (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      const logEntry: ConsoleLog = {
        timestamp: new Date().toISOString(),
        type: 'pageerror',
        text: err.message,
        location: {
          url: err.stack || '',
        },
      };

      errors.push(logEntry);
      logs.push(logEntry);
      console.error(`💥 [PAGE ERROR] ${err.message}`);
    });

    // 요청 실패 수집
    page.on('requestfailed', (request) => {
      const logEntry: ConsoleLog = {
        timestamp: new Date().toISOString(),
        type: 'requestfailed',
        text: `Request failed: ${request.method()} ${request.url()}`,
        location: {
          url: request.url(),
        },
      };

      errors.push(logEntry);
      logs.push(logEntry);
      console.error(`🔴 [REQUEST FAILED] ${request.method()} ${request.url()}`);
    });

    // 페이지 로드
    console.log(`📄 페이지 로드 중: ${url}`);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    console.log(`✅ 페이지 로드 완료`);
    console.log(`📊 수집된 로그: 총 ${logs.length}개 (에러: ${errors.length}개, 경고: ${warnings.length}개)`);

    // 추가 대기 시간 (동적 콘텐츠 로딩 대기)
    console.log(`⏳ 추가 대기 중... (5초)`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 최종 통계
    console.log(`\n📈 최종 통계:`);
    console.log(`   총 로그: ${logs.length}개`);
    console.log(`   에러: ${errors.length}개`);
    console.log(`   경고: ${warnings.length}개`);
    console.log(`   정보: ${logs.length - errors.length - warnings.length}개`);

    // 로그 저장
    if (output || logs.length > 0) {
      const logsDir = join(process.cwd(), 'logs', 'monitor');
      if (!existsSync(logsDir)) {
        mkdirSync(logsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = output || `monitor-${timestamp}.json`;
      const filepath = join(logsDir, filename);

      const report = {
        url,
        timestamp: new Date().toISOString(),
        summary: {
          total: logs.length,
          errors: errors.length,
          warnings: warnings.length,
          info: logs.length - errors.length - warnings.length,
        },
        logs,
        errors,
        warnings,
      };

      writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`\n💾 로그 저장 완료: ${filepath}`);
    }

    // 에러가 있으면 종료 코드 1 반환
    if (errors.length > 0) {
      console.log(`\n⚠️  에러가 ${errors.length}개 발견되었습니다.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 모니터링 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// 명령줄 인자 파싱
const args = process.argv.slice(2);
const url = args[0];

if (!url) {
  console.error('❌ 사용법: npm run monitor:console -- <URL> [--timeout <ms>] [--output <filename>] [--no-headless]');
  process.exit(1);
}

const options: {
  timeout?: number;
  output?: string;
  headless?: boolean;
} = {};

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--timeout' && args[i + 1]) {
    options.timeout = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    options.output = args[i + 1];
    i++;
  } else if (args[i] === '--no-headless') {
    options.headless = false;
  }
}

monitorConsole(url, options).catch((error) => {
  console.error('❌ 스크립트 실행 실패:', error);
  process.exit(1);
});
