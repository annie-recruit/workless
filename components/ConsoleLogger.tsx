'use client';

import { useEffect } from 'react';

/**
 * 브라우저 콘솔 로그를 자동으로 수집하는 컴포넌트
 * 개발 환경에서만 활성화되며, 콘솔 로그를 파일로 다운로드하거나 서버로 전송할 수 있습니다.
 */
export default function ConsoleLogger() {
  useEffect(() => {
    // 개발 환경에서만 활성화
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const logs: Array<{
      timestamp: string;
      level: string;
      message: string;
      isMinimap: boolean;
      args: any[];
    }> = [];

    // 원본 console 메서드 저장
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    // 로그 수집 함수
    const collectLog = (level: string, ...args: any[]) => {
      const timestamp = new Date().toISOString();
      const message = args
        .map((arg) => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      // 미니맵 관련 로그인지 확인
      const isMinimapLog = message.includes('Minimap') || 
                           message.includes('minimap') ||
                           message.includes('Scale Calculation') ||
                           message.includes('DOM Actual Size') ||
                           message.includes('Blob Debug') ||
                           message.includes('Symbol Debug') ||
                           message.includes('canvasBounds') ||
                           message.includes('viewportBounds') ||
                           message.includes('symbolItems');

      const logEntry = {
        timestamp,
        level,
        message,
        isMinimap: isMinimapLog,
        args: args.map((arg) => {
          // 순환 참조 방지
          try {
            return JSON.parse(JSON.stringify(arg));
          } catch {
            return String(arg);
          }
        }),
      };

      logs.push(logEntry);

      // 최대 1000개까지만 저장 (메모리 절약)
      if (logs.length > 1000) {
        logs.shift();
      }
    };

    // console 메서드 오버라이드
    console.log = (...args: any[]) => {
      collectLog('log', ...args);
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      collectLog('error', ...args);
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      collectLog('warn', ...args);
      originalWarn.apply(console, args);
    };

    console.info = (...args: any[]) => {
      collectLog('info', ...args);
      originalInfo.apply(console, args);
    };

    console.debug = (...args: any[]) => {
      collectLog('debug', ...args);
      originalDebug.apply(console, args);
    };

    // 전역 함수로 로그 다운로드 기능 추가
    (window as any).downloadConsoleLogs = () => {
      const logText = logs
        .map(
          (log) =>
            `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
        )
        .join('\n');

      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `console-logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ 콘솔 로그 다운로드 완료:', logs.length, '개');
    };

    // 전역 함수로 로그 서버 전송 기능 추가
    (window as any).sendConsoleLogsToServer = async () => {
      try {
        const response = await fetch('/api/console-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logs }),
        });

        if (response.ok) {
          console.log('✅ 콘솔 로그 서버 전송 완료:', logs.length, '개');
        } else {
          console.error('❌ 콘솔 로그 서버 전송 실패');
        }
      } catch (error) {
        console.error('❌ 콘솔 로그 서버 전송 오류:', error);
      }
    };

    // 전역 함수로 로그 확인 기능 추가
    (window as any).getConsoleLogs = () => {
      console.log('📋 수집된 콘솔 로그:', logs);
      return logs;
    };

    // 전역 함수로 미니맵 관련 로그만 확인
    (window as any).getMinimapLogs = () => {
      const minimapLogs = logs.filter(log => log.isMinimap);
      console.log('🗺️ 미니맵 관련 로그:', minimapLogs.length, '개');
      console.table(minimapLogs.slice(-20)); // 최근 20개만 테이블로 표시
      return minimapLogs;
    };

    // 전역 함수로 미니맵 로그만 다운로드
    (window as any).downloadMinimapLogs = () => {
      const minimapLogs = logs.filter(log => log.isMinimap);
      const logText = minimapLogs
        .map(
          (log) =>
            `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
        )
        .join('\n');

      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minimap-logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ 미니맵 로그 다운로드 완료:', minimapLogs.length, '개');
    };

    // 키보드 단축키로 로그 다운로드 (Ctrl+Shift+L)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        (window as any).downloadConsoleLogs();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // 초기 안내 메시지
    console.log('🔍 콘솔 로그 자동 수집 활성화됨');
    console.log('💡 사용법:');
    console.log('   - downloadConsoleLogs() : 로그를 파일로 다운로드');
    console.log('   - sendConsoleLogsToServer() : 로그를 서버로 전송');
    console.log('   - getConsoleLogs() : 수집된 로그 확인');
    console.log('   - getMinimapLogs() : 미니맵 관련 로그만 확인');
    console.log('   - downloadMinimapLogs() : 미니맵 로그만 다운로드');
    console.log('   - Ctrl+Shift+L : 로그 다운로드 단축키');

    // 정리 함수
    return () => {
      // 원본 console 메서드 복원
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      console.debug = originalDebug;

      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
