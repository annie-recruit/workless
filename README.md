# 🚀 Workless - AI 기반 개인 비서 플랫폼

> **알아서 정리해주는 개인 비서 앱**  
> AI를 활용한 지능형 메모리 관리 및 캔버스 기반 워크스페이스

![Workless](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=for-the-badge&logo=tailwind-css)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT-412991?style=for-the-badge&logo=openai)

## 📖 프로젝트 소개

**Workless**는 AI를 활용하여 개인의 메모리, 아이디어, 할 일을 자동으로 정리하고 연결해주는 개인 비서 플랫폼입니다. 무한 캔버스 기반의 직관적인 인터페이스로 복잡한 정보를 시각적으로 관리할 수 있습니다.

### ✨ 핵심 가치
- **자동 정리**: AI가 메모리를 분석하고 자동으로 그룹화
- **시각적 관리**: 드래그 앤 드롭으로 자유롭게 배치하는 캔버스
- **지능형 연결**: 관련된 메모리들을 자동으로 연결하여 관계 파악
- **다양한 위젯**: 캘린더, 데이터베이스, 뷰어 등 다양한 블록 타입 지원

## 🎯 주요 기능

### 1. 📝 지능형 메모리 관리
- **AI 기반 자동 분류**: 메모리 내용을 분석하여 자동으로 그룹화
- **연결 제안**: AI가 관련된 메모리들을 찾아 연결 제안
- **페르소나 시스템**: 다양한 AI 페르소나로 맞춤형 응답 제공
- **태그 및 멘션**: `@` 태그로 메모리 간 연결

### 2. 🎨 무한 캔버스 보드
- **드래그 앤 드롭**: 메모리 카드를 자유롭게 배치
- **다중 선택**: 여러 카드를 한 번에 선택 및 이동
- **줌 & 팬**: 확대/축소 및 이동으로 넓은 공간 활용
- **연결선 시각화**: 관련 메모리 간 관계를 선으로 표시

### 3. 📅 다양한 위젯 블록
- **캘린더 블록**: 월/주/일 뷰로 일정 관리
- **데이터베이스 블록**: 테이블 형태로 데이터 관리
- **뷰어 블록**: PDF, DOCX 파일 미리보기
- **회의록 블록**: 음성 녹음 및 자동 전사

### 4. 🤖 AI 인사이트
- **자동 요약**: 메모리 내용을 자동으로 요약
- **목표 추적**: 설정한 목표의 진행 상황 추적
- **인사이트 패널**: 통계 및 분석 정보 제공

### 5. 📱 PWA 지원
- **오프라인 지원**: 서비스 워커를 통한 오프라인 기능
- **홈 화면 설치**: 모바일 앱처럼 설치 가능
- **반응형 디자인**: 모든 디바이스에서 최적화된 경험

## 🛠️ 기술 스택

### Frontend
- **Next.js 16.1** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS 4.0** - 유틸리티 퍼스트 CSS
- **React 19** - 최신 React 기능 활용

### Backend
- **Next.js API Routes** - 서버리스 API
- **Better SQLite3** - 경량 데이터베이스
- **NextAuth.js** - 인증 시스템 (Google OAuth)

### AI & 외부 서비스
- **OpenAI GPT** - 메모리 분석, 요약, 그룹화
- **OpenAI Whisper** - 음성 전사

### 기타
- **PWA** - Progressive Web App 지원
- **PDF.js** - PDF 렌더링
- **Mammoth** - DOCX 파싱

## 🎨 디자인 시스템

- **키 컬러**: 주황(Orange) + 인디고(Indigo)
- **디자인 철학**: 직선과 명확한 테두리를 활용한 카툰 스타일
- **UI 특징**: 둥근 모서리 최소화, 명확한 경계선, 직관적인 인터랙션

## 🚀 시작하기

### 사전 요구사항
- Node.js 18+ 
- npm 또는 yarn
- OpenAI API 키

### 설치 및 실행

1. **저장소 클론**
```bash
git clone https://github.com/annie-recruit/workless.git
cd workless
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
`.env.local` 파일 생성:
```env
OPENAI_API_KEY=your_openai_api_key_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

4. **개발 서버 실행**
```bash
npm run dev
```

5. **브라우저에서 확인**
```
http://localhost:3000
```

## 📦 빌드 및 배포

### 프로덕션 빌드
```bash
npm run build
npm start
```

### Railway 배포
1. GitHub 리포지토리 연결
2. 환경 변수 설정
3. 자동 배포 완료!

### PWA 아이콘 생성
1. 브라우저에서 `http://localhost:3000/generate-icons.html` 열기
2. 자동으로 `icon-192.png`와 `icon-512.png` 다운로드됨
3. 다운로드된 파일들을 `public/` 폴더로 이동

### PWA 설치 방법

#### iOS (Safari)
1. 배포된 사이트 접속
2. 공유 버튼 → "홈 화면에 추가"

#### Android (Chrome)
1. 배포된 사이트 접속
2. 메뉴 → "앱 설치" 또는 "홈 화면에 추가"

## 🌐 라이브 데모

[여기서](https://workless-production.up.railway.app/auth/signin) 구글 로그인 후 체험해 보세요. :)

## 📸 주요 화면

### 메인 보드
- 무한 캔버스에서 메모리 카드 자유 배치
- 드래그 앤 드롭으로 직관적인 관리
- 연결선으로 관계 시각화

### 메모리 입력
- 리치 텍스트 에디터
- 파일 첨부 (이미지, PDF, 문서)
- 음성 녹음 및 자동 전사
- AI 연결 제안

### 위젯 블록
- 캘린더: 일정 관리
- 데이터베이스: 테이블 형태 데이터 관리
- 뷰어: 문서 미리보기

## 🔐 인증

Google OAuth를 통한 소셜 로그인 지원

## 📄 라이선스

⚠️ **개인 사용만 허용**  
상업적 사용, 재배포, 코드 복사 금지. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

## 🤝 기여

이 프로젝트는 개인 프로젝트입니다. 포트폴리오 목적으로 공개되어 있습니다.

## 📧 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 등록해주세요.

---

**Made with ❤️ using Next.js, TypeScript, and OpenAI**
