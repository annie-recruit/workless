# 🎨 Workless 캔버스 OS 구현 가능 아이디어 정리

## 📋 현재 기반 구조 (이미 구현됨)

✅ **보드 뷰**: 무한 캔버스 기반
✅ **드래그 앤 드롭**: 포스트잇(메모리 카드) 자유 배치
✅ **위치 저장**: `/api/board/positions` - 각 카드의 x, y 좌표 저장
✅ **줌 기능**: 0.5x ~ 1.6x 확대/축소
✅ **카드 크기 조절**: S/M/L 3단계
✅ **다중 선택**: Ctrl/Cmd + 클릭, 드래그 박스
✅ **연결선**: 관련 기록 간 시각적 연결

---

## 🚀 구현 가능한 아이디어 (우선순위별)

### 🔥 Phase 1: 핵심 블록 타입 확장 (1-2주)

#### 1.1 📅 Calendar Block (캘린더 블록)
**구현 난이도**: ⭐⭐ (중)

**기능**:
- 캔버스에 드래그 가능한 캘린더 위젯
- 월별/주별/일별 뷰 전환
- 일정을 메모리 카드와 연결 (드래그로 연결)
- 특정 날짜 클릭 → 해당 날짜의 메모리들 필터링

**기술적 접근**:
```typescript
// 새로운 블록 타입 정의
type CanvasBlock = 
  | { type: 'memory', id: string }
  | { type: 'calendar', id: string, view: 'month' | 'week' | 'day' }
  | { type: 'photo', id: string, filepath: string }
  | { type: 'automation', id: string, action: string }
  | { type: 'insight', id: string, widgetType: string }

// positions API 확장
// /api/board/positions에 blockType 추가
```

**데이터 구조**:
```sql
-- board_blocks 테이블 추가
CREATE TABLE board_blocks (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL, -- 'calendar', 'photo', 'automation', 'insight'
  config TEXT, -- JSON 설정
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL,
  height REAL,
  createdAt INTEGER,
  updatedAt INTEGER
);
```

**UI 컴포넌트**:
- `CalendarBlock.tsx`: react-calendar 기반
- 드래그 핸들러는 기존 MemoryCard와 동일하게

---

#### 1.2 🖼️ Photo/Screenshot Block
**구현 난이도**: ⭐ (쉬움)

**기능**:
- 첨부 파일을 캔버스에 직접 배치
- 이미지 드래그 앤 드롭으로 캔버스에 추가
- 이미지 클릭 → 원본 메모리로 이동
- 이미지 위에 메모리 카드 오버레이 가능

**기술적 접근**:
- 기존 `attachments` 활용
- `PhotoBlock.tsx` 컴포넌트
- 이미지 최적화 (썸네일 + 원본)

---

#### 1.3 🔘 Automation Button Block
**구현 난이도**: ⭐⭐⭐ (중상)

**기능**:
- "오늘 생각 정리하기" 버튼
- "이 캔버스 요약" 버튼
- "막힌 사고 찾아줘" 버튼
- "비슷한 생각 모아줘" 버튼
- 버튼 클릭 → AI 처리 → 결과를 캔버스에 배치

**기술적 접근**:
```typescript
// AutomationBlock 컴포넌트
const automationActions = {
  'summarize-today': async () => {
    // 오늘의 메모리들 요약
    const todayMemories = memories.filter(/* 오늘 */);
    const summary = await ai.summarize(todayMemories);
    // 새 메모리 카드로 생성하여 캔버스에 배치
  },
  'find-stuck-thoughts': async () => {
    // 반복되는 생각 찾기
    // 군집 분석으로 해결 안 된 문제 찾기
  },
  'group-similar': async () => {
    // 비슷한 생각들 자동 그룹화
    // 가까이 배치
  }
};
```

**AI API 확장**:
- `/api/ai/automation` 엔드포인트
- 프롬프트 템플릿 관리

---

#### 1.4 📊 Insight Widget Block
**구현 난이도**: ⭐⭐⭐ (중상)

**기능**:
- "반복되는 생각" 위젯
- "최근 미해결 문제" 위젯
- "감정 흐름" 위젯
- 실시간 업데이트

**기술적 접근**:
- 기존 `InsightsPanel` 로직 재사용
- 캔버스용 미니 버전
- WebSocket 또는 폴링으로 업데이트

---

### 🔥 Phase 2: 공간 기반 관계 인식 (2-3주)

#### 2.1 위치·거리 기반 자동 연결
**구현 난이도**: ⭐⭐⭐⭐ (상)

**핵심 아이디어**: 
> "가까운 노드 = 연관성 높음"

**기술적 접근**:
```typescript
// 거리 기반 연관성 계산
function calculateSpatialRelationships(memories: Memory[], positions: Positions) {
  const relationships: Array<{id1: string, id2: string, distance: number}> = [];
  
  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const pos1 = positions[memories[i].id];
      const pos2 = positions[memories[j].id];
      
      if (pos1 && pos2) {
        const distance = Math.sqrt(
          Math.pow(pos1.x - pos2.x, 2) + 
          Math.pow(pos1.y - pos2.y, 2)
        );
        
        // 거리가 가까우면 자동으로 연결 제안
        if (distance < 300) { // 픽셀 기준
          relationships.push({
            id1: memories[i].id,
            id2: memories[j].id,
            distance
          });
        }
      }
    }
  }
  
  return relationships;
}
```

**AI 연동**:
- 가까운 카드들 자동 분석
- "이 영역의 생각들은 모두 같은 문제를 말하고 있어요" 알림
- 자동 그룹화 제안

---

#### 2.2 군집 분석 (Clustering)
**구현 난이도**: ⭐⭐⭐⭐ (상)

**기능**:
- 밀집된 카드들 자동 감지
- "이 구역은 미해결 사고" 표시
- "이 구역은 회피 중인 생각" 표시

**기술적 접근**:
```typescript
// K-means 또는 DBSCAN 클러스터링
import { DBSCAN } from 'density-clustering';

function analyzeClusters(positions: Positions) {
  const points = Object.entries(positions).map(([id, pos]) => [pos.x, pos.y]);
  const dbscan = new DBSCAN();
  const clusters = dbscan.run(points, 200, 3); // eps=200px, minPts=3
  
  return clusters.map(cluster => ({
    memoryIds: cluster.map(i => Object.keys(positions)[i]),
    center: calculateCenter(cluster),
    density: cluster.length
  }));
}
```

---

#### 2.3 공간 기반 AI 인사이트
**구현 난이도**: ⭐⭐⭐⭐⭐ (최상)

**기능**:
- "이 영역에 있는 생각들, 다 같은 문제를 말하고 있어요"
- "이 카드는 혼자 떨어져 있어요. 관련 생각이 없나요?"
- "이 구역은 너무 복잡해요. 정리가 필요해요"

**AI 프롬프트 예시**:
```
다음 생각들이 공간상 가까이 배치되어 있습니다:
[카드들의 내용]

이들이 실제로 관련이 있는지, 
같은 문제를 다루고 있는지 분석해주세요.
```

---

### 🔥 Phase 3: UX 혁신 (1-2주)

#### 3.1 "흐트러뜨리기" 버튼
**구현 난이도**: ⭐⭐ (중)

**기능**:
- 정렬 버튼 ❌
- "흐트러뜨리기" 버튼 ✅
- 랜덤하게 위치 재배치 (약간만)
- 사고의 자연스러운 흐름 유지

**기술적 접근**:
```typescript
function scatterThoughts(positions: Positions, intensity: number = 50) {
  return Object.entries(positions).reduce((acc, [id, pos]) => {
    acc[id] = {
      x: pos.x + (Math.random() - 0.5) * intensity,
      y: pos.y + (Math.random() - 0.5) * intensity
    };
    return acc;
  }, {} as Positions);
}
```

---

#### 3.2 "비슷한 생각 모아줘"
**구현 난이도**: ⭐⭐⭐ (중상)

**기능**:
- AI가 유사한 메모리 찾기
- 가까이 배치
- 연결선 자동 생성

**기술적 접근**:
- 기존 `findRelatedMemories` 활용
- 결과를 공간상 가까이 배치
- 애니메이션으로 이동

---

#### 3.3 "충돌하는 생각 분리해줘"
**구현 난이도**: ⭐⭐⭐⭐ (상)

**기능**:
- 모순되는 생각 감지
- 공간상 멀리 배치
- "이 두 생각은 충돌해요" 알림

**AI 프롬프트**:
```
다음 두 생각이 모순되는지 확인:
1. [생각 A]
2. [생각 B]

모순된다면 이유를 설명하고, 
해결 방안을 제시해주세요.
```

---

#### 3.4 확대/축소 = 사고 스케일 조절
**구현 난이도**: ⭐ (쉬움) - 이미 구현됨!

**개선 사항**:
- 줌 레벨별 필터링
  - 줌 아웃 (0.5x): 전체 인생 고민
  - 줌 인 (1.6x): 오늘의 생각
- 줌 레벨별 다른 정보 표시
- "생각의 줌 레벨" 표시

---

### 🔥 Phase 4: 고급 기능 (3-4주)

#### 4.1 캔버스 상태 저장
**구현 난이도**: ⭐⭐ (중)

**기능**:
- 어제 닫았을 때 위치
- 흐트러진 정도
- 확대 비율
- → 그날의 정신 상태 저장

**기술적 접근**:
```typescript
// 캔버스 스냅샷 저장
interface CanvasSnapshot {
  timestamp: number;
  positions: Positions;
  zoom: number;
  viewport: { x: number, y: number };
  cardSize: 's' | 'm' | 'l';
}

// /api/board/snapshots
// 시간여행 기능: "어제 이 시간의 캔버스 보기"
```

---

#### 4.2 무한 캔버스 개선
**구현 난이도**: ⭐⭐⭐ (중상)

**현재**: 제한된 보드 크기
**목표**: 진짜 무한 캔버스

**기술적 접근**:
- Virtual Scrolling
- Canvas 기반 렌더링 (성능)
- 또는 React + CSS Transform (현재 방식 유지)

**라이브러리 옵션**:
- `react-konva` (Canvas 기반)
- `react-spring` (애니메이션)
- `react-use-gesture` (제스처)

---

#### 4.3 패닝 (Panning)
**구현 난이도**: ⭐⭐ (중)

**기능**:
- 마우스 드래그로 캔버스 이동
- 휠로 줌 + 패닝
- 터치 제스처 지원

**기술적 접근**:
```typescript
const [pan, setPan] = useState({ x: 0, y: 0 });

// 마우스 드래그로 패닝
onMouseDown={(e) => {
  if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
    // 미들 클릭 또는 Ctrl + 드래그
    startPanning(e);
  }
}}
```

---

#### 4.4 연결선 시각화 개선
**구현 난이도**: ⭐⭐⭐ (중상)

**현재**: 기본 연결선
**목표**: 
- 곡선 연결선
- 연결 강도에 따른 두께
- 호버 시 연결된 카드 하이라이트

**기술적 접근**:
- SVG `<path>` 사용
- Bezier 곡선
- `react-spring` 애니메이션

---

## 🎯 MVP 스코프 (최소 구현)

### 필수 기능만 (2주)
1. ✅ Calendar Block 기본형
2. ✅ Photo Block
3. ✅ Automation Button 2개 ("오늘 정리", "비슷한 생각 모아줘")
4. ✅ 위치 기반 자동 연결 제안
5. ✅ "흐트러뜨리기" 버튼

### 완성형 (1-2개월)
- 위 Phase 1-3 모두
- 기본적인 Phase 4

---

## 🛠️ 기술 스택 제안

### 프론트엔드
- **현재**: React + TypeScript ✅
- **추가 필요**: 
  - `react-calendar` (캘린더)
  - `d3-force` 또는 `density-clustering` (군집 분석)
  - `react-spring` (애니메이션)

### 백엔드
- **현재**: Next.js API Routes ✅
- **추가 필요**:
  - `board_blocks` 테이블
  - Automation API 엔드포인트
  - 공간 분석 유틸리티

### 성능 최적화
- Virtual Scrolling (많은 카드)
- Canvas 렌더링 (100개 이상)
- Web Worker (군집 분석)

---

## 💡 핵심 질문에 대한 답변

### Q: 이 캔버스는 '오늘의 생각 공간'이야? '평생 누적되는 사고 지도'야?

**A: 둘 다!**

**구현 방안**:
1. **기본 캔버스**: 평생 누적 (무한 확장)
2. **필터 모드**: 
   - "오늘" 필터 → 오늘의 생각만
   - "이번 주" 필터
   - "이번 달" 필터
3. **타임머신 모드**: 과거 시점의 캔버스 상태 보기

**데이터 구조**:
```typescript
interface CanvasView {
  id: string;
  name: string; // "전체", "오늘", "이번 주"
  filter?: {
    startDate?: number;
    endDate?: number;
    tags?: string[];
  };
  positions: Positions; // 각 뷰마다 독립적인 위치
}
```

---

## 🚦 구현 우선순위

### Week 1-2: 블록 타입 확장
1. Photo Block (가장 쉬움)
2. Calendar Block
3. Automation Button 기본형

### Week 3-4: 공간 인식
1. 위치 기반 자동 연결
2. "비슷한 생각 모아줘"
3. "흐트러뜨리기"

### Week 5-6: UX 개선
1. 패닝 개선
2. 연결선 시각화
3. 줌 레벨별 필터링

### Week 7-8: 고급 기능
1. 캔버스 스냅샷
2. 군집 분석
3. Insight Widget

---

## 🎨 디자인 원칙

1. **정리하지 마세요. 펼치세요.**
   - 정렬 버튼 없음
   - "흐트러뜨리기" 있음

2. **위치가 곧 관계**
   - 가까이 = 관련
   - 멀리 = 무관

3. **완성 안 돼도 됨**
   - 중간 저장 상태도 의미 있음
   - "지금 생각" 그대로 보여줌

---

## 📝 다음 단계

1. **블록 타입 시스템 설계**
   - `CanvasBlock` 타입 정의
   - `BlockRenderer` 컴포넌트
   - 블록별 설정 UI

2. **데이터베이스 스키마**
   - `board_blocks` 테이블
   - 마이그레이션 스크립트

3. **API 설계**
   - `/api/board/blocks` CRUD
   - `/api/ai/automation`
   - `/api/board/spatial-analysis`

4. **첫 번째 블록 구현**
   - Photo Block부터 시작 (가장 쉬움)

---

## 🔥 이 아이디어의 진짜 강점

1. **정체성 고정**: "사고의 배치" 도구
2. **차별화**: 노션·피그마와 다른 결
3. **확장성**: VR, 태블릿까지 자연스럽게
4. **데이터 가치**: 위치 정보 = 관계 정보

---

**이제 시작할까요?** 🚀
