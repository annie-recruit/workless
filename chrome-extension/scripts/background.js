// Workless Web Clipper - Background Script

const API_URL = 'https://workless-production.up.railway.app/api/inbox';
const DEV_URL = 'http://localhost:3000/api/inbox';

// 개발 환경 감지
const isDev = false; // 배포 시 false로 변경
const ENDPOINT = isDev ? DEV_URL : API_URL;

// 우클릭 메뉴 생성
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-workless',
    title: 'Workless에 저장',
    contexts: ['selection']
  });
  
  console.log('✅ Workless Web Clipper installed!');
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-workless') {
    const selectedText = info.selectionText;
    const pageUrl = tab.url;
    const pageTitle = tab.title;
    
    console.log('📝 Saving to Workless:', {
      text: selectedText?.substring(0, 50) + '...',
      url: pageUrl
    });
    
    try {
      // API 키 확인
      const { apiKey } = await chrome.storage.local.get('apiKey');
      
      if (!apiKey) {
        // API 키가 없으면 알림 표시
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'API 키가 필요합니다',
          message: '확장 프로그램 아이콘을 클릭하여 API 키를 설정해주세요',
          priority: 2
        });
        return;
      }
      
      // Workless에 저장
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          text: selectedText,
          source: 'chrome-extension',
          title: pageTitle,
          url: pageUrl,
          dedupeKey: `chrome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Saved:', result);
      
      // 성공 알림
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Workless에 저장됨',
        message: selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : ''),
        priority: 1
      });
      
    } catch (error) {
      console.error('❌ Failed to save:', error);
      
      // 에러 알림
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: '저장 실패',
        message: error.message || '다시 시도해주세요',
        priority: 2
      });
    }
  }
});
