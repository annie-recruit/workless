import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function monitorMinimapAfterLogin() {
  const browser = await puppeteer.launch({
    headless: false, // 브라우저를 보이게 해서 로그인 가능하게
    defaultViewport: { width: 1920, height: 1080 },
  });

  try {
    const page = await browser.newPage();
    
    // 콘솔 로그 수집
    const logs: Array<{
      timestamp: string;
      type: string;
      message: string;
      args?: any[];
    }> = [];

    page.on('console', (msg) => {
      const text = msg.text();
      logs.push({
        timestamp: new Date().toISOString(),
        type: msg.type(),
        message: text,
        args: msg.args().map(arg => arg.toString()),
      });
    });

    page.on('pageerror', (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logs.push({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: err.message,
      });
    });

    // 로그인 페이지로 이동
    console.log('로그인 페이지로 이동 중...');
    await page.goto('http://localhost:3000/auth/signin', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    
    // 페이지가 완전히 로드될 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 페이지가 로드되었는지 확인
    console.log('페이지 로드 확인 중...');
    await page.waitForSelector('button', { timeout: 10000 });
    
    // 페이지의 모든 버튼 텍스트 확인
    const buttonTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(btn => btn.textContent?.trim());
    });
    console.log('발견된 버튼들:', buttonTexts);
    
    // "Google로 로그인" 버튼이 있는지 확인
    const hasGoogleButton = buttonTexts.some(text => text?.includes('Google') || text?.includes('로그인'));
    if (hasGoogleButton) {
      console.log('✅ 로그인 버튼을 찾았습니다!');
    } else {
      console.log('⚠️ 로그인 버튼을 찾지 못했습니다. 페이지를 확인하세요.');
    }

    console.log('⚠️ 수동으로 Google 로그인을 완료해주세요.');
    console.log('⚠️ 로그인 후 미니맵이 표시될 때까지 기다린 후, 브라우저를 닫지 마세요.');
    console.log('⚠️ 미니맵이 표시되면 이 스크립트가 자동으로 로그를 수집합니다.');
    
    // 미니맵이 나타날 때까지 대기 (Minimap 텍스트 또는 미니맵 관련 요소 찾기)
    console.log('미니맵이 나타날 때까지 대기 중...');
    
    try {
      // 미니맵이 나타나는지 확인 (여러 방법 시도)
      await page.waitForFunction(
        () => {
          // Minimap 텍스트가 있거나, 미니맵 관련 클래스가 있는지 확인
          const minimapText = Array.from(document.querySelectorAll('*')).some(
            el => el.textContent?.includes('Minimap') || el.textContent?.includes('미니맵')
          );
          const minimapElement = document.querySelector('[class*="bg-gray-50"]') || 
                                document.querySelector('canvas') ||
                                document.querySelector('[class*="minimap"]');
          return minimapText || !!minimapElement;
        },
        { timeout: 120000 } // 2분 대기
      );

      console.log('✅ 미니맵이 감지되었습니다!');
      
      // 추가로 5초 대기하여 모든 로그 수집
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 미니맵 관련 로그만 필터링
      const minimapLogs = logs.filter(log => {
        const message = log.message.toLowerCase();
        return (
          message.includes('minimap') ||
          message.includes('viewport') ||
          message.includes('canvasbounds') ||
          message.includes('viewportsymbol') ||
          message.includes('memory symbol') ||
          message.includes('centerx') ||
          message.includes('centery') ||
          message.includes('scale') ||
          message.includes('offsetx') ||
          message.includes('offsety')
        );
      });

      // 로그 저장
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFile = path.join(logsDir, `minimap-logs-${timestamp}.json`);
      
      fs.writeFileSync(
        logFile,
        JSON.stringify(
          {
            totalLogs: logs.length,
            minimapLogs: minimapLogs.length,
            allLogs: logs,
            minimapOnlyLogs: minimapLogs,
          },
          null,
          2
        )
      );

      console.log(`\n✅ 로그 수집 완료!`);
      console.log(`📁 총 로그: ${logs.length}개`);
      console.log(`🗺️  미니맵 관련 로그: ${minimapLogs.length}개`);
      console.log(`💾 저장 위치: ${logFile}`);

      // 미니맵 관련 로그만 콘솔에 출력
      console.log('\n=== 미니맵 관련 로그 ===');
      minimapLogs.slice(-20).forEach(log => {
        console.log(`[${log.type}] ${log.message}`);
      });

    } catch (error) {
      console.error('❌ 미니맵을 찾을 수 없습니다:', error);
      console.log('\n수집된 모든 로그:');
      logs.slice(-50).forEach(log => {
        console.log(`[${log.type}] ${log.message}`);
      });
    }

    // 사용자가 확인할 수 있도록 잠시 대기
    console.log('\n⚠️ 브라우저를 닫으려면 Enter를 누르세요...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await browser.close();
  }
}

monitorMinimapAfterLogin().catch(console.error);
