# 🗺️ Workless - 사고의 흐름을 보는 비정형 워크스페이스

> **큰 도화지에 마음대로 위젯과 기록들을 펼쳐놓고 연결하는 비정형 워크스페이스**  
> 생각과 아이디어의 흐름을 시각적으로 탐색하고 연결하는 지도

![Workless](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=for-the-badge&logo=tailwind-css)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT-412991?style=for-the-badge&logo=openai)

## 📖 프로젝트 소개

**Workless**는 생각과 아이디어를 자유롭게 펼쳐놓고 연결할 수 있는 비정형 워크스페이스입니다. 전통적인 폴더 구조나 계층적 조직 없이, 무한 캔버스 위에서 메모리, 위젯, 아이디어를 자유롭게 배치하고 AI가 자동으로 연결 관계를 찾아줍니다.

### ✨ 핵심 철학
- **비정형 구조**: 폴더나 계층 없이 자유로운 배치
- **시각적 연결**: 생각과 아이디어 간의 관계를 선으로 시각화
- **AI 기반 발견**: 숨겨진 연결과 패턴을 AI가 자동으로 발견
- **무한 캔버스**: 제한 없는 공간에서 사고를 확장

## 🎯 주요 기능

### 1. 🗺️ 무한 캔버스 보드
- **자유로운 배치**: 메모리와 위젯을 마음대로 배치하는 큰 도화지
- **드래그 앤 드롭**: 직관적인 인터페이스로 자유롭게 이동
- **다중 선택**: 여러 요소를 한 번에 선택 및 이동
- **줌 & 팬**: 확대/축소로 넓은 사고 공간 탐색
- **연결선 시각화**: 관련된 생각들 간의 관계를 선으로 표시

### 2. 🔗 지능형 연결 발견
- **AI 기반 연결 제안**: AI가 관련된 메모리들을 찾아 연결 제안
- **자동 그룹화**: 비슷한 주제나 아이디어를 자동으로 그룹화
- **관계 네트워크**: 메모리 간의 연결 관계를 네트워크로 시각화
- **태그 및 멘션**: `@` 태그로 메모리 간 명시적 연결

### 3. 📝 다양한 기록 타입
- **메모리 카드**: 텍스트, 이미지, 파일을 담은 자유로운 메모
- **리치 에디터**: 서식 있는 텍스트 편집
- **파일 첨부**: 이미지, PDF, 문서 등 다양한 파일 지원
- **음성 녹음**: 회의나 아이디어를 음성으로 기록하고 자동 전사

### 4. 🧩 다양한 위젯 블록
- **캘린더 블록**: 시간축으로 생각과 일정을 배치
- **데이터베이스 블록**: 구조화된 데이터를 테이블 형태로 관리
- **뷰어 블록**: PDF, DOCX 파일을 캔버스에서 바로 미리보기
- **회의록 블록**: 음성 녹음 및 자동 전사된 회의록

### 5. 🤖 AI 인사이트
- **자동 요약**: 메모리 내용을 자동으로 요약하여 핵심 파악
- **패턴 발견**: 반복되는 주제나 트렌드 자동 발견
- **인사이트 패널**: 통계 및 분석 정보로 사고 흐름 파악
- **페르소나 시스템**: 다양한 AI 페르소나로 다른 관점의 인사이트 제공

### 6. 📱 PWA 지원
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
- **OpenAI GPT** - 메모리 분석, 요약, 연결 발견
- **OpenAI Whisper** - 음성 전사

### 기타
- **PWA** - Progressive Web App 지원
- **PDF.js** - PDF 렌더링
- **Mammoth** - DOCX 파싱

## 🎨 디자인 시스템

- **키 컬러**: 주황(Orange) + 인디고(Indigo)
- **디자인 철학**: 직선과 명확한 테두리를 활용한 카툰 스타일
- **UI 특징**: 둥근 모서리 최소화, 명확한 경계선, 직관적인 인터랙션
- **공간감**: 무한 캔버스로 제한 없는 사고 공간 제공

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

## 💡 사용 사례

### 아이디어 브레인스토밍
- 무한 캔버스에 아이디어를 자유롭게 배치
- AI가 관련 아이디어를 자동으로 연결
- 시각적으로 아이디어 간 관계 파악

### 프로젝트 관리
- 프로젝트 관련 메모와 파일을 한 곳에 배치
- 시간순으로 캘린더 블록에 일정 관리
- 데이터베이스 블록으로 작업 추적

### 학습 노트
- 학습 내용을 메모리 카드로 기록
- 관련 개념들을 연결선으로 연결
- AI가 학습 패턴과 주제를 자동으로 그룹화

### 회의록 정리
- 음성 녹음으로 회의 내용 자동 전사
- 회의록을 다른 메모리와 연결
- 시간이 지나도 회의 내용과 관련 아이디어 추적

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
