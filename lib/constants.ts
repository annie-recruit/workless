/**
 * 프로젝트 전역 상수 모음
 *
 * 매직 넘버, 반복 문자열, localStorage 키 등을
 * 한 곳에서 관리하여 휴먼 에러를 줄이고 변경을 용이하게 합니다.
 */

// ============================================================
// Timeouts & Delays (ms)
// ============================================================

export const TIMEOUT = {
  /** 토스트 알림 자동 닫힘 */
  TOAST: 2000,
  /** Puppeteer 페이지 대기 */
  PUPPETEER_WAIT: 3000,
  /** 일반 fetch 타임아웃 */
  FETCH: 10000,
  /** AI fetch 타임아웃 */
  AI_FETCH: 15000,
  /** 페이지 로드 타임아웃 */
  PAGE_LOAD: 60000,
  /** SQLite busy timeout */
  DB_BUSY: 30000,
  /** 동기화 체크 인터벌 */
  SYNC_CHECK_INTERVAL: 5000,
  /** 복사 완료 표시 */
  COPY_FEEDBACK: 2000,
} as const;

// ============================================================
// Content Limits (characters)
// ============================================================

export const CONTENT_LIMIT = {
  /** PDF/텍스트 최대 길이 */
  PDF_TEXT: 10000,
  /** URL 요약용 최대 길이 */
  URL_SUMMARY: 5000,
  /** 컨텐츠 미리보기 */
  PREVIEW: 200,
  /** 메모리 미리보기 */
  MEMORY_PREVIEW: 150,
} as const;

// ============================================================
// localStorage Keys
// ============================================================

export const STORAGE_KEY = {
  SYNC_MODE: 'workless:syncMode',
  LANGUAGE: 'language',
  TERMS_AGREED: 'terms_agreed',
  BOARD_CARD_SIZE: 'workless.board.cardSize',
  BOARD_CARD_COLOR: 'workless.board.cardColor',
  BOARD_BLOB_ENABLED: 'workless.board.isBlobEnabled',
  BOARD_ZOOM: 'workless.board.zoom',
  MINIMAP_POSITION: 'workless.minimap.position',
} as const;

// ============================================================
// API Endpoints
// ============================================================

export const API = {
  MEMORIES: '/api/memories',
  GROUPS: '/api/groups',
  GROUPS_SUGGEST: '/api/groups/suggest',
  GOALS: '/api/goals',
  PROJECTS: '/api/projects',
  BOARD_BLOCKS: '/api/board/blocks',
  BOARD_POSITIONS: '/api/board/positions',
  BOARD_COLORS: '/api/board/colors',
  BOARD_SETTINGS: '/api/board/settings',
  BOARD_ARRANGE: '/api/board/arrange',
  INSIGHTS: '/api/insights',
  CLUSTERS: '/api/clusters',
  SYNC_BACKUP: '/api/sync/backup',
  SYNC_RESTORE: '/api/sync/restore',
  PERSONAS: '/api/personas',
  SUMMARIZE: '/api/summarize',
} as const;

// ============================================================
// HTTP Headers
// ============================================================

export const JSON_HEADERS = {
  'Content-Type': 'application/json',
} as const;

// ============================================================
// Pixel Art Design Tokens
// ============================================================

export const PIXEL_SHADOW = {
  SM: 'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]',
  MD: 'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]',
  LG: 'shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]',
  XL: 'shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]',
  CARD: 'shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]',
} as const;

// ============================================================
// Card Dimensions
// ============================================================

export const CARD_SIZE = {
  ACTION_PROJECT_WIDTH: 480,
  DEFAULT_WIDTH: 400,
  COMPACT_WIDTH: 350,
  SMALL_WIDTH: 300,
  MINI_WIDTH: 280,
} as const;

// ============================================================
// Color Options (재사용 가능한 색상 배열)
// ============================================================

export const GROUP_COLOR_OPTIONS = [
  { value: 'orange', label: '주황', class: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'indigo', label: '인디고', class: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
] as const;

export const CARD_COLOR_OPTIONS = [
  { id: 'bg-orange-50', class: 'bg-orange-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]' },
  { id: 'bg-indigo-50', class: 'bg-indigo-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]' },
  { id: 'bg-purple-50', class: 'bg-purple-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]' },
] as const;
