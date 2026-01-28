// 첨부 파일
export interface Attachment {
  id: string;
  filename: string;         // 원본 파일명
  filepath: string;         // 저장된 경로
  mimetype: string;         // 파일 타입
  size: number;             // 파일 크기 (bytes)
  createdAt: number;        // timestamp
}

// 기억 단위
export interface Memory {
  id: string;
  title?: string;           // 제목 (선택)
  content: string;          // 사용자 입력 원문
  createdAt: number;        // timestamp
  derivedFromCardId?: string; // 요약 파생 출처 카드 ID
  ingestId?: string;        // 원문(IngestItem) 참조 ID

  // AI 자동 분류
  topic?: string;           // 아이디어/업무/커리어/감정/기록
  nature?: string;          // 단순기록/아이디어/요청/고민
  timeContext?: string;     // 당장/언젠가/특정시점

  // 맥락 연결
  relatedMemoryIds?: string[];
  clusterTag?: string;      // 비슷한 주제 묶음 태그

  // 반복 추적
  repeatCount?: number;
  lastMentionedAt?: number; // timestamp

  // 첨부 파일
  attachments?: Attachment[];

  // 출처 정보
  source?: 'gmail' | 'manual' | 'ios-shortcut' | 'workless-web' | string;
  sourceId?: string;       // Gmail messageId 등
  sourceLink?: string;     // Gmail 메일 링크 등
  sourceSender?: string;   // 발신자 이메일
  sourceSubject?: string;  // 메일 제목
  dedupeKey?: string;      // 중복 방지 키
}

// Universal Send API 원문 저장 단위
export interface IngestItem {
  id: string;
  userId: string;
  rawText: string;
  rawMeta?: Record<string, unknown>;
  source: string;
  sourceItemId?: string;
  dedupeKey?: string;
  createdAt: number;
}

// Gmail 메일 정규화 객체
export interface GmailEmail {
  messageId: string;
  threadId?: string;
  subject: string;
  from: string;
  date: string; // ISO
  snippet: string;
  bodyText?: string;
  gmailLink?: string;
}

// 맥락 묶음
export interface Cluster {
  id: string;
  name: string;             // AI가 생성한 묶음 이름
  memoryIds: string[];
  summary?: string;
  createdAt: number;
  updatedAt: number;
}

// 사용자 정의 그룹
export interface Group {
  id: string;
  userId: string;           // 사용자 ID
  name: string;             // 사용자가 지정한 그룹 이름
  color?: string;           // 그룹 색상 (옵션)
  memoryIds: string[];
  isAIGenerated: boolean;   // AI가 자동으로 만든 그룹인지
  createdAt: number;
  updatedAt: number;
}

// 목표
export interface Goal {
  id: string;
  userId: string;           // 사용자 ID
  title: string;            // 목표 제목
  description?: string;     // 목표 설명
  category: 'idea' | 'request' | 'habit';  // 아이디어/요청/습관
  status: 'active' | 'completed' | 'archived';  // 상태
  progress: number;         // 진행률 (0-100)
  sourceMemoryIds: string[]; // 이 목표를 만든 기억들
  milestones?: { text: string; completed: boolean }[];  // 마일스톤
  targetDate?: number;      // 목표 달성 날짜 (timestamp)
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

// 프로젝트 액션 단위
export interface ProjectAction {
  id: string;
  text: string;
  duration?: string;      // 예상 소요 시간 (예: "1h", "30m")
  completed: boolean;
}

// 프로젝트 마일스톤 (단계별 묶음)
export interface ProjectMilestone {
  id: string;
  title: string;          // 단계 제목 (예: "1단계: 준비")
  actions: ProjectAction[];
}

// 액션 프로젝트 (특수 카드)
export interface ActionProject {
  id: string;
  userId: string;
  title: string;            // AI가 생성한 제목
  summary: string;          // 프로젝트 요약 설명
  expectedDuration: string;  // 전체 예상 기간 (예: "20day plan")
  milestones: ProjectMilestone[];
  sourceMemoryIds: string[]; // 근거가 된 기억들
  x: number;
  y: number;
  color: string;
  createdAt: number;
  updatedAt: number;
}

// AI 분류 결과
export interface AIClassification {
  topic: string;
  nature: string;
  timeContext: string;
  suggestedCluster?: string;
  relatedMemoryIds?: string[];
}

// 요약 응답
export interface SummaryResponse {
  summary: string;
  relatedMemories: Memory[];
  clusters: Cluster[];
  suggestions?: string[];   // 조건부 제안
}

// 페르소나
export interface Persona {
  id: string;
  name: string;             // 페르소나 이름
  icon: string;             // 이모티콘 (👨‍💼, 👨‍🍳 등)
  description?: string;     // 페르소나 설명
  context?: string;         // AI 컨텍스트 (이 페르소나의 관심사/역할)
  createdAt: number;
  updatedAt: number;
}

// 캔버스 블록 타입
export type BlockType = 'calendar' | 'photo' | 'automation' | 'insight' | 'minimap' | 'viewer' | 'meeting-recorder' | 'database';


// 캔버스 블록
export interface CanvasBlock {
  id: string;
  userId: string;
  type: BlockType;
  x: number;                // 캔버스 상의 x 좌표
  y: number;                // 캔버스 상의 y 좌표
  width?: number;           // 블록 너비 (선택)
  height?: number;          // 블록 높이 (선택)
  config: Record<string, any>; // 블록별 설정 (JSON)
  createdAt: number;
  updatedAt: number;
}

// 캘린더 블록 설정
export interface CalendarBlockConfig {
  view: 'month' | 'week' | 'day';  // 뷰 모드
  selectedDate?: number;            // 선택된 날짜 (timestamp)
  linkedMemoryIds?: string[];       // 연결된 메모리 ID들
  todos?: Array<{                  // 일정(투두) 목록
    id: string;
    text: string;
    completed: boolean;
    date: number;                  // 날짜 (timestamp)
    time?: string;                 // 시간 (HH:mm 형식, 선택)
    linkedMemoryIds?: string[];   // 태그된 기록 ID들
    createdAt: number;
  }>;
}

// Viewer 소스 타입
export type ViewerSource =
  | { kind: 'file'; url: string; fileName: string; mimeType?: string }
  | { kind: 'url'; url: string; title?: string };

// Viewer 블록 설정
export interface ViewerBlockConfig {
  currentSource?: ViewerSource;  // 현재 표시 중인 소스
  history?: ViewerSource[];       // 히스토리
  historyIndex?: number;           // 현재 히스토리 인덱스
  pinned?: boolean;                // Pin 상태
  pixelArtFrame?: string;          // PixelLab로 생성한 프레임 이미지 URL
  pixelArtBackground?: string;     // PixelLab로 생성한 배경 이미지 URL
}

// Meeting Recorder 블록 설정
export interface MeetingRecorderBlockConfig {
  script?: string;                 // 전체 스크립트
  summary?: string;                // AI 요약
  isRecording?: boolean;          // 녹음 중 여부
  isPaused?: boolean;             // 일시정지 여부
  recordingTime?: number;         // 녹음 시간 (초)
  createdAt?: number;             // 생성 시간
}

// 데이터베이스 속성 타입
export type DatabasePropertyType = 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'multi-select' | 'person' | 'file' | 'url' | 'email' | 'phone';

// 데이터베이스 속성 (컬럼)
export interface DatabaseProperty {
  id: string;
  name: string;
  type: DatabasePropertyType;
  options?: string[];             // select, multi-select용 옵션
}

// 데이터베이스 행 (레코드)
export interface DatabaseRow {
  id: string;
  properties: Record<string, any>; // propertyId -> value
  createdAt: number;
  updatedAt: number;
}

// 데이터베이스 블록 설정
export interface DatabaseBlockConfig {
  name?: string;                  // 데이터베이스 이름
  properties: DatabaseProperty[];  // 속성(컬럼) 목록
  rows: DatabaseRow[];            // 행(레코드) 목록
  sortBy?: string;                // 정렬 기준 propertyId
  sortOrder?: 'asc' | 'desc';     // 정렬 방향
  filters?: Array<{                // 필터 목록
    propertyId: string;
    type: 'equals' | 'contains' | 'greater' | 'less' | 'isChecked' | 'isNotChecked';
    value: any;
  }>;
  viewType?: 'table' | 'board' | 'calendar'; // 뷰 타입 (일단 테이블만)
  linkedMemoryIds?: string[];     // 연결된 메모리 ID들
}
