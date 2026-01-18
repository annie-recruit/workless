# Workless - 개인 비서

알아서 정리해주는 개인 비서 앱

> ⚠️ **라이선스**: 개인 사용만 허용. 상업적 사용, 재배포, 코드 복사 금지. 자세한 내용은 [LICENSE](LICENSE) 참고.

## 🚀 로컬 실행

```bash
npm install
npm run dev
```

## 📱 PWA 아이콘 생성

1. 브라우저에서 `http://localhost:3000/generate-icons.html` 열기
2. 자동으로 `icon-192.png`와 `icon-512.png` 다운로드됨
3. 다운로드된 파일들을 `public/` 폴더로 이동

## 🌐 배포 (Vercel)

1. GitHub 리포지토리 생성 및 푸시
2. [Vercel](https://vercel.com) 접속
3. GitHub 리포지토리 연결
4. 자동 배포!

## 📲 PWA 설치 방법

### iOS (Safari)
1. 배포된 사이트 접속
2. 공유 버튼 → "홈 화면에 추가"

### Android (Chrome)
1. 배포된 사이트 접속
2. 메뉴 → "앱 설치" 또는 "홈 화면에 추가"

## 🔑 환경 변수

`.env.local` 파일 생성:
```
OPENAI_API_KEY=your_api_key_here
```

Vercel 배포 시에는 Vercel 대시보드에서 환경 변수 설정!
