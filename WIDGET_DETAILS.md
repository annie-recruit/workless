# 🎨 신규 위젯 상세 설계서

## 1. 📈 타임라인 위젯 (Timeline Widget)

### 📋 기본 개념
캔버스에 배치 가능한 시간축 기반 메모리 시각화 위젯. 프로젝트 진행, 습관 형성, 아이디어 발전 과정을 시간순으로 추적.

### 🎯 핵심 기능

#### 1.1 시간축 표시
- **수평 타임라인**: 왼쪽에서 오른쪽으로 흐르는 시간축
- **수직 타임라인**: 위에서 아래로 흐르는 시간축 (옵션)
- **시간 단위 선택**: 일/주/월/년 단위 전환
- **줌 기능**: 특정 기간 확대/축소
- **현재 시간 표시**: 오늘/지금 위치 마커

#### 1.2 메모리 배치
- **자동 배치**: 메모리의 `createdAt` 기반 자동 위치
- **수동 배치**: 드래그로 시간축에 메모리 배치
- **다중 메모리**: 같은 시간대 여러 메모리 스택 표시
- **메모리 미리보기**: 호버 시 카드 내용 미리보기
- **메모리 연결**: 시간적 관계를 보여주는 연결선

#### 1.3 필터링 & 그룹화
- **기간 필터**: 시작일/종료일 설정
- **태그 필터**: 특정 태그만 표시
- **페르소나 필터**: 페르소나별 필터링
- **그룹화**: 주제별/카테고리별 그룹 표시
- **색상 코딩**: nature/태그별 색상 구분

#### 1.4 인터랙션
- **클릭**: 메모리 상세 보기
- **드래그**: 메모리 시간 위치 변경
- **스크롤**: 시간축 좌우 이동
- **줌**: 마우스 휠로 확대/축소
- **더블클릭**: 새 메모리 생성 (해당 시간)

### 🎨 UI 디자인

```
┌─────────────────────────────────────────────────┐
│ 🗓️ 타임라인 위젯                    [⚙️] [×]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ──────●────────●───────●───────●───────────▶  │
│  1월   2월      3월     4월     5월    ...      │
│        │        │       │       │              │
│        📝       📝      📝      📝              │
│        아이디어  회의록   요약    아이디어       │
│                                                 │
│  [◀ 이전]  [오늘]  [다음 ▶]  [전체 보기]       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 💻 구현 상세

#### 데이터 구조
```typescript
interface TimelineBlockConfig {
  id: string;
  type: 'timeline';
  x: number;
  y: number;
  width: number;
  height: number;
  
  // 시간 설정
  startDate: number;        // 시작 날짜 (timestamp)
  endDate: number;          // 종료 날짜 (timestamp)
  viewMode: 'day' | 'week' | 'month' | 'year';
  timeUnit: number;         // 시간 단위 (밀리초)
  
  // 메모리 연결
  linkedMemoryIds: string[]; // 타임라인에 표시할 메모리
  autoLink: boolean;        // 자동으로 메모리 추가 여부
  linkFilter?: {
    tags?: string[];
    personas?: string[];
    nature?: string[];
  };
  
  // 시각화 옵션
  showConnections: boolean;  // 메모리 간 연결선
  showMilestones: boolean;   // 마일스톤 표시
  colorBy: 'nature' | 'tag' | 'persona' | 'none';
  layout: 'horizontal' | 'vertical';
  
  // 인터랙션
  allowDrag: boolean;        // 드래그로 시간 변경 허용
  allowCreate: boolean;      // 타임라인에서 새 메모리 생성
  snapToGrid: boolean;       // 그리드에 맞추기
}
```

#### 컴포넌트 구조
```typescript
// components/TimelineBlock.tsx
export default function TimelineBlock({
  blockId,
  x,
  y,
  width,
  height,
  config,
  memories,
  onUpdate,
  onDelete,
}: TimelineBlockProps) {
  // 1. 시간축 계산
  const timeScale = useMemo(() => {
    return d3.scaleTime()
      .domain([config.startDate, config.endDate])
      .range([0, width]);
  }, [config, width]);
  
  // 2. 메모리 위치 계산
  const memoryPositions = useMemo(() => {
    return config.linkedMemoryIds.map(memoryId => {
      const memory = memories.find(m => m.id === memoryId);
      if (!memory) return null;
      return {
        memoryId,
        x: timeScale(memory.createdAt),
        y: height / 2,
      };
    }).filter(Boolean);
  }, [config, memories, timeScale, height]);
  
  // 3. 렌더링
  return (
    <div className="timeline-block">
      {/* 시간축 */}
      <svg className="timeline-axis">
        <TimeAxis scale={timeScale} />
      </svg>
      
      {/* 메모리 마커 */}
      {memoryPositions.map(pos => (
        <MemoryMarker
          key={pos.memoryId}
          x={pos.x}
          y={pos.y}
          memory={memories.find(m => m.id === pos.memoryId)}
          onClick={() => handleMemoryClick(pos.memoryId)}
          onDrag={(newX) => handleTimeChange(pos.memoryId, newX)}
        />
      ))}
      
      {/* 연결선 */}
      {config.showConnections && (
        <ConnectionLines memories={memories} positions={memoryPositions} />
      )}
    </div>
  );
}
```

#### API 엔드포인트
```typescript
// app/api/board/blocks/[id]/timeline/route.ts
// GET: 타임라인 데이터 조회
// POST: 메모리 시간 변경
// PUT: 타임라인 설정 업데이트
```

### 📱 사용 시나리오

**시나리오 1: 프로젝트 진행 추적**
```
1. 타임라인 위젯 생성
2. 프로젝트 시작일/종료일 설정
3. 관련 메모리 자동 연결
4. 진행 상황 시각적으로 확인
5. 마일스톤 추가
```

**시나리오 2: 습관 형성 기록**
```
1. 일 단위 타임라인 생성
2. 매일 습관 관련 메모리 작성
3. 타임라인에서 연속성 확인
4. 빈 날짜 발견 → 동기 부여
```

---

## 2. 🗺️ 지도 위젯 (Map Widget)

### 📋 기본 개념
위치 정보가 있는 메모리를 지도에 표시하고, 지역별로 클러스터링하여 공간적 관계를 시각화.

### 🎯 핵심 기능

#### 2.1 지도 표시
- **지도 타입**: 로드맵/위성/지형도 전환
- **줌/팬**: 확대/축소 및 이동
- **현재 위치**: GPS 기반 현재 위치 표시
- **검색**: 주소/장소명 검색
- **레이어**: 마커/클러스터/경로 레이어 토글

#### 2.2 메모리 마커
- **자동 마커**: 위치 정보가 있는 메모리 자동 표시
- **마커 스타일**: 메모리 타입별 다른 아이콘
- **클러스터링**: 가까운 마커 자동 그룹화
- **호버 효과**: 마커 호버 시 메모리 미리보기
- **클릭**: 메모리 상세 보기

#### 2.3 인터랙션
- **지도 클릭**: 해당 위치에 새 메모리 생성
- **드래그**: 마커 위치 변경
- **필터**: 태그/날짜/페르소나별 필터링
- **경로 그리기**: 여러 위치 연결하여 경로 표시
- **반경 검색**: 특정 반경 내 메모리만 표시

### 🎨 UI 디자인

```
┌─────────────────────────────────────────┐
│ 🗺️ 지도 위젯              [⚙️] [×]     │
├─────────────────────────────────────────┤
│ [로드맵 ▼]  [🔍 검색...]  [📍 현재위치] │
├─────────────────────────────────────────┤
│                                         │
│              🗺️ 지도 영역               │
│                                         │
│         📍  📍                          │
│            📍                           │
│      📍                                 │
│                                         │
│  [📍 12개 메모리]  [경로 그리기]        │
│                                         │
└─────────────────────────────────────────┘
```

### 💻 구현 상세

#### 데이터 구조
```typescript
interface MapBlockConfig {
  id: string;
  type: 'map';
  x: number;
  y: number;
  width: number;
  height: number;
  
  // 지도 설정
  center: { lat: number; lng: number };
  zoom: number;
  mapType: 'roadmap' | 'satellite' | 'terrain';
  mapProvider: 'google' | 'naver' | 'openstreetmap';
  
  // 메모리 연결
  linkedMemoryIds: string[];
  autoLink: boolean;  // 위치 정보 있는 메모리 자동 추가
  showOnlyWithLocation: boolean;
  
  // 시각화
  showMarkers: boolean;
  showClusters: boolean;
  clusterRadius: number;
  showPaths: boolean;
  pathMemoryIds: string[][];  // 경로 그룹
  
  // 필터
  filters?: {
    dateRange?: { start: number; end: number };
    tags?: string[];
    radius?: number;  // 중심점 기준 반경 (미터)
  };
}
```

#### 컴포넌트 구조
```typescript
// components/MapBlock.tsx
import { GoogleMap, Marker, Clusterer, useLoadScript } from '@react-google-maps/api';

export default function MapBlock({
  blockId,
  config,
  memories,
  onUpdate,
}: MapBlockProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  });
  
  // 위치 정보가 있는 메모리 필터링
  const locationMemories = useMemo(() => {
    return memories.filter(m => m.location);
  }, [memories]);
  
  // 클러스터링
  const clusters = useMemo(() => {
    return clusterMemories(locationMemories, config.clusterRadius);
  }, [locationMemories, config.clusterRadius]);
  
  if (!isLoaded) return <div>지도 로딩 중...</div>;
  
  return (
    <div className="map-block">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={config.center}
        zoom={config.zoom}
        options={{
          mapTypeId: config.mapType,
          disableDefaultUI: false,
        }}
        onDragEnd={(e) => {
          const center = e.getCenter();
          onUpdate(blockId, {
            config: { ...config, center: { lat: center.lat(), lng: center.lng() } }
          });
        }}
        onZoomChanged={(e) => {
          const zoom = e.getZoom();
          onUpdate(blockId, { config: { ...config, zoom } });
        }}
        onClick={(e) => {
          // 지도 클릭 시 새 메모리 생성
          handleMapClick(e.latLng);
        }}
      >
        {/* 마커 */}
        {config.showMarkers && locationMemories.map(memory => (
          <Marker
            key={memory.id}
            position={{
              lat: memory.location!.latitude,
              lng: memory.location!.longitude,
            }}
            title={memory.title || memory.content.slice(0, 50)}
            onClick={() => handleMarkerClick(memory.id)}
            icon={getMarkerIcon(memory)}
          />
        ))}
        
        {/* 클러스터 */}
        {config.showClusters && (
          <Clusterer>
            {clusters.map(cluster => (
              <ClusterMarker
                key={cluster.id}
                position={cluster.center}
                count={cluster.memories.length}
                onClick={() => handleClusterClick(cluster)}
              />
            ))}
          </Clusterer>
        )}
      </GoogleMap>
      
      {/* 컨트롤 패널 */}
      <MapControls
        onSearch={handleSearch}
        onFilter={handleFilter}
        onDrawPath={handleDrawPath}
      />
    </div>
  );
}
```

#### 유틸리티 함수
```typescript
// lib/mapUtils.ts
export function clusterMemories(
  memories: Memory[],
  radius: number
): Cluster[] {
  // K-means 또는 DBSCAN 알고리즘 사용
  // 가까운 메모리들을 그룹화
}

export function calculatePath(
  memoryIds: string[],
  memories: Memory[]
): Path {
  // 메모리들을 시간순으로 정렬하여 경로 계산
  // TSP (Traveling Salesman Problem) 알고리즘 적용 가능
}
```

### 📱 사용 시나리오

**시나리오 1: 여행 기록**
```
1. 여행 중 각 장소에서 메모리 작성 (자동 위치 저장)
2. 지도 위젯에서 여행 경로 확인
3. 사진과 함께 장소별 추억 정리
4. 경로 그리기로 여행 루트 시각화
```

**시나리오 2: 지역별 아이디어 수집**
```
1. 카페/서점 등에서 아이디어 메모리 작성
2. 지도에서 아이디어 밀집 지역 발견
3. 지역별 주제 패턴 분석
4. 새로운 영감 장소 발견
```

---

## 3. 📊 통계 대시보드 위젯 (Stats Dashboard)

### 📋 기본 개념
메모리 데이터를 다양한 차트와 그래프로 시각화하여 생각 패턴, 생산성, 감정 추이 등을 분석.

### 🎯 핵심 기능

#### 3.1 메트릭 카드
- **총 메모리 수**: 전체/기간별 카운트
- **평균 작성량**: 일/주/월 평균
- **가장 활발한 시간**: 시간대별 분포
- **태그 통계**: 인기 태그 Top 10
- **연결 통계**: 평균 연결 수

#### 3.2 차트
- **파이 차트**: 카테고리별 분포
- **바 차트**: 시간대별/요일별 작성량
- **라인 차트**: 시간에 따른 추이
- **히트맵**: 요일×시간대 작성 패턴
- **워드 클라우드**: 태그 빈도 시각화

#### 3.3 필터링
- **기간 선택**: 일/주/월/년/전체
- **페르소나 필터**: 특정 페르소나만
- **태그 필터**: 특정 태그 포함
- **자동 새로고침**: 실시간 업데이트

### 🎨 UI 디자인

```
┌─────────────────────────────────────────┐
│ 📊 통계 대시보드          [⚙️] [×]     │
├─────────────────────────────────────────┤
│ [오늘 ▼]  [자동 새로고침 ✓]            │
├─────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │ 총  │ │ 평균│ │ 최고│ │ 연결│       │
│ │ 234 │ │ 12  │ │ 15시│ │ 3.2 │       │
│ │개   │ │개/일│ │     │ │개   │       │
│ └─────┘ └─────┘ └─────┘ └─────┘       │
│                                         │
│  [📊 카테고리 분포]                     │
│  ┌─────────────────────┐               │
│  │  아이디어 ████ 45%  │               │
│  │  업무     ███  30%  │               │
│  │  감정     ██   15%  │               │
│  │  기록     █    10%  │               │
│  └─────────────────────┘               │
│                                         │
│  [📈 시간대별 작성량]                   │
│  ┌─────────────────────┐               │
│  │     ▁▃▅▇█▇▅▃▁      │               │
│  │  0  6 12 18 24시    │               │
│  └─────────────────────┘               │
│                                         │
└─────────────────────────────────────────┘
```

### 💻 구현 상세

#### 데이터 구조
```typescript
interface StatsBlockConfig {
  id: string;
  type: 'stats';
  x: number;
  y: number;
  width: number;
  height: number;
  
  // 표시할 메트릭
  metrics: Array<{
    type: 'count' | 'average' | 'peak' | 'connections' | 'tags';
    label: string;
    color?: string;
  }>;
  
  // 차트 설정
  charts: Array<{
    type: 'pie' | 'bar' | 'line' | 'heatmap' | 'cloud';
    title: string;
    dataSource: 'category' | 'time' | 'emotion' | 'tags' | 'persona';
    timeRange: 'day' | 'week' | 'month' | 'year' | 'all';
    position: { row: number; col: number; span: number };
  }>;
  
  // 필터
  filters: {
    timeRange: { start?: number; end?: number };
    personas?: string[];
    tags?: string[];
    nature?: string[];
  };
  
  // 업데이트
  autoRefresh: boolean;
  refreshInterval: number;  // 초 단위
}
```

#### 컴포넌트 구조
```typescript
// components/StatsBlock.tsx
import { PieChart, BarChart, LineChart, Cell } from 'recharts';

export default function StatsBlock({
  blockId,
  config,
  memories,
  onUpdate,
}: StatsBlockProps) {
  // 메트릭 계산
  const metrics = useMemo(() => {
    return config.metrics.map(metric => {
      switch (metric.type) {
        case 'count':
          return {
            ...metric,
            value: filteredMemories.length,
          };
        case 'average':
          return {
            ...metric,
            value: calculateAverage(filteredMemories, config.filters.timeRange),
          };
        case 'peak':
          return {
            ...metric,
            value: findPeakTime(filteredMemories),
          };
        // ...
      }
    });
  }, [config, memories]);
  
  // 차트 데이터 준비
  const chartData = useMemo(() => {
    return config.charts.map(chart => {
      switch (chart.type) {
        case 'pie':
          return preparePieData(filteredMemories, chart.dataSource);
        case 'bar':
          return prepareBarData(filteredMemories, chart.dataSource);
        // ...
      }
    });
  }, [config, memories]);
  
  // 자동 새로고침
  useEffect(() => {
    if (!config.autoRefresh) return;
    const interval = setInterval(() => {
      // 데이터 다시 계산
      refreshData();
    }, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [config]);
  
  return (
    <div className="stats-block">
      {/* 메트릭 카드 */}
      <div className="metrics-grid">
        {metrics.map(metric => (
          <MetricCard key={metric.type} {...metric} />
        ))}
      </div>
      
      {/* 차트 */}
      <div className="charts-grid">
        {config.charts.map((chart, index) => (
          <ChartContainer key={index} chart={chart} data={chartData[index]}>
            {chart.type === 'pie' && <PieChart data={chartData[index]} />}
            {chart.type === 'bar' && <BarChart data={chartData[index]} />}
            {chart.type === 'line' && <LineChart data={chartData[index]} />}
            {/* ... */}
          </ChartContainer>
        ))}
      </div>
    </div>
  );
}
```

#### 데이터 처리 함수
```typescript
// lib/statsUtils.ts
export function preparePieData(
  memories: Memory[],
  dataSource: string
): PieData[] {
  const grouped = groupBy(memories, dataSource);
  return Object.entries(grouped).map(([key, items]) => ({
    name: key,
    value: items.length,
    percentage: (items.length / memories.length) * 100,
  }));
}

export function prepareBarData(
  memories: Memory[],
  dataSource: string
): BarData[] {
  // 시간대별, 요일별 등으로 그룹화
  const grouped = groupByTime(memories, dataSource);
  return Object.entries(grouped).map(([time, items]) => ({
    time,
    count: items.length,
  }));
}

export function findPeakTime(memories: Memory[]): string {
  const hourly = groupByHour(memories);
  const maxHour = Object.entries(hourly)
    .sort(([, a], [, b]) => b.length - a.length)[0][0];
  return `${maxHour}시`;
}
```

---

## 4. 🔍 검색 위젯 (Search Widget)

### 📋 기본 개념
캔버스에 고정된 검색창으로 빠르게 메모리를 찾고, 검색 결과를 바로 확인.

### 🎯 핵심 기능

#### 4.1 검색 기능
- **실시간 검색**: 타이핑 즉시 결과 표시
- **고급 검색**: AND/OR 연산자 지원
- **태그 검색**: `#태그` 형식
- **날짜 검색**: `date:2024-01-01` 형식
- **페르소나 검색**: `persona:업무` 형식

#### 4.2 검색 결과
- **카드 미리보기**: 검색 결과를 카드로 표시
- **하이라이트**: 검색어 하이라이트
- **정렬**: 관련도/날짜/제목 정렬
- **필터**: 결과에서 추가 필터링
- **빠른 액션**: 클릭으로 메모리로 이동

#### 4.3 검색 히스토리
- **최근 검색**: 최근 검색어 저장
- **저장된 검색**: 자주 쓰는 검색 저장
- **자동완성**: 검색어 제안

### 🎨 UI 디자인

```
┌─────────────────────────────────────────┐
│ 🔍 검색                    [⚙️] [×]     │
├─────────────────────────────────────────┤
│ [🔍 아이디어 검색...]  [고급 검색 ▼]   │
├─────────────────────────────────────────┤
│                                         │
│  📝 아이디어 프로젝트                    │
│     "새로운 프로젝트 아이디어를..."      │
│     [보기] [연결]                       │
│                                         │
│  📝 아이디어 정리                       │
│     "오늘 생각한 아이디어들을..."        │
│     [보기] [연결]                       │
│                                         │
│  📝 아이디어 회의                        │
│     "팀 회의에서 나온 아이디어..."       │
│     [보기] [연결]                       │
│                                         │
│  [더 보기 (12개)]                       │
│                                         │
│  최근 검색:                             │
│  #프로젝트  업무  오늘                   │
│                                         │
└─────────────────────────────────────────┘
```

### 💻 구현 상세

#### 데이터 구조
```typescript
interface SearchBlockConfig {
  id: string;
  type: 'search';
  x: number;
  y: number;
  width: number;
  height: number;
  
  // 검색 설정
  placeholder: string;
  maxResults: number;
  showHistory: boolean;
  autoComplete: boolean;
  
  // 필터 옵션
  defaultFilters: {
    dateRange?: { start?: number; end?: number };
    personas?: string[];
    tags?: string[];
  };
  
  // 결과 표시
  resultLayout: 'list' | 'grid' | 'compact';
  showPreview: boolean;
  highlightQuery: boolean;
  
  // 저장된 검색
  savedSearches: Array<{
    id: string;
    name: string;
    query: string;
    filters: any;
  }>;
}
```

#### 컴포넌트 구조
```typescript
// components/SearchBlock.tsx
import { useDebounce } from '@/hooks/useDebounce';
import Fuse from 'fuse.js';

export default function SearchBlock({
  blockId,
  config,
  memories,
  onUpdate,
}: SearchBlockProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Memory[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  
  // Fuse.js로 퍼지 검색
  const fuse = useMemo(() => {
    return new Fuse(memories, {
      keys: ['title', 'content', 'tags', 'nature'],
      threshold: 0.3,
      includeScore: true,
    });
  }, [memories]);
  
  // 디바운스된 검색
  const debouncedQuery = useDebounce(query, 300);
  
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    
    // 검색 실행
    const searchResults = fuse.search(debouncedQuery);
    setResults(searchResults.slice(0, config.maxResults).map(r => r.item));
    
    // 히스토리에 추가
    if (debouncedQuery && !history.includes(debouncedQuery)) {
      setHistory(prev => [debouncedQuery, ...prev.slice(0, 9)]);
    }
  }, [debouncedQuery, fuse, config.maxResults]);
  
  // 고급 검색 파싱
  const parseAdvancedQuery = (q: string) => {
    const parts = {
      text: '',
      tags: [] as string[],
      date: null as { start?: number; end?: number } | null,
      persona: null as string | null,
    };
    
    // #태그 추출
    const tagMatches = q.match(/#(\w+)/g);
    if (tagMatches) {
      parts.tags = tagMatches.map(t => t.slice(1));
      q = q.replace(/#\w+/g, '').trim();
    }
    
    // date: 추출
    const dateMatch = q.match(/date:(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      parts.date = { start: new Date(dateMatch[1]).getTime() };
      q = q.replace(/date:\d{4}-\d{2}-\d{2}/g, '').trim();
    }
    
    // persona: 추출
    const personaMatch = q.match(/persona:(\w+)/);
    if (personaMatch) {
      parts.persona = personaMatch[1];
      q = q.replace(/persona:\w+/g, '').trim();
    }
    
    parts.text = q;
    return parts;
  };
  
  return (
    <div className="search-block">
      {/* 검색 입력 */}
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={config.placeholder}
          className="search-input"
        />
        {config.autoComplete && (
          <AutocompleteSuggestions
            query={query}
            memories={memories}
            onSelect={(suggestion) => setQuery(suggestion)}
          />
        )}
      </div>
      
      {/* 검색 결과 */}
      {results.length > 0 && (
        <div className="search-results">
          {results.map(memory => (
            <SearchResultCard
              key={memory.id}
              memory={memory}
              query={query}
              highlight={config.highlightQuery}
              onClick={() => handleMemoryClick(memory.id)}
            />
          ))}
        </div>
      )}
      
      {/* 검색 히스토리 */}
      {config.showHistory && history.length > 0 && (
        <div className="search-history">
          <div className="history-label">최근 검색:</div>
          {history.map((term, index) => (
            <button
              key={index}
              onClick={() => setQuery(term)}
              className="history-item"
            >
              {term}
            </button>
          ))}
        </div>
      )}
      
      {/* 저장된 검색 */}
      {config.savedSearches.length > 0 && (
        <div className="saved-searches">
          {config.savedSearches.map(saved => (
            <button
              key={saved.id}
              onClick={() => {
                setQuery(saved.query);
                // 필터 적용
              }}
              className="saved-search-item"
            >
              {saved.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 5. 🎯 목표 추적 위젯 (Goal Tracker Widget)

### 📋 기본 개념
목표(Goal)의 진행 상황을 시각화하고, 관련 메모리를 자동으로 연결하여 목표 달성 과정을 추적.

### 🎯 핵심 기능

#### 5.1 목표 표시
- **목표 카드**: 목표별 카드 표시
- **진행률 바**: 0-100% 진행률 시각화
- **마일스톤**: 체크리스트 형태
- **남은 시간**: 데드라인까지 남은 시간
- **상태 표시**: 활성/완료/보관

#### 5.2 메모리 연결
- **자동 연결**: 목표 관련 메모리 자동 감지
- **수동 연결**: 드래그로 메모리 연결
- **연결 표시**: 관련 메모리 목록
- **진행 업데이트**: 메모리 작성 시 진행률 자동 업데이트

#### 5.3 액션
- **마일스톤 체크**: 완료 표시
- **진행률 수정**: 수동으로 진행률 조정
- **목표 편집**: 제목/설명/데드라인 수정
- **목표 완료**: 완료 처리

### 🎨 UI 디자인

```
┌─────────────────────────────────────────┐
│ 🎯 목표 추적                [⚙️] [×]     │
├─────────────────────────────────────────┤
│                                         │
│  📚 책 읽기 습관 만들기                  │
│  ████████████░░░░░░░░  60%             │
│  📅 2024.12.31까지                       │
│                                         │
│  ✓ 주 1권 읽기                          │
│  ✓ 독서 노트 작성                        │
│  ☐ 10권 완독                            │
│  ☐ 독서 모임 참여                        │
│                                         │
│  관련 메모리 (5개):                      │
│  📝 오늘 읽은 책...  [보기]              │
│  📝 독서 노트 정리... [보기]             │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  💼 프로젝트 완료                        │
│  ████████████████████  100% ✓          │
│                                         │
└─────────────────────────────────────────┘
```

### 💻 구현 상세

#### 데이터 구조
```typescript
interface GoalTrackerBlockConfig {
  id: string;
  type: 'goal-tracker';
  x: number;
  y: number;
  width: number;
  height: number;
  
  // 목표 설정
  goalIds: string[];  // 표시할 목표 ID들
  showCompleted: boolean;  // 완료된 목표 표시
  showArchived: boolean;   // 보관된 목표 표시
  
  // 표시 옵션
  showProgress: boolean;
  showMilestones: boolean;
  showRelatedMemories: boolean;
  showDeadline: boolean;
  
  // 레이아웃
  layout: 'list' | 'grid' | 'timeline';
  cardSize: 'small' | 'medium' | 'large';
  
  // 자동 업데이트
  autoLinkMemories: boolean;
  autoUpdateProgress: boolean;
}
```

#### 컴포넌트 구조
```typescript
// components/GoalTrackerBlock.tsx
export default function GoalTrackerBlock({
  blockId,
  config,
  goals,
  memories,
  onUpdate,
}: GoalTrackerBlockProps) {
  // 목표 필터링
  const displayedGoals = useMemo(() => {
    return goals.filter(goal => {
      if (config.goalIds.length > 0 && !config.goalIds.includes(goal.id)) {
        return false;
      }
      if (goal.status === 'completed' && !config.showCompleted) {
        return false;
      }
      if (goal.status === 'archived' && !config.showArchived) {
        return false;
      }
      return true;
    });
  }, [goals, config]);
  
  // 목표별 관련 메모리 찾기
  const goalMemories = useMemo(() => {
    const map = new Map<string, Memory[]>();
    displayedGoals.forEach(goal => {
      const related = memories.filter(m => 
        goal.sourceMemoryIds.includes(m.id) ||
        (config.autoLinkMemories && isMemoryRelatedToGoal(m, goal))
      );
      map.set(goal.id, related);
    });
    return map;
  }, [displayedGoals, memories, config]);
  
  // 진행률 계산
  const calculateProgress = (goal: Goal): number => {
    if (goal.milestones && goal.milestones.length > 0) {
      const completed = goal.milestones.filter(m => m.completed).length;
      return (completed / goal.milestones.length) * 100;
    }
    return goal.progress;
  };
  
  return (
    <div className="goal-tracker-block">
      {displayedGoals.map(goal => {
        const progress = calculateProgress(goal);
        const relatedMemories = goalMemories.get(goal.id) || [];
        const daysLeft = goal.targetDate
          ? Math.ceil((goal.targetDate - Date.now()) / (1000 * 60 * 60 * 24))
          : null;
        
        return (
          <GoalCard
            key={goal.id}
            goal={goal}
            progress={progress}
            daysLeft={daysLeft}
            relatedMemories={relatedMemories}
            showProgress={config.showProgress}
            showMilestones={config.showMilestones}
            showRelatedMemories={config.showRelatedMemories}
            showDeadline={config.showDeadline}
            onMilestoneToggle={(milestoneId) => {
              handleMilestoneToggle(goal.id, milestoneId);
            }}
            onProgressUpdate={(newProgress) => {
              handleProgressUpdate(goal.id, newProgress);
            }}
            onMemoryClick={(memoryId) => {
              handleMemoryClick(memoryId);
            }}
          />
        );
      })}
    </div>
  );
}
```

#### 유틸리티 함수
```typescript
// lib/goalUtils.ts
export function isMemoryRelatedToGoal(
  memory: Memory,
  goal: Goal
): boolean {
  // 제목/내용에서 목표 키워드 매칭
  const goalKeywords = extractKeywords(goal.title, goal.description);
  const memoryText = `${memory.title} ${memory.content}`.toLowerCase();
  
  return goalKeywords.some(keyword =>
    memoryText.includes(keyword.toLowerCase())
  );
}

export function extractKeywords(...texts: string[]): string[] {
  // 간단한 키워드 추출 (실제로는 NLP 사용 가능)
  const allText = texts.join(' ');
  const words = allText.split(/\s+/).filter(w => w.length > 2);
  return [...new Set(words)];
}
```

---

## 6. 🎨 스티커/노트 위젯 (Sticky Note Widget)

### 📋 기본 개념
빠른 메모를 위한 미니멀한 스티커 노트. 메모리보다 가볍고 빠르게 작성.

### 🎯 핵심 기능

#### 6.1 빠른 작성
- **원클릭 생성**: 클릭으로 즉시 생성
- **인라인 편집**: 더블클릭으로 바로 편집
- **자동 저장**: 입력 즉시 저장
- **최소 UI**: 간단한 텍스트만

#### 6.2 스타일
- **색상 선택**: 8가지 색상
- **크기 조절**: S/M/L 3단계
- **폰트 크기**: 작게/보통/크게
- **투명도**: 반투명 효과

#### 6.3 변환
- **메모리로 변환**: 스티커를 메모리로 전환
- **연결**: 다른 메모리/스티커와 연결
- **그룹화**: 여러 스티커를 그룹으로 묶기

### 🎨 UI 디자인

```
┌─────────────┐
│ 📝 스티커    │
│             │
│ 빠른 아이디어│
│ 메모        │
│             │
│             │
└─────────────┘
```

### 💻 구현 상세

#### 데이터 구조
```typescript
interface StickyNoteBlockConfig {
  id: string;
  type: 'sticky-note';
  x: number;
  y: number;
  width: number;
  height: number;
  
  // 내용
  content: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  
  // 스타일
  fontSize: 'small' | 'medium' | 'large';
  opacity: number;  // 0-1
  
  // 변환
  convertedToMemoryId?: string;  // 메모리로 변환된 경우
  linkedNoteIds: string[];  // 연결된 다른 노트들
}
```

#### 컴포넌트 구조
```typescript
// components/StickyNoteBlock.tsx
export default function StickyNoteBlock({
  blockId,
  config,
  onUpdate,
  onDelete,
  onConvert,
}: StickyNoteBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(config.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 더블클릭으로 편집 시작
  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };
  
  // 자동 저장
  const handleBlur = () => {
    setIsEditing(false);
    if (content !== config.content) {
      onUpdate(blockId, { config: { ...config, content } });
    }
  };
  
  // 메모리로 변환
  const handleConvert = async () => {
    const memory = await createMemoryFromNote(config);
    onConvert(blockId, memory.id);
  };
  
  const colorClasses = {
    yellow: 'bg-yellow-200 border-yellow-300',
    pink: 'bg-pink-200 border-pink-300',
    blue: 'bg-blue-200 border-blue-300',
    green: 'bg-green-200 border-green-300',
    purple: 'bg-purple-200 border-purple-300',
    orange: 'bg-orange-200 border-orange-300',
    red: 'bg-red-200 border-red-300',
    gray: 'bg-gray-200 border-gray-300',
  };
  
  return (
    <div
      className={`sticky-note ${colorClasses[config.color]}`}
      style={{
        opacity: config.opacity,
        fontSize: config.fontSize === 'small' ? '12px' : 
                  config.fontSize === 'large' ? '16px' : '14px',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          className="sticky-note-textarea"
          autoFocus
        />
      ) : (
        <div className="sticky-note-content">
          {content || <span className="placeholder">더블클릭하여 작성...</span>}
        </div>
      )}
      
      {/* 컨텍스트 메뉴 */}
      <div className="sticky-note-menu">
        <button onClick={handleConvert}>📝 메모리로</button>
        <button onClick={() => onDelete(blockId)}>🗑️ 삭제</button>
      </div>
    </div>
  );
}
```

---

## 7. 🔗 링크 컬렉션 위젯 (Link Collection Widget)

### 📋 기본 개념
북마크와 웹 링크를 모아서 관리하고, 메모리와 연결하여 참고 자료로 활용.

### 🎯 핵심 기능

#### 7.1 링크 관리
- **링크 추가**: URL 입력 또는 드래그 앤 드롭
- **미리보기**: og:image, 제목, 설명 자동 추출
- **카테고리**: 태그/폴더로 분류
- **검색**: 링크 내 검색
- **정렬**: 날짜/제목/방문 횟수

#### 7.2 메모리 연결
- **자동 연결**: 메모리 내용에서 URL 추출
- **수동 연결**: 드래그로 메모리와 연결
- **연결 표시**: 메모리에서 관련 링크 보기

#### 7.3 뷰어 연동
- **뷰어 열기**: 링크 클릭 시 뷰어 블록에서 열기
- **히스토리**: 방문한 링크 기록
- **오프라인**: 캐시된 콘텐츠 오프라인 보기

### 🎨 UI 디자인

```
┌─────────────────────────────────────────┐
│ 🔗 링크 컬렉션              [⚙️] [×]     │
├─────────────────────────────────────────┤
│ [+ 링크 추가]  [🔍 검색...]  [태그 ▼]   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [이미지]                         │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
│  📄 React 공식 문서                      │
│  https://react.dev                      │
│  참고 자료, 프론트엔드                   │
│  [열기] [연결] [삭제]                   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [이미지]                         │   │
│  └─────────────────────────────────┘   │
│  📄 TypeScript 가이드                   │
│  https://typescriptlang.org            │
│  학습, 참고 자료                        │
│  [열기] [연결] [삭제]                   │
│                                         │
└─────────────────────────────────────────┘
```

### 💻 구현 상세

#### 데이터 구조
```typescript
interface LinkCollectionBlockConfig {
  id: string;
  type: 'link-collection';
  x: number;
  y: number;
  width: number;
  height: number;
  
  // 링크 목록
  links: Array<{
    id: string;
    url: string;
    title: string;
    description?: string;
    image?: string;
    tags: string[];
    createdAt: number;
    visitCount: number;
    lastVisited?: number;
    linkedMemoryIds: string[];
  }>;
  
  // 표시 옵션
  layout: 'list' | 'grid' | 'compact';
  showPreview: boolean;
  showTags: boolean;
  showVisitCount: boolean;
  
  // 필터
  filterByTag?: string;
  searchQuery?: string;
  
  // 자동 수집
  autoCollectFromMemories: boolean;
}
```

#### 컴포넌트 구조
```typescript
// components/LinkCollectionBlock.tsx
export default function LinkCollectionBlock({
  blockId,
  config,
  memories,
  onUpdate,
}: LinkCollectionBlockProps) {
  // 메모리에서 URL 추출
  useEffect(() => {
    if (!config.autoCollectFromMemories) return;
    
    const extractUrls = (text: string): string[] => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return text.match(urlRegex) || [];
    };
    
    const newUrls: string[] = [];
    memories.forEach(memory => {
      const urls = extractUrls(memory.content);
      urls.forEach(url => {
        if (!config.links.some(l => l.url === url)) {
          newUrls.push(url);
        }
      });
    });
    
    if (newUrls.length > 0) {
      // URL 메타데이터 가져오기
      fetchLinkMetadata(newUrls).then(metadata => {
        const newLinks = metadata.map(meta => ({
          id: generateId(),
          url: meta.url,
          title: meta.title,
          description: meta.description,
          image: meta.image,
          tags: [],
          createdAt: Date.now(),
          visitCount: 0,
          linkedMemoryIds: [],
        }));
        
        onUpdate(blockId, {
          config: {
            ...config,
            links: [...config.links, ...newLinks],
          },
        });
      });
    }
  }, [memories, config, blockId, onUpdate]);
  
  // 링크 미리보기
  const fetchLinkMetadata = async (urls: string[]): Promise<LinkMetadata[]> => {
    // 서버 API로 메타데이터 가져오기
    const res = await fetch('/api/links/metadata', {
      method: 'POST',
      body: JSON.stringify({ urls }),
    });
    return res.json();
  };
  
  // 필터링된 링크
  const filteredLinks = useMemo(() => {
    let links = config.links;
    
    if (config.filterByTag) {
      links = links.filter(l => l.tags.includes(config.filterByTag));
    }
    
    if (config.searchQuery) {
      const query = config.searchQuery.toLowerCase();
      links = links.filter(l =>
        l.title.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query) ||
        l.url.toLowerCase().includes(query)
      );
    }
    
    return links;
  }, [config]);
  
  return (
    <div className="link-collection-block">
      {/* 헤더 */}
      <div className="link-collection-header">
        <button onClick={handleAddLink}>+ 링크 추가</button>
        <input
          type="text"
          placeholder="🔍 검색..."
          value={config.searchQuery || ''}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <select
          value={config.filterByTag || ''}
          onChange={(e) => handleFilterByTag(e.target.value)}
        >
          <option value="">모든 태그</option>
          {getAllTags(config.links).map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>
      
      {/* 링크 목록 */}
      <div className={`link-list ${config.layout}`}>
        {filteredLinks.map(link => (
          <LinkCard
            key={link.id}
            link={link}
            showPreview={config.showPreview}
            showTags={config.showTags}
            showVisitCount={config.showVisitCount}
            onOpen={() => handleOpenLink(link)}
            onConnect={() => handleConnectToMemory(link)}
            onDelete={() => handleDeleteLink(link.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

#### API 엔드포인트
```typescript
// app/api/links/metadata/route.ts
export async function POST(req: Request) {
  const { urls } = await req.json();
  
  const metadata = await Promise.all(
    urls.map(async (url: string) => {
      try {
        // og: 태그 추출
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        return {
          url,
          title: $('meta[property="og:title"]').attr('content') || $('title').text(),
          description: $('meta[property="og:description"]').attr('content') || '',
          image: $('meta[property="og:image"]').attr('content') || '',
        };
      } catch (error) {
        return { url, title: url, description: '', image: '' };
      }
    })
  );
  
  return Response.json(metadata);
}
```

---

## 8. 🎵 미디어 갤러리 위젯 (Media Gallery Widget)

### 📋 기본 개념
이미지와 비디오를 갤러리 형태로 모아서 보여주고, 메모리 첨부파일을 자동으로 수집.

### 🎯 핵심 기능

#### 8.1 갤러리 뷰
- **그리드 뷰**: 썸네일 그리드
- **리스트 뷰**: 상세 정보와 함께
- **라이트박스**: 클릭 시 전체 화면 보기
- **슬라이드쇼**: 자동 재생
- **줌**: 이미지 확대

#### 8.2 미디어 관리
- **자동 수집**: 메모리 첨부파일 자동 추가
- **수동 추가**: 드래그 앤 드롭
- **태그**: 미디어별 태그 추가
- **검색**: 태그/날짜로 검색
- **정렬**: 날짜/이름/크기

#### 8.3 메모리 연결
- **원본 메모리**: 미디어가 첨부된 메모리로 이동
- **연결 표시**: 관련 메모리 목록
- **메타데이터**: 촬영 날짜, 위치 등

### 🎨 UI 디자인

```
┌─────────────────────────────────────────┐
│ 🎵 미디어 갤러리            [⚙️] [×]     │
├─────────────────────────────────────────┤
│ [그리드 ▼]  [🔍 검색...]  [+ 추가]      │
├─────────────────────────────────────────┤
│                                         │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐              │
│  │📷 │ │📷 │ │📷 │ │📷 │              │
│  └───┘ └───┘ └───┘ └───┘              │
│                                         │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐              │
│  │📷 │ │📷 │ │📷 │ │📷 │              │
│  └───┘ └───┘ └───┘ └───┘              │
│                                         │
│  [더 보기 (24개)]                       │
│                                         │
└─────────────────────────────────────────┘
```

### 💻 구현 상세

#### 데이터 구조
```typescript
interface MediaGalleryBlockConfig {
  id: string;
  type: 'media-gallery';
  x: number;
  y: number;
  width: number;
  height: number;
  
  // 미디어 목록
  media: Array<{
    id: string;
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
    filename: string;
    size: number;
    mimeType: string;
    createdAt: number;
    tags: string[];
    linkedMemoryIds: string[];
    metadata?: {
      width?: number;
      height?: number;
      duration?: number;  // 비디오
      location?: { lat: number; lng: number };
    };
  }>;
  
  // 표시 옵션
  layout: 'grid' | 'list' | 'masonry';
  thumbnailSize: 'small' | 'medium' | 'large';
  showMetadata: boolean;
  showTags: boolean;
  
  // 자동 수집
  autoCollectFromMemories: boolean;
  mediaTypes: ('image' | 'video' | 'audio' | 'document')[];
  
  // 필터
  filterByTag?: string;
  searchQuery?: string;
  dateRange?: { start?: number; end?: number };
}
```

#### 컴포넌트 구조
```typescript
// components/MediaGalleryBlock.tsx
export default function MediaGalleryBlock({
  blockId,
  config,
  memories,
  onUpdate,
}: MediaGalleryBlockProps) {
  // 메모리에서 미디어 수집
  useEffect(() => {
    if (!config.autoCollectFromMemories) return;
    
    const collectMedia = () => {
      const newMedia: MediaItem[] = [];
      
      memories.forEach(memory => {
        memory.attachments?.forEach(attachment => {
          if (config.mediaTypes.includes(getMediaType(attachment.mimetype))) {
            if (!config.media.find(m => m.url === attachment.filepath)) {
              newMedia.push({
                id: generateId(),
                type: getMediaType(attachment.mimetype) as 'image' | 'video',
                url: attachment.filepath,
                filename: attachment.filename,
                size: attachment.size,
                mimeType: attachment.mimetype,
                createdAt: attachment.createdAt,
                tags: [],
                linkedMemoryIds: [memory.id],
              });
            }
          }
        });
      });
      
      if (newMedia.length > 0) {
        // 썸네일 생성
        generateThumbnails(newMedia).then(mediaWithThumbnails => {
          onUpdate(blockId, {
            config: {
              ...config,
              media: [...config.media, ...mediaWithThumbnails],
            },
          });
        });
      }
    };
    
    collectMedia();
  }, [memories, config, blockId, onUpdate]);
  
  // 라이트박스 상태
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  return (
    <div className="media-gallery-block">
      {/* 헤더 */}
      <div className="gallery-header">
        <select
          value={config.layout}
          onChange={(e) => handleLayoutChange(e.target.value)}
        >
          <option value="grid">그리드</option>
          <option value="list">리스트</option>
          <option value="masonry">매슨리</option>
        </select>
        <input
          type="text"
          placeholder="🔍 검색..."
          value={config.searchQuery || ''}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <button onClick={handleAddMedia}>+ 추가</button>
      </div>
      
      {/* 갤러리 */}
      <div className={`gallery-${config.layout}`}>
        {filteredMedia.map((item, index) => (
          <MediaThumbnail
            key={item.id}
            item={item}
            size={config.thumbnailSize}
            showMetadata={config.showMetadata}
            onClick={() => setLightboxIndex(index)}
            onTagClick={(tag) => handleFilterByTag(tag)}
            onMemoryClick={(memoryId) => handleMemoryClick(memoryId)}
          />
        ))}
      </div>
      
      {/* 라이트박스 */}
      {lightboxIndex !== null && (
        <Lightbox
          media={filteredMedia}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNext={() => setLightboxIndex((lightboxIndex + 1) % filteredMedia.length)}
          onPrev={() => setLightboxIndex((lightboxIndex - 1 + filteredMedia.length) % filteredMedia.length)}
        />
      )}
    </div>
  );
}
```

---

## 9. 🤖 AI 어시스턴트 위젯 (AI Assistant Widget)

### 📋 기본 개념
채팅 인터페이스로 AI와 대화하며, 현재 보드의 컨텍스트를 이해하여 도움을 제공.

### 🎯 핵심 기능

#### 9.1 채팅 인터페이스
- **대화창**: 메시지 히스토리 표시
- **입력창**: 질문/요청 입력
- **빠른 액션**: 자주 쓰는 액션 버튼
- **컨텍스트 인식**: 현재 보드의 메모리 자동 포함

#### 9.2 AI 기능
- **질문 답변**: 메모리 기반 답변
- **요약**: 선택한 메모리 요약
- **연결 제안**: 관련 메모리 찾기
- **글 작성**: 주제 기반 글 생성
- **아이디어 발전**: 아이디어 확장

#### 9.3 빠른 액션
- "오늘 요약해줘"
- "비슷한 생각 찾아줘"
- "막힌 부분 찾아줘"
- "이 주제로 글 써줘"
- "연결 제안해줘"

### 🎨 UI 디자인

```
┌─────────────────────────────────────────┐
│ 🤖 AI 어시스턴트            [⚙️] [×]     │
├─────────────────────────────────────────┤
│                                         │
│  👤 오늘 작성한 메모리 요약해줘          │
│                                         │
│  🤖 오늘 총 12개의 메모리를 작성하셨네요!│
│     주요 주제는:                        │
│     • 프로젝트 아이디어 (5개)           │
│     • 회의록 (3개)                      │
│     • 개인 일기 (4개)                   │
│                                         │
│     가장 활발한 시간대는 오후 2-4시였고,│
│     프로젝트 관련 아이디어가 많았습니다. │
│                                         │
│  [빠른 액션]                            │
│  [📊 통계] [🔗 연결] [✍️ 글쓰기]        │
│                                         │
│  [💬 메시지 입력...]                    │
│                                         │
└─────────────────────────────────────────┘
```

### 💻 구현 상세

#### 데이터 구조
```typescript
interface AIAssistantBlockConfig {
  id: string;
  type: 'ai-assistant';
  x: number;
  y: number;
  width: number;
  height: number;
  
  // 대화 히스토리
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    context?: {
      memoryIds?: string[];
      action?: string;
    };
  }>;
  
  // 설정
  model: 'gpt-4' | 'gpt-3.5' | 'claude';
  temperature: number;
  maxTokens: number;
  
  // 컨텍스트
  includeContext: boolean;
  contextMemoryIds: string[];  // 항상 포함할 메모리
  autoIncludeRecent: boolean;   // 최근 메모리 자동 포함
  recentCount: number;
  
  // 빠른 액션
  quickActions: Array<{
    id: string;
    label: string;
    prompt: string;
    icon?: string;
  }>;
}
```

#### 컴포넌트 구조
```typescript
// components/AIAssistantBlock.tsx
export default function AIAssistantBlock({
  blockId,
  config,
  memories,
  onUpdate,
}: AIAssistantBlockProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 컨텍스트 준비
  const prepareContext = useCallback(() => {
    let contextMemories = memories;
    
    if (config.contextMemoryIds.length > 0) {
      contextMemories = memories.filter(m =>
        config.contextMemoryIds.includes(m.id)
      );
    }
    
    if (config.autoIncludeRecent) {
      const recent = memories
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, config.recentCount);
      contextMemories = [...new Set([...contextMemories, ...recent])];
    }
    
    return contextMemories.map(m => ({
      id: m.id,
      title: m.title,
      content: m.content.slice(0, 500),  // 처음 500자만
      createdAt: m.createdAt,
    }));
  }, [memories, config]);
  
  // 메시지 전송
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = {
      id: generateId(),
      role: 'user' as const,
      content: input,
      timestamp: Date.now(),
    };
    
    // 메시지 추가
    const updatedMessages = [...config.messages, userMessage];
    onUpdate(blockId, {
      config: { ...config, messages: updatedMessages },
    });
    
    setInput('');
    setIsLoading(true);
    
    try {
      // 컨텍스트 준비
      const context = config.includeContext ? prepareContext() : [];
      
      // AI API 호출
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          context,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        }),
      });
      
      const data = await response.json();
      
      const assistantMessage = {
        id: generateId(),
        role: 'assistant' as const,
        content: data.content,
        timestamp: Date.now(),
        context: data.context,
      };
      
      onUpdate(blockId, {
        config: {
          ...config,
          messages: [...updatedMessages, assistantMessage],
        },
      });
    } catch (error) {
      console.error('AI chat error:', error);
      // 에러 메시지 추가
    } finally {
      setIsLoading(false);
    }
  };
  
  // 빠른 액션
  const handleQuickAction = async (action: QuickAction) => {
    setInput(action.prompt);
    // 자동 전송
    setTimeout(() => handleSend(), 100);
  };
  
  // 스크롤을 맨 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [config.messages]);
  
  return (
    <div className="ai-assistant-block">
      {/* 메시지 목록 */}
      <div className="messages-container">
        {config.messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onMemoryClick={(memoryId) => handleMemoryClick(memoryId)}
          />
        ))}
        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 빠른 액션 */}
      {config.quickActions.length > 0 && (
        <div className="quick-actions">
          {config.quickActions.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className="quick-action-btn"
            >
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      )}
      
      {/* 입력창 */}
      <div className="input-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="💬 메시지 입력... (Enter로 전송, Shift+Enter로 줄바꿈)"
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="send-btn"
        >
          전송
        </button>
      </div>
    </div>
  );
}
```

#### API 엔드포인트
```typescript
// app/api/ai/chat/route.ts
export async function POST(req: Request) {
  const { messages, context, model, temperature, maxTokens } = await req.json();
  
  // 시스템 프롬프트에 컨텍스트 추가
  const systemPrompt = `You are a helpful assistant for a personal memory management system.
The user has the following memories in their current context:
${context.map((m: any) => `- ${m.title || 'Untitled'}: ${m.content}`).join('\n')}

Please help the user with their questions about these memories or general assistance.`;
  
  // OpenAI API 호출
  const response = await openai.chat.completions.create({
    model: model || 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: temperature || 0.7,
    max_tokens: maxTokens || 1000,
  });
  
  return Response.json({
    content: response.choices[0].message.content,
    context: {
      memoryIds: context.map((m: any) => m.id),
    },
  });
}
```

---

## 10. 📅 데드라인 위젯 (Deadline Widget)

### 📋 기본 개념
다가오는 마감일과 일정을 표시하고, 메모리에서 날짜를 자동 추출하여 관리.

### 🎯 핵심 기능

#### 10.1 데드라인 표시
- **목록 뷰**: 날짜순 정렬
- **캘린더 뷰**: 캘린더에 표시
- **우선순위**: 긴급도별 색상
- **남은 시간**: D-day 계산
- **알림**: 마감일 전 알림

#### 10.2 날짜 추출
- **자동 추출**: 메모리 내용에서 날짜 찾기
- **패턴 인식**: "내일", "다음 주", "12월 25일" 등
- **연결**: 메모리와 데드라인 연결
- **수동 추가**: 직접 데드라인 추가

#### 10.3 관리
- **완료 처리**: 완료된 데드라인 체크
- **연기**: 날짜 변경
- **삭제**: 데드라인 제거
- **그룹화**: 프로젝트/카테고리별

### 🎨 UI 디자인

```
┌─────────────────────────────────────────┐
│ 📅 데드라인                [⚙️] [×]     │
├─────────────────────────────────────────┤
│ [목록 ▼]  [오늘]  [이번 주]  [전체]     │
├─────────────────────────────────────────┤
│                                         │
│  🔴 긴급                                │
│  ─────────────────────────────────      │
│  📝 프로젝트 제출                       │
│  📅 2024.01.25 (D-3)                    │
│  📄 관련 메모리: 3개                    │
│  [완료] [연기] [보기]                   │
│                                         │
│  🟡 보통                                │
│  ─────────────────────────────────      │
│  📝 회의 준비                           │
│  📅 2024.01.30 (D-8)                    │
│  📄 관련 메모리: 1개                    │
│  [완료] [연기] [보기]                   │
│                                         │
│  🟢 여유                                │
│  ─────────────────────────────────      │
│  📝 문서 작성                           │
│  📅 2024.02.10 (D-19)                   │
│  📄 관련 메모리: 2개                    │
│  [완료] [연기] [보기]                   │
│                                         │
└─────────────────────────────────────────┘
```

### 💻 구현 상세

#### 데이터 구조
```typescript
interface DeadlineBlockConfig {
  id: string;
  type: 'deadline';
  x: number;
  y: number;
  width: number;
  height: number;
  
  // 데드라인 목록
  deadlines: Array<{
    id: string;
    title: string;
    description?: string;
    dueDate: number;  // timestamp
    priority: 'urgent' | 'normal' | 'low';
    completed: boolean;
    completedAt?: number;
    linkedMemoryIds: string[];
    tags: string[];
    reminder?: {
      enabled: boolean;
      beforeDays: number[];  // [1, 3, 7] = 1일 전, 3일 전, 7일 전
    };
  }>;
  
  // 표시 옵션
  viewMode: 'list' | 'calendar';
  showCompleted: boolean;
  groupBy: 'priority' | 'date' | 'none';
  sortBy: 'date' | 'priority' | 'title';
  
  // 자동 추출
  autoExtractFromMemories: boolean;
  extractPatterns: string[];  // 정규식 패턴
}
```

#### 컴포넌트 구조
```typescript
// components/DeadlineBlock.tsx
import { parse } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function DeadlineBlock({
  blockId,
  config,
  memories,
  onUpdate,
}: DeadlineBlockProps) {
  // 메모리에서 날짜 추출
  useEffect(() => {
    if (!config.autoExtractFromMemories) return;
    
    const extractDeadlines = () => {
      const newDeadlines: Deadline[] = [];
      
      memories.forEach(memory => {
        // 날짜 패턴 매칭
        const datePatterns = [
          /\d{4}[-./]\d{1,2}[-./]\d{1,2}/,  // 2024-01-25
          /\d{1,2}월\s*\d{1,2}일/,          // 1월 25일
          /내일|모레|다음\s*주|다음\s*달/,
          /D-day|D-day\s*\d+/,
          /마감|데드라인|제출|완료.*\d+/,
        ];
        
        const text = `${memory.title} ${memory.content}`;
        datePatterns.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) {
            const date = parseDate(matches[0], memory.createdAt);
            if (date && date > Date.now()) {
              // 이미 있는 데드라인인지 확인
              if (!config.deadlines.some(d => 
                d.title === memory.title && 
                Math.abs(d.dueDate - date) < 24 * 60 * 60 * 1000
              )) {
                newDeadlines.push({
                  id: generateId(),
                  title: memory.title || '제목 없음',
                  description: memory.content.slice(0, 100),
                  dueDate: date,
                  priority: calculatePriority(date),
                  completed: false,
                  linkedMemoryIds: [memory.id],
                  tags: [],
                });
              }
            }
          }
        });
      });
      
      if (newDeadlines.length > 0) {
        onUpdate(blockId, {
          config: {
            ...config,
            deadlines: [...config.deadlines, ...newDeadlines],
          },
        });
      }
    };
    
    extractDeadlines();
  }, [memories, config, blockId, onUpdate]);
  
  // 날짜 파싱
  const parseDate = (text: string, baseDate: number): number | null => {
    try {
      // "내일", "다음 주" 등 상대적 날짜
      if (text.includes('내일')) {
        return baseDate + 24 * 60 * 60 * 1000;
      }
      if (text.includes('모레')) {
        return baseDate + 2 * 24 * 60 * 60 * 1000;
      }
      // 절대 날짜 파싱
      const parsed = parse(text, 'yyyy-MM-dd', new Date(baseDate));
      if (!isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    } catch (error) {
      return null;
    }
    return null;
  };
  
  // 우선순위 계산
  const calculatePriority = (dueDate: number): 'urgent' | 'normal' | 'low' => {
    const daysLeft = Math.ceil((dueDate - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) return 'urgent';
    if (daysLeft <= 7) return 'normal';
    return 'low';
  };
  
  // 필터링 및 정렬
  const displayedDeadlines = useMemo(() => {
    let deadlines = config.deadlines.filter(d => 
      config.showCompleted || !d.completed
    );
    
    // 정렬
    deadlines.sort((a, b) => {
      if (config.sortBy === 'date') {
        return a.dueDate - b.dueDate;
      }
      if (config.sortBy === 'priority') {
        const priorityOrder = { urgent: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.title.localeCompare(b.title);
    });
    
    return deadlines;
  }, [config]);
  
  // D-day 계산
  const calculateDaysLeft = (dueDate: number): number => {
    return Math.ceil((dueDate - Date.now()) / (1000 * 60 * 60 * 24));
  };
  
  return (
    <div className="deadline-block">
      {/* 헤더 */}
      <div className="deadline-header">
        <select
          value={config.viewMode}
          onChange={(e) => handleViewModeChange(e.target.value)}
        >
          <option value="list">목록</option>
          <option value="calendar">캘린더</option>
        </select>
        <button onClick={handleAddDeadline}>+ 추가</button>
      </div>
      
      {/* 데드라인 목록 */}
      {config.viewMode === 'list' && (
        <div className="deadline-list">
          {groupDeadlines(displayedDeadlines, config.groupBy).map((group, index) => (
            <div key={index} className="deadline-group">
              {config.groupBy !== 'none' && (
                <div className="group-header">{group.label}</div>
              )}
              {group.deadlines.map(deadline => {
                const daysLeft = calculateDaysLeft(deadline.dueDate);
                return (
                  <DeadlineCard
                    key={deadline.id}
                    deadline={deadline}
                    daysLeft={daysLeft}
                    onComplete={() => handleComplete(deadline.id)}
                    onPostpone={(newDate) => handlePostpone(deadline.id, newDate)}
                    onDelete={() => handleDelete(deadline.id)}
                    onMemoryClick={(memoryId) => handleMemoryClick(memoryId)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
      
      {/* 캘린더 뷰 */}
      {config.viewMode === 'calendar' && (
        <DeadlineCalendar
          deadlines={displayedDeadlines}
          onDeadlineClick={(deadline) => handleDeadlineClick(deadline)}
        />
      )}
    </div>
  );
}
```

---

## 📝 구현 우선순위 요약

### 즉시 구현 가능 (1-2주)
1. **스티커 노트** - 가장 간단, 높은 사용성
2. **검색 위젯** - 기존 검색 기능 확장
3. **링크 컬렉션** - URL 메타데이터 추출만 구현

### 중기 구현 (2-4주)
4. **타임라인 위젯** - 시간축 계산 로직 필요
5. **통계 대시보드** - 차트 라이브러리 연동
6. **목표 추적** - 기존 Goal 시스템 활용

### 장기 구현 (1-2개월)
7. **미디어 갤러리** - 이미지 처리, 썸네일 생성
8. **AI 어시스턴트** - AI API 연동, 컨텍스트 관리
9. **지도 위젯** - 외부 API 연동, 클러스터링
10. **데드라인 위젯** - 날짜 파싱, 알림 시스템

---

**어떤 위젯부터 구현해볼까요?** 🚀
