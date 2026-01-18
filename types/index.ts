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
  content: string;          // 사용자 입력 원문
  createdAt: number;        // timestamp
  
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
  name: string;             // 사용자가 지정한 그룹 이름
  color?: string;           // 그룹 색상 (옵션)
  memoryIds: string[];
  isAIGenerated: boolean;   // AI가 자동으로 만든 그룹인지
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
