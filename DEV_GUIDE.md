# 개발자 가이드 🛠️

## 아키텍처 개요

### 전체 구조

```
사용자 입력 
  ↓
Next.js Frontend (React)
  ↓
API Routes (Next.js)
  ↓
AI Service (OpenAI)
  ↓
Database (SQLite)
```

### 데이터 흐름

#### 1. 기억 생성 플로우

```
1. 사용자가 텍스트 입력
2. POST /api/memories
3. AI 분류 (lib/ai.ts::classifyMemory)
   - 주제, 성격, 시간성격 판단
   - 클러스터 제안
4. 관련 기억 찾기 (lib/ai.ts::findRelatedMemories)
5. DB 저장 (lib/db.ts::memoryDb.create)
6. 반복 감지 (lib/clustering.ts::detectRepetition)
7. 조건부 제안 생성 (3회 이상 시)
8. 응답 반환
```

#### 2. 요약 생성 플로우

```
1. 사용자가 질문 입력
2. POST /api/summarize
3. 기억 검색 (lib/clustering.ts::searchMemories)
4. AI 요약 생성 (lib/ai.ts::generateSummary)
5. 맥락별 묶음 (lib/clustering.ts::organizeMemoriesByContext)
6. 조건부 제안 생성
7. 응답 반환
```

## 핵심 모듈 상세

### 1. Database Layer (`lib/db.ts`)

**기술**: better-sqlite3 (동기식 SQLite)

**테이블 구조:**

```sql
-- memories 테이블
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  topic TEXT,
  nature TEXT,
  timeContext TEXT,
  relatedMemoryIds TEXT,      -- JSON array
  clusterTag TEXT,
  repeatCount INTEGER DEFAULT 0,
  lastMentionedAt INTEGER
);

-- clusters 테이블
CREATE TABLE clusters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  memoryIds TEXT NOT NULL,     -- JSON array
  summary TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

**주요 함수:**

- `memoryDb.create()` - 기억 생성
- `memoryDb.getAll()` - 전체 조회
- `memoryDb.getByCluster()` - 클러스터별 조회
- `memoryDb.getByTopic()` - 주제별 조회
- `clusterDb.create()` - 클러스터 생성

### 2. AI Service Layer (`lib/ai.ts`)

**API**: OpenAI GPT-4o-mini

**주요 함수:**

#### `classifyMemory()`
- 입력: 사용자 텍스트 + 기존 기억들
- 출력: 주제, 성격, 시간성격, 클러스터 제안
- 모델: gpt-4o-mini (빠르고 저렴)
- Temperature: 0.3 (일관성 중시)

```typescript
const classification = await classifyMemory(content, existingMemories);
// {
//   topic: "아이디어",
//   nature: "단순기록",
//   timeContext: "언젠가",
//   suggestedCluster: "프로젝트 아이디어"
// }
```

#### `findRelatedMemories()`
- 입력: 새 기억 + 기존 기억들
- 출력: 관련 있는 기억의 ID 배열
- 방식: GPT가 내용 분석하여 관련성 판단

#### `generateSummary()`
- 입력: 사용자 질문 + 관련 기억들
- 출력: 요약 텍스트
- Temperature: 0.7 (창의적 요약)

#### `generateSuggestions()`
- 입력: 기억 배열
- 출력: 제안 문자열 배열 (또는 undefined)
- 조건: 동일 클러스터 3회 이상
- Temperature: 0.8 (다양한 제안)

### 3. Clustering Layer (`lib/clustering.ts`)

**맥락 기반 조직화**

#### `organizeMemoriesByContext()`
```typescript
// 기억들을 clusterTag로 묶음
const clusters = organizeMemoriesByContext(memories);
// Map<string, Memory[]>
```

#### `detectRepetition()`
```typescript
// 같은 클러스터에 몇 번째 등장인지 카운트
const count = detectRepetition(newMemory, existingMemories);
```

#### `detectReemergence()`
```typescript
// 7일 이상 간격 두고 재등장했는지 감지
const isReemergent = detectReemergence(clusterTag, memories);
```

## API 엔드포인트

### POST /api/memories

**Request:**
```json
{
  "content": "채용 관련 아이디어 생각해봐야 함"
}
```

**Response:**
```json
{
  "memory": {
    "id": "abc123",
    "content": "채용 관련 아이디어 생각해봐야 함",
    "createdAt": 1234567890,
    "topic": "업무",
    "nature": "아이디어",
    "timeContext": "언젠가",
    "clusterTag": "채용 아이디어",
    "repeatCount": 1
  },
  "suggestions": ["이전 채용 관련 기록이랑 묶어볼까?"]
}
```

### GET /api/memories

**Query Parameters:**
- `cluster`: 클러스터별 필터
- `topic`: 주제별 필터

**Response:**
```json
{
  "memories": [...]
}
```

### POST /api/summarize

**Request:**
```json
{
  "query": "요즘 내가 무슨 생각 많이 했어?"
}
```

**Response:**
```json
{
  "summary": "최근 2주간 주로 채용과 커리어에 대한 생각을 많이 했네요...",
  "relatedMemories": [...],
  "clusters": [...],
  "suggestions": [...]
}
```

### GET /api/clusters

**Response:**
```json
{
  "clusters": [
    {
      "tag": "채용 아이디어",
      "count": 5,
      "memories": [...],
      "latestAt": 1234567890
    }
  ]
}
```

## 프론트엔드 컴포넌트

### 1. MemoryInput (`components/MemoryInput.tsx`)

**역할**: 자유 텍스트 입력

**상태:**
- `content`: 입력 중인 텍스트
- `loading`: 저장 중 상태
- `suggestions`: 조건부 제안 배열

**기능:**
- 자유 형식 텍스트 입력
- 저장 중 로딩 표시
- 조건부 제안 팝업 (3회 이상 반복 시)

### 2. MemoryView (`components/MemoryView.tsx`)

**역할**: 맥락별 기억 표시

**Props:**
- `memories`: 전체 기억 배열
- `clusters`: 클러스터별 묶음 Map

**기능:**
- 클러스터별 그룹핑
- 태그 자동 표시 (주제, 성격, 반복 횟수)
- 상대적 시간 표시 (date-fns)

### 3. QueryPanel (`components/QueryPanel.tsx`)

**역할**: 자연어 질문 및 요약

**상태:**
- `query`: 질문 텍스트
- `loading`: 처리 중 상태
- `result`: 요약 결과

**기능:**
- 빠른 질문 버튼
- 요약 표시
- 관련 기억 프리뷰
- 조건부 제안 표시

### 4. Main Page (`app/page.tsx`)

**역할**: 전체 레이아웃 및 탭 관리

**탭:**
1. 기억하기 - MemoryInput
2. 보관함 - MemoryView
3. 물어보기 - QueryPanel

## 개발 워크플로우

### 로컬 개발

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
echo "OPENAI_API_KEY=sk-..." > .env.local

# 3. 개발 서버 시작
npm run dev

# 4. 브라우저에서 http://localhost:3000
```

### 디버깅

**콘솔 로그 확인:**
- 브라우저 개발자 도구 (F12)
- 터미널 (서버 로그)

**데이터베이스 확인:**
```bash
# SQLite CLI로 직접 조회
sqlite3 workless.db
> SELECT * FROM memories;
> SELECT * FROM clusters;
```

### 테스트

**수동 테스트 시나리오:**

1. **기본 플로우**
   - 기억 입력 → 저장 → 보관함 확인
   
2. **분류 테스트**
   - 다양한 주제 입력 → 자동 분류 확인
   
3. **반복 감지**
   - 같은 주제 3회 입력 → 제안 확인
   
4. **요약 생성**
   - 질문 입력 → 요약 확인

## 커스터마이징

### AI 프롬프트 수정

`lib/ai.ts`의 각 함수에서 프롬프트 텍스트를 수정할 수 있습니다.

**예: 분류 기준 변경**
```typescript
// lib/ai.ts - classifyMemory()
const prompt = `
[여기에 새로운 분류 기준 추가]
- 주제: 기존 + 새로운 카테고리
- 성격: ...
`;
```

### UI 스타일 변경

Tailwind CSS 사용:
```typescript
// 색상 변경
className="bg-blue-500"  // → bg-purple-500

// 레이아웃 변경
className="max-w-3xl"    // → max-w-4xl
```

### 제안 조건 변경

`lib/clustering.ts`:
```typescript
// 현재: 3회 이상
const frequentClusters = Array.from(clusterCounts.entries())
  .filter(([_, count]) => count >= 3)  // ← 이 숫자 변경

// 재등장 간격 변경
const daysDiff = (last.createdAt - secondLast.createdAt) / (1000 * 60 * 60 * 24);
return daysDiff >= 7;  // ← 7일 → 14일 등
```

## 성능 최적화

### 현재 구현
- **동기식 SQLite**: 빠른 읽기/쓰기
- **gpt-4o-mini**: 저렴하고 빠름
- **로컬 DB**: 네트워크 지연 없음

### 추후 개선 가능
1. **임베딩 기반 검색**
   - 현재: 키워드 매칭
   - 개선: OpenAI Embeddings + 벡터 검색
   
2. **캐싱**
   - AI 응답 캐싱
   - 자주 조회하는 클러스터 캐싱

3. **배치 처리**
   - 여러 기억 한 번에 분류

## 배포

### Vercel 배포

**주의**: SQLite는 서버리스 환경에서 제한적입니다.

**대안:**
1. PostgreSQL + Prisma
2. Supabase
3. MongoDB

### Docker 배포

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t workless-besir .
docker run -p 3000:3000 -e OPENAI_API_KEY=sk-... workless-besir
```

## 트러블슈팅

### SQLite 권한 오류
```bash
chmod 666 workless.db
```

### API 호출 실패
- OpenAI API 키 확인
- 네트워크 연결 확인
- API 사용량 확인

### 빌드 오류
```bash
rm -rf .next node_modules
npm install
npm run dev
```

## 기여 가이드

### 코드 스타일
- TypeScript strict mode
- ESLint + Prettier
- 함수형 컴포넌트

### 커밋 컨벤션
```
feat: 새 기능
fix: 버그 수정
docs: 문서 수정
style: 스타일 변경
refactor: 리팩토링
test: 테스트 추가
```

---

**Happy Coding!** 🚀
