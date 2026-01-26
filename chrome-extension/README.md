# 🗂️ Workless Web Clipper

Chrome Extension으로 어디서든 Workless에 텍스트를 저장하세요!

## ✨ 기능

- ✅ **우클릭으로 저장**: 텍스트 선택 → 우클릭 → "Workless에 저장"
- ✅ **자동 인증**: API 키 한 번만 입력
- ✅ **URL 자동 저장**: 페이지 URL과 제목도 함께 저장
- ✅ **알림**: 저장 성공/실패 알림
- ✅ **픽셀 디자인**: Workless 스타일 일관성

## 📦 설치 방법

### 1. Chrome에 로드하기

1. Chrome에서 `chrome://extensions/` 열기
2. 오른쪽 상단 **"개발자 모드"** 활성화
3. **"압축해제된 확장 프로그램을 로드합니다"** 클릭
4. 이 폴더(`chrome-extension`)선택

### 2. API 키 설정

1. 확장 프로그램 아이콘 클릭
2. "API 키 발급받기" 링크 클릭 → Workless 사이트에서 키 생성
3. 생성된 API 키 복사
4. 확장 프로그램 팝업에 붙여넣기 → "저장"

## 🚀 사용 방법

1. 웹페이지에서 텍스트 선택
2. 우클릭 → **"Workless에 저장"**
3. 알림 확인
4. Workless 사이트에서 확인!

## 🔧 개발 모드

`scripts/background.js`에서 `isDev`를 `true`로 변경하면 로컬 서버(`localhost:3000`)로 테스트 가능합니다.

```javascript
const isDev = true; // 개발 시
```

## 📁 파일 구조

```
chrome-extension/
├── manifest.json           # 확장 프로그램 설정
├── popup.html             # 팝업 UI
├── scripts/
│   ├── background.js      # 백그라운드 로직 (API 호출)
│   └── popup.js           # 팝업 스크립트
└── icons/                 # 아이콘들
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🎨 디자인

Workless의 주황(`#f97316`) + 인디고 컬러를 사용한 픽셀 디자인입니다.

## 🔒 보안

- API 키는 Chrome의 로컬 스토리지에 암호화되어 저장됩니다
- HTTPS 통신만 허용됩니다
- 선택한 텍스트만 전송됩니다

## 📝 라이선스

MIT
