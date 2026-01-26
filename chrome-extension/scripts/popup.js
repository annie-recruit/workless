// Workless Web Clipper - Popup Script

const apiKeyInput = document.getElementById('apiKeyInput');
const saveButton = document.getElementById('saveButton');
const disconnectButton = document.getElementById('disconnectButton');
const setupForm = document.getElementById('setupForm');
const connectedView = document.getElementById('connectedView');
const statusConnected = document.getElementById('statusConnected');
const statusDisconnected = document.getElementById('statusDisconnected');

// 초기 로드
async function init() {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  
  if (apiKey) {
    showConnected();
  } else {
    showDisconnected();
  }
}

function showConnected() {
  setupForm.classList.add('hidden');
  connectedView.classList.remove('hidden');
  statusConnected.classList.remove('hidden');
  statusDisconnected.classList.add('hidden');
}

function showDisconnected() {
  setupForm.classList.remove('hidden');
  connectedView.classList.add('hidden');
  statusConnected.classList.add('hidden');
  statusDisconnected.classList.remove('hidden');
}

// API 키 저장
saveButton.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    alert('API 키를 입력해주세요');
    return;
  }
  
  saveButton.disabled = true;
  saveButton.textContent = '저장 중...';
  
  try {
    // API 키 테스트
    const response = await fetch('https://workless-production.up.railway.app/api/inbox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        text: 'Workless Web Clipper 연결 테스트',
        source: 'chrome-extension',
        dedupeKey: `test-${Date.now()}`
      })
    });
    
    if (!response.ok) {
      throw new Error('유효하지 않은 API 키입니다');
    }
    
    // 저장
    await chrome.storage.local.set({ apiKey });
    
    showConnected();
    apiKeyInput.value = '';
    
  } catch (error) {
    alert(error.message || '연결에 실패했습니다');
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = '저장';
  }
});

// 연결 해제
disconnectButton.addEventListener('click', async () => {
  if (confirm('정말 연결을 해제하시겠습니까?')) {
    await chrome.storage.local.remove('apiKey');
    showDisconnected();
  }
});

// Enter 키로 저장
apiKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveButton.click();
  }
});

// 초기화
init();
