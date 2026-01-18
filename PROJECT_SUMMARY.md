# 🎉 Workless, be sir - 프로젝트 완성!

## 프로젝트 위치
```
C:\Users\user\workless-besir\
```

## ✅ 완성된 기능

### 1️⃣ 자유 입력 + "기억 요청" ✅
- ✅ 자유 텍스트 입력
- ✅ 형식 없음, 문장 엉망 OK
- ✅ 분류/날짜/중요도 선택 불필요

### 2️⃣ 자동 분류 & 태깅 ✅
- ✅ AI가 자동으로 주제 분류
- ✅ AI가 자동으로 성격 파악
- ✅ AI가 자동으로 시간 성격 분석
- ✅ 사용자는 선택 안 함

### 3️⃣ 맥락 기반 보관 ✅
- ✅ 날짜순 아닌 맥락별 묶음
- ✅ 비슷한 주제끼리 자동 클러스터링
- ✅ 사람 기억 방식 그대로

### 4️⃣ 정리 요청 시 요약 제공 ✅
- ✅ 자연어 질문 가능
- ✅ 관련 기억들 자동 검색
- ✅ AI가 요약해서 제공
- ✅ 빠른 질문 버튼 제공

### 5️⃣ 조건부 제안 ✅
- ✅ 동일 주제 3회 이상 반복 시 제안
- ✅ 시간 간격 재등장 감지
- ✅ 강요 없음, 참고용

## 🛠️ 기술 스택

### Frontend
- ✅ Next.js 14 (App Router)
- ✅ React 19
- ✅ TypeScript
- ✅ Tailwind CSS

### Backend
- ✅ Next.js API Routes
- ✅ SQLite (better-sqlite3)

### AI
- ✅ OpenAI GPT-4o-mini
- ✅ 자동 분류
- ✅ 관련 기억 찾기
- ✅ 요약 생성
- ✅ 조건부 제안 생성

## 📂 프로젝트 구조

```
workless-besir/
├── 📱 Frontend
│   ├── app/
│   │   ├── page.tsx              ← 메인 페이지 (탭 관리)
│   │   ├── layout.tsx            ← 레이아웃
│   │   └── globals.css
│   └── components/
│       ├── MemoryInput.tsx       ← 자유 입력 컴포넌트
│       ├── MemoryView.tsx        ← 맥락별 보기 컴포넌트
│       └── QueryPanel.tsx        ← 질문/요약 컴포넌트
│
├── 🔌 Backend API
│   └── app/api/
│       ├── memories/route.ts     ← 기억 CRUD
│       ├── summarize/route.ts    ← 요약 생성
│       └── clusters/route.ts     ← 클러스터 조회
│
├── 🧠 Core Logic
│   └── lib/
│       ├── db.ts                 ← SQLite 데이터베이스
│       ├── ai.ts                 ← OpenAI 호출
│       └── clustering.ts         ← 맥락 묶음 로직
│
├── 📘 Types
│   └── types/
│       └── index.ts              ← TypeScript 타입 정의
│
├── 📖 Documentation
│   ├── README.md                 ← 프로젝트 소개
│   ├── USAGE_GUIDE.md            ← 사용 가이드
│   ├── DEV_GUIDE.md              ← 개발자 가이드
│   └── PROJECT_SUMMARY.md        ← 이 파일!
│
└── 🚀 Quick Start
    ├── start.bat                 ← Windows 시작 스크립트
    └── start.ps1                 ← PowerShell 시작 스크립트
```

## 🚀 빠른 시작

### 1. OpenAI API 키 설정

`.env.local` 파일을 열고 API 키를 입력하세요:

```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 2. 서버 시작

**방법 1: 스크립트 사용**
```bash
# Windows CMD
start.bat

# PowerShell
.\start.ps1
```

**방법 2: 직접 실행**
```bash
npm run dev
```

### 3. 브라우저에서 열기

```
http://localhost:3000
```

## 📊 데이터베이스 스키마

### memories 테이블
```
id                 TEXT PRIMARY KEY
content            TEXT NOT NULL          ← 사용자 입력 원문
createdAt          INTEGER NOT NULL       ← 생성 시간
topic              TEXT                   ← AI 분류: 주제
nature             TEXT                   ← AI 분류: 성격
timeContext        TEXT                   ← AI 분류: 시간 성격
relatedMemoryIds   TEXT                   ← 관련 기억 ID 배열 (JSON)
clusterTag         TEXT                   ← 맥락 묶음 태그
repeatCount        INTEGER                ← 반복 횟수
lastMentionedAt    INTEGER                ← 마지막 등장 시간
```

### clusters 테이블
```
id           TEXT PRIMARY KEY
name         TEXT NOT NULL       ← 클러스터 이름
memoryIds    TEXT NOT NULL       ← 소속 기억 ID 배열 (JSON)
summary      TEXT                ← 요약
createdAt    INTEGER NOT NULL
updatedAt    INTEGER NOT NULL
```

## 🎯 핵심 기능 흐름

### 기억 저장 플로우

```
1. 사용자가 텍스트 입력
   ↓
2. API: POST /api/memories
   ↓
3. AI 분류 (lib/ai.ts)
   - 주제 (아이디어/업무/커리어/...)
   - 성격 (단순기록/아이디어/고민/...)
   - 시간성격 (당장/언젠가/특정시점)
   - 클러스터 제안
   ↓
4. 관련 기억 찾기 (AI)
   ↓
5. DB 저장 (lib/db.ts)
   ↓
6. 반복 감지
   - 같은 클러스터 몇 번째?
   ↓
7. 조건부 제안 생성
   - 3회 이상이면 제안
   ↓
8. 응답 반환
```

### 요약 생성 플로우

```
1. 사용자가 질문 입력
   예: "요즘 내가 무슨 생각 많이 했어?"
   ↓
2. API: POST /api/summarize
   ↓
3. 관련 기억 검색 (키워드 매칭)
   ↓
4. AI 요약 생성
   - 핵심만 간단히
   - 시간 순서 또는 주제별
   ↓
5. 맥락별 묶음 조회
   ↓
6. 조건부 제안 생성
   ↓
7. 응답 반환
```

## 🎨 UI/UX 특징

### 메인 페이지
- 3개 탭: 기억하기 / 보관함 / 물어보기
- 그라데이션 배경 (blue-purple)
- 미니멀 디자인

### 기억하기 탭
- 큰 텍스트 입력창
- 플레이스홀더: "아무 말이나 입력하세요..."
- 버튼: "기억해줘"
- 조건부 제안 팝업 (주황색)

### 보관함 탭
- 클러스터별 그룹핑
- 각 클러스터마다 제목 + 개수
- 카드 형식 기억 표시
- 자동 태그: 주제(파란색), 성격(보라색), 반복(주황색)
- 상대적 시간 표시 (예: "3일 전")

### 물어보기 탭
- 질문 입력창
- 빠른 질문 버튼 3개
- 요약 결과 (초록색 박스)
- 관련 기억 미리보기
- 조건부 제안

## 🔧 커스터마이징 가이드

### AI 프롬프트 수정
`lib/ai.ts`에서 각 함수의 프롬프트를 수정할 수 있습니다.

**분류 기준 변경:**
```typescript
// lib/ai.ts - classifyMemory()
const prompt = `
...
1. **주제 (topic)**: 아이디어, 업무, 커리어, 감정, 기록, 일상, 학습, 기타 중 하나
   ← 여기에 새 카테고리 추가
...
`;
```

### 제안 조건 변경
```typescript
// lib/ai.ts - generateSuggestions()
const frequentClusters = Array.from(clusterCounts.entries())
  .filter(([_, count]) => count >= 3)  // ← 3을 5로 변경하면 5회부터 제안

// lib/clustering.ts - detectReemergence()
return daysDiff >= 7;  // ← 7일을 14일로 변경 가능
```

### UI 색상 변경
```typescript
// components/MemoryInput.tsx
className="bg-blue-500"  // ← 색상 변경
className="border-blue-400"
```

## 📈 성능 특징

### 빠른 응답
- SQLite: 로컬 DB, 네트워크 지연 없음
- GPT-4o-mini: 빠르고 저렴한 모델
- 동기식 DB: 추가 복잡도 없음

### 저렴한 비용
- GPT-4o-mini: GPT-4 대비 60배 저렴
- 평균 분류 1회: ~$0.001
- 요약 1회: ~$0.002

## 🐛 알려진 제약사항

### 1. 검색 기능
- **현재**: 단순 키워드 매칭
- **향후**: 임베딩 기반 유사도 검색

### 2. 관련 기억 찾기
- **현재**: AI가 전체 기억 비교
- **향후**: 벡터 유사도 기반

### 3. 배포
- **현재**: 로컬 SQLite
- **향후**: PostgreSQL 또는 MongoDB로 전환 필요

## 🚧 다음 버전 계획 (v0.2)

### 계획된 기능
- [ ] 음성 입력 지원
- [ ] 이미지 첨부
- [ ] 임베딩 기반 검색
- [ ] 주간/월간 자동 요약 리포트
- [ ] 모바일 반응형 개선
- [ ] 다크 모드

### 장기 계획 (v0.3+)
- [ ] 모바일 앱 (React Native)
- [ ] 크롬 확장 프로그램
- [ ] 기억 간 연결 그래프 시각화
- [ ] 다국어 지원
- [ ] 팀/공유 기능

## 📝 테스트 시나리오

### 기본 테스트
1. ✅ 기억 입력 → 저장 → 보관함 확인
2. ✅ 다양한 주제 입력 → 자동 분류 확인
3. ✅ 같은 주제 3회 입력 → 제안 확인
4. ✅ 질문 입력 → 요약 확인

### 고급 테스트
1. ✅ 여러 클러스터 생성 확인
2. ✅ 관련 기억 연결 확인
3. ✅ 반복 카운트 증가 확인
4. ✅ 시간 간격 재등장 감지

## 🎓 학습 포인트

이 프로젝트는 다음을 배울 수 있습니다:

### Frontend
- Next.js 14 App Router
- React 19 hooks
- Tailwind CSS
- TypeScript

### Backend
- Next.js API Routes
- RESTful API 설계
- SQLite 데이터베이스

### AI Integration
- OpenAI API 사용
- 프롬프트 엔지니어링
- 자동 분류/태깅
- 자연어 요약

### Product Design
- 미니멀리즘
- 사용자 선택 최소화
- AI 기반 자동화
- 조건부 제안

## 🎉 축하합니다!

**Workless, be sir** MVP가 완성되었습니다!

### 지금 바로 시작하세요:
```bash
# 1. API 키 설정
echo OPENAI_API_KEY=sk-... > .env.local

# 2. 서버 시작
npm run dev

# 3. 브라우저 열기
# http://localhost:3000
```

### 문서 읽기:
- **사용법**: `USAGE_GUIDE.md`
- **개발**: `DEV_GUIDE.md`
- **README**: `README.md`

---

**만든 사람**: AI + Human Collaboration 🤝
**날짜**: 2026-01-18
**버전**: v0.1.0
**컨셉**: "Workless, be sir" - 알아서 정리해주는 개인 비서
