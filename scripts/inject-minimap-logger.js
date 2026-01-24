// 브라우저 콘솔에 직접 붙여넣어 실행하세요

(function() {
  const logs = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const collectLog = (level, ...args) => {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    const isMinimapLog = 
      message.includes('Minimap') || 
      message.includes('minimap') ||
      message.includes('canvasBounds') ||
      message.includes('viewportBounds') ||
      message.includes('symbolItems') ||
      message.includes('viewportRect') ||
      message.includes('centerX') ||
      message.includes('centerY') ||
      message.includes('offsetX') ||
      message.includes('offsetY') ||
      message.includes('scale');

    logs.push({
      timestamp,
      level,
      message,
      isMinimap: isMinimapLog,
      args: args
    });

    if (logs.length > 1000) {
      logs.shift();
    }
  };

  console.log = (...args) => {
    collectLog('log', ...args);
    originalLog.apply(console, args);
  };

  console.error = (...args) => {
    collectLog('error', ...args);
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    collectLog('warn', ...args);
    originalWarn.apply(console, args);
  };

  window.getMinimapLogs = () => {
    const minimapLogs = logs.filter(log => log.isMinimap);
    console.log('🗺️ 미니맵 관련 로그:', minimapLogs.length, '개');
    if (minimapLogs.length > 0) {
      console.table(minimapLogs.slice(-20));
    }
    return minimapLogs;
  };

  window.downloadMinimapLogs = () => {
    const minimapLogs = logs.filter(log => log.isMinimap);
    const logText = minimapLogs
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
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

  console.log('✅ 미니맵 로그 수집 함수 등록 완료!');
})();
