'use client';

import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { Memory, Group, CanvasBlock, CalendarBlockConfig, ViewerBlockConfig, MeetingRecorderBlockConfig, DatabaseBlockConfig } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import LinkManager from './LinkManager';
import dynamic from 'next/dynamic';
import { useViewer } from './ViewerContext';

// 큰 컴포넌트들을 동적 import로 로드 (초기 번들 크기 감소)
const CalendarBlock = dynamic(() => import('./CalendarBlock'), {
  ssr: false,
  loading: () => null,
});

const Minimap = dynamic(() => import('./Minimap'), {
  ssr: false,
  loading: () => null,
});

// ViewerBlock을 dynamic import로 로드 (PDF.js가 서버 사이드에서 실행되지 않도록)
const ViewerBlock = dynamic(() => import('./ViewerBlock'), {
  ssr: false,
  loading: () => null,
});

// MeetingRecorderBlock을 dynamic import로 로드
const MeetingRecorderBlock = dynamic(() => import('./MeetingRecorderBlock'), {
  ssr: false,
  loading: () => null,
});

const DatabaseBlock = dynamic(() => import('./DatabaseBlock'), {
  ssr: false,
  loading: () => null,
});

interface MemoryViewProps {
  memories: Memory[];
  onMemoryDeleted?: () => void;
  personaId?: string | null;
}

const stripHtmlClient = (html: string) => {
  if (!html) return '';
  // HTML 엔티티 디코딩
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const decoded = tempDiv.textContent || tempDiv.innerText || '';
  
  return decoded
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const sanitizeHtml = (html: string) => {
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const allowedTags = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'SPAN', 'A', 'UL', 'OL', 'LI', 'FONT'
  ]);
  const allowedAttrs: Record<string, string[]> = {
    A: ['href', 'data-memory-id', 'class', 'target', 'rel'],
    SPAN: ['style', 'class', 'data-memory-id'],
    DIV: ['style', 'class'],
    P: ['style', 'class'],
    FONT: ['face', 'size', 'color'],
  };
  const allowedStyles = new Set([
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'text-decoration',
    'color',
  ]);

  doc.body.querySelectorAll('*').forEach((node) => {
    const tagName = node.tagName.toUpperCase();
    if (!allowedTags.has(tagName)) {
      const text = doc.createTextNode(node.textContent || '');
      node.replaceWith(text);
      return;
    }

    const allowed = (allowedAttrs[tagName] || []).map(a => a.toLowerCase());
    Array.from(node.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
        return;
      }
      if (allowed.length > 0 && !allowed.includes(name)) {
        if (!name.startsWith('data-')) {
          node.removeAttribute(attr.name);
        }
      }
      if (name === 'href' && attr.value.toLowerCase().startsWith('javascript:')) {
        node.removeAttribute(attr.name);
      }
      if (name === 'style') {
        const safeStyles = attr.value
          .split(';')
          .map(rule => rule.trim())
          .filter(Boolean)
          .map(rule => {
            const [prop, value] = rule.split(':').map(v => v.trim());
            if (!prop || !value) return null;
            return allowedStyles.has(prop.toLowerCase()) ? `${prop}: ${value}` : null;
          })
          .filter(Boolean)
          .join('; ');
        if (safeStyles) {
          node.setAttribute('style', safeStyles);
        } else {
          node.removeAttribute('style');
        }
      }
    });
  });

  return doc.body.innerHTML;
};

const CARD_DIMENSIONS = {
  s: { width: 200, height: 160, centerX: 100, centerY: 80 },
  m: { width: 240, height: 180, centerX: 120, centerY: 90 },
  l: { width: 280, height: 200, centerX: 140, centerY: 100 },
} as const;

const BOARD_PADDING = 100;

// 통합 드래그 엔진: 카드와 블록을 하나의 시스템으로 처리
type DraggableEntity = 
  | { type: 'memory'; id: string }
  | { type: 'block'; id: string };

export default function MemoryView({ memories, onMemoryDeleted, personaId }: MemoryViewProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [draggedMemoryId, setDraggedMemoryId] = useState<string | null>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(null);
  const [linkManagerMemory, setLinkManagerMemory] = useState<Memory | null>(null);
  // 로컬 메모리 상태 (연결 추가 시 즉시 반영)
  const [localMemories, setLocalMemories] = useState<Memory[]>(memories);
  // 메모리 순서 관리 (클릭 시 최상단으로 이동)
  const [memoryOrder, setMemoryOrder] = useState<string[]>(() => memories.map(m => m.id));
  
  // localMemories 변경 시 memoryOrder 동기화 (새 메모리 추가 시)
  useEffect(() => {
    const currentIds = new Set(memoryOrder);
    const newMemories = localMemories.filter(m => !currentIds.has(m.id));
    if (newMemories.length > 0) {
      setMemoryOrder(prev => [...prev, ...newMemories.map(m => m.id)]);
    }
  }, [localMemories, memoryOrder]);
  
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [previousPositions, setPreviousPositions] = useState<Record<string, { x: number; y: number }> | null>(null);
  const [positionsLoaded, setPositionsLoaded] = useState(false); // 위치 로드 완료 플래그
  
  // 통합 드래그 상태 (카드와 블록 통합)
  const [draggingEntity, setDraggingEntity] = useState<DraggableEntity | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartPositions, setDragStartPositions] = useState<Record<string, { x: number; y: number }>>({}); // 드래그 시작 시점의 위치
  
  // 하위 호환성을 위한 별칭 (기존 코드와의 호환)
  const draggingId = draggingEntity?.type === 'memory' ? draggingEntity.id : null;
  const draggingBlockId = draggingEntity?.type === 'block' ? draggingEntity.id : null;
  
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<Set<string>>(new Set()); // 다중 선택
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null); // 드래그 선택 박스
  const [isSelecting, setIsSelecting] = useState(false); // 선택 모드인지
  const [isAutoArranging, setIsAutoArranging] = useState(false);
  const [hoveredBlobId, setHoveredBlobId] = useState<string | null>(null);
  const [hoveredMemoryId, setHoveredMemoryId] = useState<string | null>(null);
  // 블롭 애니메이션 상태 관리 (선→면 전환 애니메이션)
  const [animatedBlobIds, setAnimatedBlobIds] = useState<Set<string>>(new Set());
  const [blobAnimationStates, setBlobAnimationStates] = useState<Record<string, 'entering' | 'idle'>>({});
  // 블롭 위치 반응성 (카드 이동 시 살짝 늦게 따라오기)
  const [blobPositions, setBlobPositions] = useState<Record<string, { minX: number; minY: number; maxX: number; maxY: number }>>({});
  const [cardSize, setCardSize] = useState<'s' | 'm' | 'l'>('m');
  const [cardColor, setCardColor] = useState<'green' | 'pink' | 'purple'>('green');
  const [cardColorMap, setCardColorMap] = useState<Record<string, 'green' | 'pink' | 'purple'>>({});
  const [linkNotes, setLinkNotes] = useState<Record<string, string>>({});
  const [linkInfo, setLinkInfo] = useState<Record<string, { note?: string; isAIGenerated: boolean }>>({});
  // AI 묶기 모달 상태 (MemoryView 레벨로 이동)
  const [groupModalMemory, setGroupModalMemory] = useState<Memory | null>(null);
  const [groupResult, setGroupResult] = useState<any>(null);
  const [groupStep, setGroupStep] = useState<'loading' | 'confirm' | 'animating'>('loading');
  const [clickedCardId, setClickedCardId] = useState<string | null>(null); // 클릭한 카드 ID
  const [clickedBlockId, setClickedBlockId] = useState<string | null>(null); // 클릭한 블록 ID
  // 마지막으로 클릭한 항목 (계속 앞에 유지)
  const [lastClickedItem, setLastClickedItem] = useState<{ type: 'memory' | 'block'; id: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'loading' | 'confirm' | 'success' | 'delete-link' | 'delete-memory' | 'delete-location' | 'error' | null; data?: any }>({ type: null });
  // @ 태그 클릭 시 표시할 관련 기록 토스트 (여러 개 중첩 가능)
  const [mentionToasts, setMentionToasts] = useState<Array<{ id: string; memoryId: string; x: number; y: number; relatedIds: string[] }>>([]);
  const [editableGroupName, setEditableGroupName] = useState<string>('');
  const [editableRelatedMemories, setEditableRelatedMemories] = useState<Array<{ id: string; content: string }>>([]);
  const [groupDescription, setGroupDescription] = useState<string | null>(null);
  const [isLoadingGroupDescription, setIsLoadingGroupDescription] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null); // 스크롤 컨테이너 (미니맵에서 사용)
  // 블록 관련 상태
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  
  // AI 묶기 API 호출
  useEffect(() => {
    if (!groupModalMemory) return;
    
    const fetchGroup = async () => {
      try {
        // 로딩 토스트 표시
        setToast({ type: 'loading', data: { message: 'AI가 관련 기록을 찾고 있어요...' } });
        
        const res = await fetch(`/api/memories/${groupModalMemory.id}/auto-group`, {
          method: 'POST',
        });
        
        if (res.ok) {
          const data = await res.json();
          setGroupResult(data);
          setGroupStep('confirm');
          // 편집 가능한 상태 초기화
          setEditableGroupName(data.group?.name || '');
          setEditableRelatedMemories(data.relatedMemories || []);
          // 확인 토스트 표시
          setToast({ type: 'confirm', data });
        } else {
          const errorData = await res.json().catch(() => ({ error: '자동 묶기 실패' }));
          setToast({ type: 'error', data: { message: errorData.error || '자동 묶기 실패' } });
          setGroupModalMemory(null);
          setGroupResult(null);
        }
      } catch (error) {
        console.error('Auto group error:', error);
        setToast({ type: 'error', data: { message: '자동 묶기 중 오류 발생' } });
        setGroupModalMemory(null);
        setGroupResult(null);
      }
    };
    
    fetchGroup();
  }, [groupModalMemory]);
  
  // AI 묶기 토스트 핸들러
  const handleCancelGroup = async () => {
    // 생성된 그룹 삭제
    if (groupResult?.group?.id) {
      try {
        await fetch(`/api/groups?id=${groupResult.group.id}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to delete group:', error);
      }
    }
    setToast({ type: null });
    setGroupModalMemory(null);
    setGroupResult(null);
    setGroupStep('loading');
    setEditableGroupName('');
    setEditableRelatedMemories([]);
  };
  
  const handleConfirmGroup = async () => {
    if (!groupResult?.group) return;
    
    try {
      // 편집된 그룹 이름과 관련 기록 목록 사용
      const finalGroupName = editableGroupName.trim() || groupResult.group.name;
      const finalMemoryIds = [
        groupModalMemory?.id,
        ...editableRelatedMemories.map(m => m.id)
      ].filter(Boolean) as string[];
      
      // 그룹 이름이 변경되었거나 기록 목록이 변경된 경우 업데이트
      if (finalGroupName !== groupResult.group.name || finalMemoryIds.length !== groupResult.group.memoryIds.length) {
        const updateRes = await fetch('/api/groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: groupResult.group.id,
            name: finalGroupName,
            memoryIds: finalMemoryIds,
          }),
        });
        
        if (!updateRes.ok) {
          throw new Error('그룹 업데이트 실패');
        }
      }
      
      // 성공 토스트 표시
      setToast({ type: 'success', data: { message: `그룹 "${finalGroupName}"이 생성되었습니다!` } });
      
      // 그룹 목록 새로고침
      await fetchGroups();
      
      // 새로 생성된 그룹으로 자동 선택
      setSelectedGroupId(groupResult.group.id);
      
      // 2초 후 토스트 닫기
      setTimeout(() => {
        setToast({ type: null });
        setGroupModalMemory(null);
        setGroupResult(null);
        setGroupStep('loading');
        setEditableGroupName('');
        setEditableRelatedMemories([]);
      }, 2000);
    } catch (error) {
      console.error('Failed to confirm group:', error);
      setToast({ type: null });
      alert('그룹 생성 중 오류 발생');
    }
  };

  // 연결 삭제 핸들러
  const handleDeleteLink = async () => {
    if (!toast.data?.memoryId1 || !toast.data?.memoryId2) return;
    
    const { memoryId1, memoryId2 } = toast.data;
    
    try {
      const res = await fetch(`/api/memories/link?memoryId1=${memoryId1}&memoryId2=${memoryId2}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        const data = await res.json();
        // 로컬 상태 즉시 업데이트 (페이지 리로드 없이)
        if (data.memory1 && data.memory2) {
          setLocalMemories(prev => {
            const updated = [...prev];
            const index1 = updated.findIndex(m => m.id === data.memory1.id);
            const index2 = updated.findIndex(m => m.id === data.memory2.id);
            
            if (index1 !== -1) {
              updated[index1] = data.memory1;
            }
            if (index2 !== -1) {
              updated[index2] = data.memory2;
            }
            
            return updated;
          });
        }
        setToast({ type: null });
      } else {
        setToast({ type: null });
        alert('링크 삭제 실패');
      }
    } catch (error) {
      console.error('Failed to delete link:', error);
      setToast({ type: null });
      alert('링크 삭제 중 오류 발생');
    }
  };

  // 기록 삭제 핸들러
  const handleDeleteMemory = async () => {
    if (!toast.data?.memoryId) return;
    
    try {
      const res = await fetch(`/api/memories?id=${toast.data.memoryId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setToast({ type: null });
        onMemoryDeleted?.();
      } else {
        setToast({ type: null });
        alert('삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setToast({ type: null });
      alert('삭제에 실패했습니다');
    }
  };

  // 위치 삭제 핸들러
  const handleDeleteLocation = async () => {
    if (!toast.data?.memoryId) return;
    
    try {
      const memory = localMemories.find(m => m.id === toast.data.memoryId);
      if (!memory) return;
      
      const res = await fetch(`/api/memories?id=${memory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: memory.title || undefined, 
          content: memory.content,
          location: null 
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // 로컬 상태 즉시 업데이트
        setLocalMemories(prev => {
          const updated = [...prev];
          const index = updated.findIndex(m => m.id === memory.id);
          if (index !== -1) {
            updated[index] = { ...updated[index], location: undefined };
          }
          return updated;
        });
        setToast({ type: null });
      } else {
        setToast({ type: null });
        alert('위치 정보 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to delete location:', error);
      setToast({ type: null });
      alert('위치 정보 삭제에 실패했습니다');
    }
  };
  const [boardSize, setBoardSize] = useState({ width: 1600, height: 1200 });
  const [viewportBounds, setViewportBounds] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const settingsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const colorsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 통합 드래그 엔진: RAF 단일 루프
  const dragRafIdRef = useRef<number | null>(null);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const dragStartPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const selectedMemoryIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchGroups();
  }, []);

  // memories prop이 변경되면 로컬 상태도 업데이트
  useEffect(() => {
    setLocalMemories(memories);
  }, [memories]);

  useEffect(() => {
    const storedSize = localStorage.getItem('workless.board.cardSize');
    const storedColor = localStorage.getItem('workless.board.cardColor');
    if (storedSize === 's' || storedSize === 'm' || storedSize === 'l') {
      setCardSize(storedSize);
    }
    if (storedColor === 'green' || storedColor === 'pink' || storedColor === 'purple') {
      setCardColor(storedColor);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('workless.board.cardSize', cardSize);
  }, [cardSize]);

  useEffect(() => {
    localStorage.setItem('workless.board.cardColor', cardColor);
  }, [cardColor]);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  // 블록 로드
  const fetchBlocks = async () => {
    try {
      const res = await fetch('/api/board/blocks');
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks || []);
      }
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
    }
  };

  // 블록 생성 (캘린더)
  const handleCreateCalendarBlock = async () => {
    try {
      const res = await fetch('/api/board/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'calendar',
          x: 100,
          y: 100,
          width: 350,
          height: 400,
          config: {
            view: 'month',
            selectedDate: Date.now(),
            linkedMemoryIds: [],
          },
        }),
      });

      if (res.ok) {
        await fetchBlocks();
      }
    } catch (error) {
      console.error('Failed to create calendar block:', error);
    }
  };

  // 미니맵 생성 (보드당 하나만)
  const handleCreateMinimapBlock = async () => {
    try {
      const res = await fetch('/api/board/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'minimap',
          x: 20,
          y: 20,
          width: 420,
          height: 300,
          config: {},
        }),
      });

      if (res.ok) {
        await fetchBlocks();
      }
    } catch (error) {
      console.error('Failed to create minimap block:', error);
    }
  };

  // Viewer 블록 생성
  const handleCreateViewerBlock = async () => {
    try {
      const res = await fetch('/api/board/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'viewer',
          x: 100,
          y: 100,
          width: 600,
          height: 400,
          config: {
            currentSource: null,
            history: [],
            historyIndex: -1,
            pinned: false,
          },
        }),
      });

      if (res.ok) {
        await fetchBlocks();
      }
    } catch (error) {
      console.error('Failed to create viewer block:', error);
    }
  };

  // Meeting Recorder 블록 생성
  const handleCreateMeetingRecorderBlock = async () => {
    try {
      const res = await fetch('/api/board/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'meeting-recorder',
          x: 100,
          y: 100,
          width: 600,
          height: 400,
          config: {
            script: '',
            summary: '',
            isRecording: false,
            isPaused: false,
            recordingTime: 0,
          },
        }),
      });

      if (res.ok) {
        await fetchBlocks();
      }
    } catch (error) {
      console.error('Failed to create meeting recorder block:', error);
    }
  };

  // Database 블록 생성
  const handleCreateDatabaseBlock = async () => {
    try {
      const res = await fetch('/api/board/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'database',
          x: 100,
          y: 100,
          width: 480,
          height: 200,
          config: {
            name: '데이터베이스',
            properties: [],
            rows: [],
            sortBy: undefined,
            sortOrder: 'asc',
            filters: [],
            viewType: 'table',
            linkedMemoryIds: [],
          },
        }),
      });

      if (res.ok) {
        await fetchBlocks();
      }
    } catch (error) {
      console.error('Failed to create database block:', error);
    }
  };

  // 블록 업데이트
  const handleBlockUpdate = useCallback(async (blockId: string, updates: Partial<{ x: number; y: number; config: any }>) => {
    try {
      // 위치 업데이트의 경우 이미 로컬 상태가 업데이트되어 있으므로 API만 호출
      // config 업데이트의 경우도 ViewerBlock에서 이미 로컬 상태를 관리하므로 API만 호출
      const res = await fetch(`/api/board/blocks?id=${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        console.error('Failed to update block:', res.statusText);
      }
      // API 응답으로 상태를 업데이트하지 않음 (로컬 상태가 이미 업데이트되어 있으므로)
      // 무한 루프 방지
    } catch (error) {
      console.error('Failed to update block:', error);
    }
  }, []);

  // 블록 삭제
  const handleBlockDelete = async (blockId: string) => {
    try {
      const res = await fetch(`/api/board/blocks?id=${blockId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setBlocks(prev => prev.filter(b => b.id !== blockId));
      }
    } catch (error) {
      console.error('Failed to delete block:', error);
    }
  };

  // 블록 초기 로드
  useEffect(() => {
    fetchBlocks();
  }, []);

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (memoryId: string) => {
    setDraggedMemoryId(memoryId);
  };

  const handleDragEnd = () => {
    setDraggedMemoryId(null);
    setDropTargetGroupId(null);
  };

  const handleDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    setDropTargetGroupId(groupId);
  };

  const clampZoom = (value: number) => Math.min(Math.max(value, 0.5), 1.6);
  
  const updateViewportBounds = useCallback(() => {
    if (boardContainerRef.current) {
      const scrollLeft = boardContainerRef.current.scrollLeft;
      const scrollTop = boardContainerRef.current.scrollTop;
      const clientWidth = boardContainerRef.current.clientWidth;
      const clientHeight = boardContainerRef.current.clientHeight;
      
      setViewportBounds({
        left: scrollLeft / zoom,
        top: scrollTop / zoom,
        width: clientWidth / zoom,
        height: clientHeight / zoom,
      });
    }
  }, [zoom]);

  const changeZoom = (delta: number) => {
    setZoom(prev => {
      const newZoom = clampZoom(prev + delta);
      // zoom 변경 후 뷰포트 업데이트
      setTimeout(updateViewportBounds, 0);
      return newZoom;
    });
  };
  const resetZoom = () => {
    setZoom(1);
    setTimeout(updateViewportBounds, 0);
  };

  // 초기 뷰포트 설정 및 zoom 변경 시 업데이트
  useEffect(() => {
    const update = () => {
      if (boardContainerRef.current) {
        const scrollLeft = boardContainerRef.current.scrollLeft;
        const scrollTop = boardContainerRef.current.scrollTop;
        const clientWidth = boardContainerRef.current.clientWidth;
        const clientHeight = boardContainerRef.current.clientHeight;
        
        setViewportBounds({
          left: scrollLeft / zoom,
          top: scrollTop / zoom,
          width: clientWidth / zoom,
          height: clientHeight / zoom,
        });
      }
    };
    
    update();
    const handleResize = () => update();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoom, boardSize]);

  const ensureBoardBounds = (x: number, y: number) => {
    const { width: cardWidth, height: cardHeight } = CARD_DIMENSIONS[cardSize];
    setBoardSize(prev => {
      const requiredWidth = Math.max(prev.width, x + cardWidth + BOARD_PADDING / 2);
      const requiredHeight = Math.max(prev.height, y + cardHeight + BOARD_PADDING / 2);
      if (requiredWidth === prev.width && requiredHeight === prev.height) {
        return prev;
      }
      return {
        width: requiredWidth,
        height: requiredHeight,
      };
    });
  };

  const handleDragLeave = () => {
    setDropTargetGroupId(null);
  };

  const handleDrop = async (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    setDropTargetGroupId(null);
    
    if (!draggedMemoryId) return;

    try {
      const targetGroup = groups.find(g => g.id === groupId);
      if (!targetGroup) return;

      // 이미 그룹에 포함되어 있는지 확인
      if (targetGroup.memoryIds.includes(draggedMemoryId)) {
        alert('이미 이 그룹에 포함된 기록입니다');
        return;
      }

      // 그룹에 기록 추가
      const updatedMemoryIds = [...targetGroup.memoryIds, draggedMemoryId];
      const res = await fetch('/api/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: groupId,
          memoryIds: updatedMemoryIds,
        }),
      });

      if (res.ok) {
        await fetchGroups();
        alert('그룹에 추가되었습니다!');
        // 햅틱 피드백 (성공)
        if ('vibrate' in navigator) {
          navigator.vibrate([10, 50, 10]);
        }
      } else {
        alert('그룹 추가 실패');
        // 햅틱 피드백 (에러)
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 50, 30]);
        }
      }
    } catch (error) {
      console.error('Failed to add memory to group:', error);
      alert('그룹 추가 중 오류 발생');
      // 햅틱 피드백 (에러)
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 50, 30]);
      }
    } finally {
      setDraggedMemoryId(null);
    }
  };

  // @ 태그 클릭 핸들러: 태깅된 기록만 토스트 표시
  const handleMentionClick = (clickedElementId: string, mentionedMemoryId: string, isBlock: boolean = false) => {
    const targetMemory = localMemories.find(m => m.id === mentionedMemoryId);
    if (!targetMemory) return;

    // 태깅된 기록만 표시 (관련 기록 제외)

    // DOM 기준으로 요소 위치 계산 (보드 좌표계로 변환)
    const elementId = isBlock ? `calendar-block-${clickedElementId}` : `memory-${clickedElementId}`;
    const element = document.getElementById(elementId) || document.querySelector(`[data-calendar-block="${clickedElementId}"]`);
    if (!element || !boardRef.current) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const scale = zoomRef.current;

    // 화면 좌표를 보드 좌표로 변환
    const elementX = (elementRect.left - boardRect.left) / scale;
    const elementY = (elementRect.top - boardRect.top) / scale;
    const elementWidth = isBlock ? (blocks.find(b => b.id === clickedElementId)?.width || 350) : CARD_DIMENSIONS[cardSize].width;
    const toastWidth = 300; // 토스트 예상 너비

    // 요소 오른쪽에 토스트 표시 (공간 부족하면 왼쪽)
    const rightSpace = boardSize.width - (elementX + elementWidth);
    const leftSpace = elementX;
    
    let toastX: number;
    if (rightSpace >= toastWidth + 20) {
      // 오른쪽에 표시
      toastX = elementX + elementWidth + 10;
    } else if (leftSpace >= toastWidth + 20) {
      // 왼쪽에 표시
      toastX = elementX - toastWidth - 10;
    } else {
      // 공간이 부족하면 오른쪽 우선
      toastX = elementX + elementWidth + 10;
    }

    // Y 위치 clamp (보드 범위 내)
    const toastY = Math.max(0, Math.min(elementY, boardSize.height - 200));

    // 새로운 토스트 추가 (기존 토스트는 유지)
    const newToastId = `toast-${Date.now()}-${Math.random()}`;
    setMentionToasts(prev => [...prev, {
      id: newToastId,
      memoryId: mentionedMemoryId,
      x: toastX,
      y: toastY,
      relatedIds: [mentionedMemoryId], // 태깅된 기록만 표시
    }]);
  };

  const storageKey = selectedGroupId || 'all';
  const zoomStorageKey = `workless.board.zoom.${storageKey}`;

  useEffect(() => {
    try {
      const storedZoom = localStorage.getItem(zoomStorageKey);
      setZoom(storedZoom ? Number(storedZoom) : 1);
    } catch (error) {
      console.error('Failed to load zoom level:', error);
      setZoom(1);
    }
  }, [zoomStorageKey]);

  useEffect(() => {
    zoomRef.current = zoom;
    try {
      localStorage.setItem(zoomStorageKey, zoom.toString());
    } catch (error) {
      console.error('Failed to save zoom level:', error);
    }
  }, [zoom, zoomStorageKey]);

  useEffect(() => {
    const fetchBoardState = async () => {
      try {
        // positions는 항상 'all'에서 가져와서 전체 모드와 동일한 배치 유지
        const [positionsRes, settingsRes, colorsRes] = await Promise.all([
          fetch(`/api/board/positions?groupId=all`),
          fetch(`/api/board/settings?groupId=${storageKey}`),
          fetch(`/api/board/colors?groupId=${storageKey}`),
        ]);

        if (positionsRes.ok) {
          const data = await positionsRes.json();
          const next: Record<string, { x: number; y: number }> = {};
          (data.positions || []).forEach((row: any) => {
            if (row.memoryId && row.x !== null && row.y !== null) {
              next[row.memoryId] = { x: row.x, y: row.y };
            }
          });
          setPositions(next);
          setPositionsLoaded(true); // 위치 로드 완료 표시
        } else {
          setPositions({});
          setPositionsLoaded(true); // 실패해도 로드 완료로 표시
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          const settings = data.settings;
          if (settings?.cardSize === 's' || settings?.cardSize === 'm' || settings?.cardSize === 'l') {
            setCardSize(settings.cardSize);
          }
          if (settings?.cardColor === 'green' || settings?.cardColor === 'pink' || settings?.cardColor === 'purple') {
            setCardColor(settings.cardColor);
          }
        }

        if (colorsRes.ok) {
          const data = await colorsRes.json();
          const next: Record<string, 'green' | 'pink' | 'purple'> = {};
          (data.colors || []).forEach((row: any) => {
            if (row.color) {
              next[row.memoryId] = row.color;
            }
          });
          setCardColorMap(next);
        }
      } catch (error) {
        console.error('Failed to fetch board state:', error);
        setPositions({});
        setPositionsLoaded(true); // 에러 발생해도 로드 완료로 표시
      }
    };
    fetchBoardState();
  }, [storageKey]); // storageKey가 변경되면 settings와 colors만 다시 로드

  const getLinkKey = (id1: string, id2: string) => {
    return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
  };

  // 그룹별 필터링 및 순서 적용
  const filteredMemories = useMemo(() => {
    let memories = localMemories;
    if (selectedGroupId) {
      const group = groups.find(g => g.id === selectedGroupId);
      if (!group) return [];
      memories = localMemories.filter(m => group.memoryIds.includes(m.id));
    }
    
    // 순서에 따라 정렬 (memoryOrder에 있는 것만, 나머지는 뒤에)
    const orderedMemories: Memory[] = [];
    const unorderedMemories: Memory[] = [];
    const orderSet = new Set(memoryOrder);
    
    // 순서가 있는 메모리들
    memoryOrder.forEach(id => {
      const memory = memories.find(m => m.id === id);
      if (memory) orderedMemories.push(memory);
    });
    
    // 순서가 없는 메모리들 (새로 추가된 것 등)
    memories.forEach(memory => {
      if (!orderSet.has(memory.id)) {
        unorderedMemories.push(memory);
      }
    });
    
    return [...orderedMemories, ...unorderedMemories];
  }, [localMemories, selectedGroupId, groups, memoryOrder]);

  // 뷰포트 기반 가상화: 보이는 카드만 렌더링
  const visibleMemories = useMemo(() => {
    if (filteredMemories.length === 0) return [];
    
    // 뷰포트 경계 계산 (여유 공간 추가)
    const padding = 200; // 카드가 완전히 사라지기 전에 미리 렌더링
    const viewLeft = viewportBounds.left - padding;
    const viewTop = viewportBounds.top - padding;
    const viewRight = viewportBounds.left + viewportBounds.width + padding;
    const viewBottom = viewportBounds.top + viewportBounds.height + padding;
    
    const cardDims = CARD_DIMENSIONS[cardSize];
    
    return filteredMemories.filter(memory => {
      const position = positions[memory.id] || { x: 0, y: 0 };
      const cardLeft = position.x;
      const cardRight = position.x + cardDims.width;
      const cardTop = position.y;
      const cardBottom = position.y + cardDims.height;
      
      // 뷰포트와 겹치는지 확인
      return !(cardRight < viewLeft || cardLeft > viewRight || cardBottom < viewTop || cardTop > viewBottom);
    });
  }, [filteredMemories, positions, viewportBounds, cardSize]);

  // 뷰포트 기반 가상화: 보이는 블록만 렌더링
  const visibleBlocks = useMemo(() => {
    if (blocks.length === 0) return [];
    
    // 뷰포트 경계 계산 (여유 공간 추가)
    const padding = 200;
    const viewLeft = viewportBounds.left - padding;
    const viewTop = viewportBounds.top - padding;
    const viewRight = viewportBounds.left + viewportBounds.width + padding;
    const viewBottom = viewportBounds.top + viewportBounds.height + padding;
    
    return blocks.filter(block => {
      const blockLeft = block.x;
      const blockRight = block.x + (block.width || 400);
      const blockTop = block.y;
      const blockBottom = block.y + (block.height || 300);
      
      // 뷰포트와 겹치는지 확인
      return !(blockRight < viewLeft || blockLeft > viewRight || blockBottom < viewTop || blockTop > viewBottom);
    });
  }, [blocks, viewportBounds]);

  // 그룹 선택 시 설명 가져오기
  useEffect(() => {
    if (!selectedGroupId) {
      setGroupDescription(null);
      return;
    }

    const fetchGroupDescription = async () => {
      setIsLoadingGroupDescription(true);
      setGroupDescription(null); // 초기화
      try {
        const res = await fetch(`/api/groups/${selectedGroupId}/description`);
        if (res.ok) {
          const data = await res.json();
          if (data.description && data.description.trim()) {
            setGroupDescription(data.description);
          } else {
            setGroupDescription('이 그룹에 대한 설명을 생성할 수 없습니다.');
          }
        } else {
          const errorData = await res.json().catch(() => ({ error: '그룹 설명을 가져올 수 없습니다' }));
          setGroupDescription(`오류: ${errorData.error || '그룹 설명을 가져올 수 없습니다'}`);
        }
      } catch (error) {
        console.error('Failed to fetch group description:', error);
        setGroupDescription('그룹 설명을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoadingGroupDescription(false);
      }
    };

    fetchGroupDescription();
  }, [selectedGroupId]);

  // 그룹 선택 시 메모리를 컴팩트하게 재배치
  useEffect(() => {
    if (!selectedGroupId || filteredMemories.length === 0) {
      return;
    }

    // positionsLoaded를 기다리지 않고 즉시 재배치
    // 약간의 지연을 두어 DOM이 준비될 때까지 대기
    const timer = setTimeout(() => {
      const { width: cardWidth, height: cardHeight } = CARD_DIMENSIONS[cardSize];
      // 그룹 모드에서는 간격을 더 줄임
      const spacingX = cardWidth + 30; // 카드 너비 + 30px 간격
      const spacingY = cardHeight + 30; // 카드 높이 + 30px 간격
      const startX = 40; // 왼쪽 여백 더 줄임
      const startY = 40; // 상단 여백 더 줄임
      
      // 그리드로 재배치 (한 줄에 3-4개씩)
      const colsPerRow = Math.min(4, Math.ceil(Math.sqrt(filteredMemories.length * 1.2)));
      
      const newPositions: Record<string, { x: number; y: number }> = {};
      filteredMemories.forEach((memory, idx) => {
        const col = idx % colsPerRow;
        const row = Math.floor(idx / colsPerRow);
        newPositions[memory.id] = {
          x: startX + col * spacingX,
          y: startY + row * spacingY,
        };
      });
      
      setPositions(newPositions);
      
      // 보드 크기도 즉시 조정
      let maxX = 0;
      let maxY = 0;
      Object.values(newPositions).forEach(pos => {
        maxX = Math.max(maxX, pos.x + cardWidth);
        maxY = Math.max(maxY, pos.y + cardHeight);
      });
      const padding = 40; // 그룹 모드 여백
      setBoardSize({
        width: Math.max(1200, maxX + padding),
        height: Math.max(800, maxY + padding),
      });
    }, 100); // 100ms 지연으로 DOM 준비 대기

    return () => clearTimeout(timer);
  }, [selectedGroupId, filteredMemories, cardSize]);

  useEffect(() => {
    // 위치가 로드되기 전에는 기본 위치 설정 안 함
    if (!positionsLoaded || !boardRef.current || filteredMemories.length === 0) return;
    
    setPositions(prev => {
      const next = { ...prev };
      const spacingX = 260;
      const spacingY = 220;
      filteredMemories.forEach((memory, idx) => {
        // 저장된 위치가 없을 때만 기본 위치 설정
        if (!next[memory.id]) {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          next[memory.id] = {
            x: 24 + col * spacingX,
            y: 24 + row * spacingY,
          };
        }
      });
      return next;
    });
  }, [filteredMemories, positionsLoaded]);

  useEffect(() => {
    const { width: cardWidth, height: cardHeight } = CARD_DIMENSIONS[cardSize];
    let maxX = 0;
    let maxY = 0;
    Object.values(positions).forEach(pos => {
      maxX = Math.max(maxX, pos.x + cardWidth);
      maxY = Math.max(maxY, pos.y + cardHeight);
    });
    // 그룹 모드일 때는 여백을 줄임
    const padding = selectedGroupId ? 80 : BOARD_PADDING;
    const width = Math.max(1400, maxX + padding);
    const height = Math.max(900, maxY + padding);
    setBoardSize({ width, height });
  }, [positions, cardSize, selectedGroupId]);

  useEffect(() => {
    const fetchLinkNotes = async () => {
      try {
        const res = await fetch('/api/memories/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memoryIds: filteredMemories.map(m => m.id),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const notes: Record<string, string> = {};
          const info: Record<string, { note?: string; isAIGenerated: boolean }> = {};
          (data.links || []).forEach((link: any) => {
            const key = getLinkKey(link.memoryId1, link.memoryId2);
            if (link.note) {
              notes[key] = link.note;
            }
            info[key] = {
              note: link.note || undefined,
              isAIGenerated: link.isAIGenerated === 1 || link.isAIGenerated === true,
            };
          });
          setLinkNotes(notes);
          setLinkInfo(info);
        }
      } catch (error) {
        console.error('Failed to fetch link notes:', error);
      }
    };
    if (filteredMemories.length > 0) {
      fetchLinkNotes();
    } else {
      setLinkNotes({});
    }
  }, [filteredMemories]);

  // positions와 dragStartPositions를 ref와 동기화 (무한 루프 방지)
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    dragStartPositionsRef.current = dragStartPositions;
  }, [dragStartPositions]);

  // 통합 드래그 엔진: 단일 RAF 루프로 모든 드래그 처리
  useEffect(() => {
    if (!draggingEntity || !boardRef.current) {
      // 드래그 중이 아니면 RAF 취소
      if (dragRafIdRef.current !== null) {
        cancelAnimationFrame(dragRafIdRef.current);
        dragRafIdRef.current = null;
      }
      return;
    }

    const handleMove = (event: PointerEvent) => {
      // 선택 모드 처리
      if (isSelecting && selectionBox && boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        const scale = zoomRef.current;
        const endX = (event.clientX - rect.left) / scale;
        const endY = (event.clientY - rect.top) / scale;
        
        setSelectionBox(prev => prev ? { ...prev, endX, endY } : null);
        
        // 선택 박스 안의 카드들 찾기
        const boxLeft = Math.min(selectionBox.startX, endX);
        const boxRight = Math.max(selectionBox.startX, endX);
        const boxTop = Math.min(selectionBox.startY, endY);
        const boxBottom = Math.max(selectionBox.startY, endY);
        
        const currentSelectedIds = selectedMemoryIdsRef.current;
        const selected: Set<string> = event.ctrlKey || event.metaKey ? new Set(currentSelectedIds) : new Set();
        const currentPositions = positionsRef.current;
        
        // localMemories를 사용하여 모든 메모리 확인 (필터링된 것만이 아닌)
        localMemories.forEach(memory => {
          const pos = currentPositions[memory.id] || { x: 0, y: 0 };
          const cardDims = CARD_DIMENSIONS[cardSize];
          const cardLeft = pos.x;
          const cardRight = pos.x + cardDims.width;
          const cardTop = pos.y;
          const cardBottom = pos.y + cardDims.height;
          
          if (cardRight >= boxLeft && cardLeft <= boxRight && 
              cardBottom >= boxTop && cardTop <= boxBottom) {
            selected.add(memory.id);
          } else if (!event.ctrlKey && !event.metaKey) {
            selected.delete(memory.id);
          }
        });
        
        setSelectedMemoryIds(selected);
        return;
      }

      // 드래그 중: 마지막 포인터 위치만 저장 (RAF에서 처리)
      const rect = boardRef.current!.getBoundingClientRect();
      const scale = zoomRef.current;
      lastPointerPosRef.current = {
        x: (event.clientX - rect.left) / scale,
        y: (event.clientY - rect.top) / scale,
      };

      // RAF가 없으면 시작
      if (dragRafIdRef.current === null) {
        const updatePosition = () => {
          if (!lastPointerPosRef.current || !boardRef.current || !draggingEntity) {
            dragRafIdRef.current = null;
            return;
          }

          const { x: mouseX, y: mouseY } = lastPointerPosRef.current;
          const newX = Math.max(0, mouseX - dragOffset.x);
          const newY = Math.max(0, mouseY - dragOffset.y);

          if (draggingEntity.type === 'block') {
            // 블록 드래그: transform 기반 (더 정밀한 위치 업데이트)
            setBlocks(prev => {
              const block = prev.find(b => b.id === draggingEntity.id);
              if (!block) return prev;
              // 더 작은 임계값으로 불필요한 업데이트 방지
              if (Math.abs(block.x - newX) < 0.01 && Math.abs(block.y - newY) < 0.01) {
                return prev;
              }
              const updated = [...prev];
              const index = updated.findIndex(b => b.id === draggingEntity.id);
              if (index !== -1) {
                // 정확한 위치로 업데이트 (반올림 없이)
                updated[index] = { ...block, x: newX, y: newY };
              }
              return updated;
            });
          } else {
            // 메모리 카드 드래그: transform 기반
            const currentSelectedIds = selectedMemoryIdsRef.current;
            if (currentSelectedIds.has(draggingEntity.id) && currentSelectedIds.size > 1) {
              // 다중 선택
              const currentPositions = positionsRef.current;
              const currentDragStartPositions = dragStartPositionsRef.current;
              const startPos = currentDragStartPositions[draggingEntity.id] || currentPositions[draggingEntity.id] || { x: 0, y: 0 };
              const deltaX = newX - startPos.x;
              const deltaY = newY - startPos.y;
              
              setPositions(prev => {
                const next = { ...prev };
                let hasChanges = false;
                currentSelectedIds.forEach(id => {
                  const startPosForCard = currentDragStartPositions[id] || prev[id] || { x: 0, y: 0 };
                  const finalX = Math.max(0, startPosForCard.x + deltaX);
                  const finalY = Math.max(0, startPosForCard.y + deltaY);
                  const currentPos = prev[id];
                  if (!currentPos || Math.abs(currentPos.x - finalX) > 0.1 || Math.abs(currentPos.y - finalY) > 0.1) {
                    next[id] = { x: finalX, y: finalY };
                    hasChanges = true;
                  } else {
                    next[id] = currentPos;
                  }
                });
                return hasChanges ? next : prev;
              });
            } else {
              // 단일 카드
              setPositions(prev => {
                const currentPos = prev[draggingEntity.id];
                if (currentPos && Math.abs(currentPos.x - newX) < 0.1 && Math.abs(currentPos.y - newY) < 0.1) {
                  return prev;
                }
                return {
                  ...prev,
                  [draggingEntity.id]: { x: newX, y: newY },
                };
              });
            }
          }

          ensureBoardBounds(newX, newY);
          dragRafIdRef.current = requestAnimationFrame(updatePosition);
        };
        dragRafIdRef.current = requestAnimationFrame(updatePosition);
      }
    };

    const handleUp = (event?: PointerEvent) => {
      // RAF 즉시 취소
      if (dragRafIdRef.current !== null) {
        cancelAnimationFrame(dragRafIdRef.current);
        dragRafIdRef.current = null;
      }

      // Pointer capture 해제
      if (event && event.target) {
        try {
          (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
        } catch (e) {
          // ignore
        }
      }

      if (!draggingEntity || !boardRef.current) {
        if (isSelecting) {
          setIsSelecting(false);
          setSelectionBox(null);
        }
        return;
      }

      // 드롭 시 즉시 최종 위치 확정 (debounce 없음)
      let finalX: number;
      let finalY: number;

      if (event) {
        const rect = boardRef.current.getBoundingClientRect();
        const scale = zoomRef.current;
        const mouseX = (event.clientX - rect.left) / scale;
        const mouseY = (event.clientY - rect.top) / scale;
        finalX = Math.max(0, mouseX - dragOffset.x);
        finalY = Math.max(0, mouseY - dragOffset.y);
      } else if (lastPointerPosRef.current) {
        finalX = Math.max(0, lastPointerPosRef.current.x - dragOffset.x);
        finalY = Math.max(0, lastPointerPosRef.current.y - dragOffset.y);
      } else {
        // 폴백: 현재 위치 사용
        if (draggingEntity.type === 'block') {
          const block = blocks.find(b => b.id === draggingEntity.id);
          finalX = block?.x ?? 0;
          finalY = block?.y ?? 0;
        } else {
          const pos = positionsRef.current[draggingEntity.id] || { x: 0, y: 0 };
          finalX = pos.x;
          finalY = pos.y;
        }
      }

      // 즉시 위치 확정 및 저장
      if (draggingEntity.type === 'block') {
        // 드래그 종료 시 정확한 위치로 확정
        const block = blocks.find(b => b.id === draggingEntity.id);
        if (block) {
          // 위치가 실제로 변경되었을 때만 업데이트
          if (Math.abs(block.x - finalX) > 0.01 || Math.abs(block.y - finalY) > 0.01) {
            setBlocks(prev => {
              const updated = [...prev];
              const index = updated.findIndex(b => b.id === draggingEntity.id);
              if (index !== -1) {
                updated[index] = { ...block, x: finalX, y: finalY };
              }
              return updated;
            });
            // 즉시 저장 (debounce 없음)
            handleBlockUpdate(draggingEntity.id, { x: finalX, y: finalY });
          }
        }
      } else {
        // 메모리 카드
        if (selectedMemoryIds.has(draggingEntity.id) && selectedMemoryIds.size > 1) {
          const currentPositions = positionsRef.current;
          const currentDragStartPositions = dragStartPositionsRef.current;
          const startPos = currentDragStartPositions[draggingEntity.id] || currentPositions[draggingEntity.id] || { x: 0, y: 0 };
          const deltaX = finalX - startPos.x;
          const deltaY = finalY - startPos.y;
          
          setPositions(prev => {
            const next = { ...prev };
            selectedMemoryIds.forEach(id => {
              const startPosForCard = currentDragStartPositions[id] || prev[id] || { x: 0, y: 0 };
              next[id] = {
                x: Math.max(0, startPosForCard.x + deltaX),
                y: Math.max(0, startPosForCard.y + deltaY),
              };
            });
            return next;
          });
        } else {
          setPositions(prev => ({
            ...prev,
            [draggingEntity.id]: { x: finalX, y: finalY },
          }));
        }
      }

      // 드래그 상태 즉시 해제
      setDraggingEntity(null);
      lastPointerPosRef.current = null;

      if (isSelecting) {
        setIsSelecting(false);
        setSelectionBox(null);
      }
    };

    const handlePointerCancel = (event?: PointerEvent) => {
      // Pointer capture 해제
      if (event && event.target) {
        try {
          (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
        } catch (e) {
          // ignore
        }
      }
      handleUp(event);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerCancel, { passive: true });
    
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (dragRafIdRef.current !== null) {
        cancelAnimationFrame(dragRafIdRef.current);
        dragRafIdRef.current = null;
      }
    };
  }, [draggingEntity, dragOffset, isSelecting, selectionBox, filteredMemories, cardSize, blocks, localMemories]);

  useEffect(() => {
    if (!positions || Object.keys(positions).length === 0) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      const payload = filteredMemories
        .map(memory => {
          const pos = positions[memory.id];
          return pos ? { memoryId: memory.id, x: pos.x, y: pos.y } : null;
        })
        .filter(Boolean);

      try {
        // positions는 항상 'all'에 저장하여 전체 모드와 동일한 배치 유지
        await fetch('/api/board/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: 'all',
            positions: payload,
          }),
        });
      } catch (error) {
        console.error('Failed to save board positions:', error);
      }
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [positions, filteredMemories, storageKey]);

  useEffect(() => {
    if (settingsTimeoutRef.current) {
      clearTimeout(settingsTimeoutRef.current);
    }
    settingsTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/board/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: storageKey,
            cardSize,
            cardColor,
          }),
        });
      } catch (error) {
        console.error('Failed to save board settings:', error);
      }
    }, 300);

    return () => {
      if (settingsTimeoutRef.current) {
        clearTimeout(settingsTimeoutRef.current);
      }
    };
  }, [cardSize, cardColor, storageKey]);

  useEffect(() => {
    if (colorsTimeoutRef.current) {
      clearTimeout(colorsTimeoutRef.current);
    }
    colorsTimeoutRef.current = setTimeout(async () => {
      const payload = Object.entries(cardColorMap).map(([memoryId, color]) => ({
        memoryId,
        color,
      }));
      try {
        await fetch('/api/board/colors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: storageKey,
            colors: payload,
          }),
        });
      } catch (error) {
        console.error('Failed to save board colors:', error);
      }
    }, 400);

    return () => {
      if (colorsTimeoutRef.current) {
        clearTimeout(colorsTimeoutRef.current);
      }
    };
  }, [cardColorMap, storageKey]);

  const handleAutoArrange = async () => {
    if (filteredMemories.length === 0) return;
    
    setIsAutoArranging(true);
    
    try {
      // 현재 위치 백업
      setPreviousPositions({ ...positions });
      
      // 연결 정보 준비
      const connections = connectionPairsArray.map(pair => ({
        from: pair.from,
        to: pair.to,
      }));
      
      // 메모리 정보 준비 (제목, 내용만)
      const memoryData = filteredMemories.map(m => ({
        id: m.id,
        title: m.title || undefined,
        content: m.content,
      }));
      
      // AI 레이아웃 생성 API 호출
      const res = await fetch('/api/board/arrange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memories: memoryData,
          connections,
          currentPositions: positions,
          cardSize,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const newLayout: Record<string, { x: number; y: number }> = data.layout || {};
        
        // 새 레이아웃 적용
        setPositions(newLayout);
        
        // 보드 크기 조정
        const { width: cardWidth, height: cardHeight } = CARD_DIMENSIONS[cardSize];
        let maxX = 0;
        let maxY = 0;
        (Object.values(newLayout) as { x: number; y: number }[]).forEach((pos) => {
          maxX = Math.max(maxX, pos.x + cardWidth);
          maxY = Math.max(maxY, pos.y + cardHeight);
        });
      setBoardSize({
        width: Math.max(1200, maxX + BOARD_PADDING),
        height: Math.max(800, maxY + BOARD_PADDING),
      });
      } else {
        alert('자동 배열에 실패했습니다');
      }
    } catch (error) {
      console.error('Auto arrange error:', error);
      alert('자동 배열 중 오류가 발생했습니다');
    } finally {
      setIsAutoArranging(false);
    }
  };

  const handleRestoreLayout = () => {
    if (previousPositions) {
      setPositions(previousPositions);
      setPreviousPositions(null);
      
      // 보드 크기 조정
      const { width: cardWidth, height: cardHeight } = CARD_DIMENSIONS[cardSize];
      let maxX = 0;
      let maxY = 0;
      Object.values(previousPositions).forEach(pos => {
        maxX = Math.max(maxX, pos.x + cardWidth);
        maxY = Math.max(maxY, pos.y + cardHeight);
      });
      setBoardSize({
        width: Math.max(1200, maxX + BOARD_PADDING),
        height: Math.max(800, maxY + BOARD_PADDING),
      });
    }
  };

  const getSummaryTitle = (summaryText: string) => {
    const lines = summaryText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    const firstLine = lines[0] || '';
    const cleaned = firstLine.replace(/^[-•*\\d+.\\s]+/, '').trim();
    const fallback = '요약 기록';
    if (!cleaned) return fallback;
    return cleaned.length > 60 ? `${cleaned.slice(0, 60)}...` : cleaned;
  };

  const formatSummaryContent = (summaryText: string) => {
    return summaryText.replace(/\n/g, '<br/>');
  };

  const handleCreateSummaryCard = useCallback(async (sourceMemory: Memory, summaryText: string) => {
    if (!summaryText.trim()) return;

    try {
      const title = getSummaryTitle(summaryText);
      const formData = new FormData();
      if (title) {
        formData.append('title', title);
      }
      formData.append('content', formatSummaryContent(summaryText));
      formData.append('derivedFromCardId', sourceMemory.id);
      formData.append('relatedMemoryIds', JSON.stringify([sourceMemory.id]));

      const res = await fetch('/api/memories', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to create derived memory');
      }

      const data = await res.json();
      const newMemory = data.memory as Memory;
      const sourcePosition = positions[sourceMemory.id] || { x: 24, y: 24 };
      const nextPosition = {
        x: Math.max(0, sourcePosition.x + 220),
        y: Math.max(0, sourcePosition.y + 20),
      };

      setLocalMemories(prev => {
        const updated = [...prev, newMemory];
        const sourceIndex = updated.findIndex(m => m.id === sourceMemory.id);
        if (sourceIndex !== -1) {
          const existingRelated = updated[sourceIndex].relatedMemoryIds || [];
          if (!existingRelated.includes(newMemory.id)) {
            updated[sourceIndex] = {
              ...updated[sourceIndex],
              relatedMemoryIds: [...existingRelated, newMemory.id],
            };
          }
        }
        return updated;
      });

      setPositions(prev => ({
        ...prev,
        [newMemory.id]: nextPosition,
      }));

      setToast({ type: 'success', data: { message: '요약으로 새 기록을 만들었어요.' } });
      setTimeout(() => {
        setToast({ type: null });
      }, 2000);
    } catch (error) {
      console.error('Failed to create summary-derived memory:', error);
      setToast({ type: 'error', data: { message: '요약 기반 기록 생성 실패' } });
    }
  }, [positions]);

  // Bring to front 공통 함수들
  const bringToFrontMemory = useCallback((memoryId: string) => {
    setClickedCardId(memoryId);
    setClickedBlockId(null);
    setLastClickedItem({ type: 'memory', id: memoryId });
    setMemoryOrder(prev => {
      const index = prev.indexOf(memoryId);
      if (index === -1 || index === prev.length - 1) return prev;
      const newOrder = [...prev];
      newOrder.splice(index, 1);
      newOrder.push(memoryId);
      return newOrder;
    });
  }, []);

  const bringToFrontBlock = useCallback((blockId: string) => {
    setClickedBlockId(blockId);
    setClickedCardId(null);
    setLastClickedItem({ type: 'block', id: blockId });
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === blockId);
      if (index === -1 || index === prev.length - 1) return prev;
      const newBlocks = [...prev];
      const [clickedBlock] = newBlocks.splice(index, 1);
      newBlocks.push(clickedBlock);
      return newBlocks;
    });
  }, []);

  const handlePointerDown = (memoryId: string, event: React.PointerEvent) => {
    // 먼저 bring-to-front 처리 (조작 요소가 아닌 경우)
    const target = event.target as HTMLElement;
    const isInteractiveElement = target.closest('button') || 
                                 target.closest('a') || 
                                 target.closest('[contenteditable]') || 
                                 target.closest('input') || 
                                 target.closest('textarea') ||
                                 target.closest('img');
    
    if (!isInteractiveElement) {
      // 조작 요소가 아니면 무조건 bring-to-front
      bringToFrontMemory(memoryId);
      // Pointer capture 설정
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
    // 편집 모드에서는 드래그 비활성화
    const cardElement = (event.currentTarget as HTMLElement).querySelector(`[data-editing="true"]`);
    if (cardElement) {
      return;
    }

    // 조작 요소에서는 드래그만 비활성화 (bring-to-front는 이미 처리됨)
    if (isInteractiveElement) {
      return;
    }

    // Ctrl/Cmd 키로 다중 선택 모드
    const isMultiSelect = event.ctrlKey || event.metaKey;
    
    if (isMultiSelect) {
      // 다중 선택 토글
      setSelectedMemoryIds(prev => {
        const next = new Set(prev);
        if (next.has(memoryId)) {
          next.delete(memoryId);
        } else {
          next.add(memoryId);
        }
        return next;
      });
      // 다중 선택 모드에서는 드래그 시작하지 않음
      return;
    }

    // 선택된 카드가 있고, 클릭한 카드가 선택된 카드 중 하나면 다중 드래그
    if (selectedMemoryIds.size > 0 && selectedMemoryIds.has(memoryId)) {
      // 선택된 모든 카드를 드래그 - 드래그 시작 시점의 위치 저장
      event.preventDefault();
      event.stopPropagation();
      
      const boardRect = boardRef.current?.getBoundingClientRect();
      if (!boardRect) return;
      
      // 선택된 모든 카드의 현재 위치를 드래그 시작 위치로 저장
      const currentPositions = positionsRef.current;
      const startPositions: Record<string, { x: number; y: number }> = {};
      selectedMemoryIds.forEach(id => {
        startPositions[id] = currentPositions[id] || { x: 0, y: 0 };
      });
      setDragStartPositions(startPositions);
      
      // 드래그 오프셋 계산
      const currentPos = currentPositions[memoryId] || { x: 0, y: 0 };
      const mouseX = (event.clientX - boardRect.left) / zoomRef.current;
      const mouseY = (event.clientY - boardRect.top) / zoomRef.current;
      
      // 통합 드래그 시스템 사용
      setDraggingEntity({ type: 'memory', id: memoryId });
      setDragOffset({
        x: mouseX - currentPos.x,
        y: mouseY - currentPos.y,
      });
      return;
    }

    // 단일 카드 드래그
    if (selectedMemoryIds.size > 0) {
      // 다른 카드를 클릭하면 선택 해제
      setSelectedMemoryIds(new Set());
    }

    event.preventDefault();
    event.stopPropagation();
    
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;
    
    // 드래그 시작 시점의 마우스 위치와 카드 위치를 저장
    const currentPos = positionsRef.current[memoryId] || { x: 0, y: 0 };
    const startMouseX = (event.clientX - boardRect.left) / zoomRef.current;
    const startMouseY = (event.clientY - boardRect.top) / zoomRef.current;
    
    // 통합 드래그 시스템 사용 (드래그 중에는 항상 최상단)
    setDraggingEntity({ type: 'memory', id: memoryId });
    setDragOffset({
      x: startMouseX - currentPos.x,
      y: startMouseY - currentPos.y,
    });
  };

  // 클러스터 재구성 제거 - 시간순으로만 표시
  // filteredClusters는 더 이상 사용하지 않음


  if (memories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        아직 기억이 없습니다
      </div>
    );
  }

  const cardSizeData = CARD_DIMENSIONS[cardSize];
  const cardSizeClass = cardSize === 's' ? 'w-[260px]' : cardSize === 'l' ? 'w-[360px]' : 'w-[320px]';
  const cardSizeCenter = { x: cardSizeData.centerX, y: cardSizeData.centerY };

  const cardColorClass = cardColor === 'green'
    ? 'bg-green-50 border-2 border-green-300'
    : cardColor === 'pink'
    ? 'bg-pink-50 border-2 border-pink-300'
    : 'bg-indigo-50 border-2 border-indigo-300';

  // 연결 그룹을 찾아서 색상 할당
  const connectionPairsWithColor = useMemo(() => {
    const set = new Set<string>();
    const pairs: Array<{ from: string; to: string }> = [];
    const visibleIds = new Set(filteredMemories.map(m => m.id));
    
    // 연결 쌍 수집
    filteredMemories.forEach(memory => {
      const related = memory.relatedMemoryIds || [];
      related.forEach(relatedId => {
        if (!visibleIds.has(relatedId)) return;
        const key = [memory.id, relatedId].sort().join(':');
        if (set.has(key)) return;
        set.add(key);
        pairs.push({ from: memory.id, to: relatedId });
      });
    });

    // 연결 그룹 찾기 (독립적인 연결 네트워크별로 그룹화)
    // 각 그룹은 서로 연결된 노드들의 집합
    const connectionGroups: Array<Set<string>> = [];
    const nodeToGroup = new Map<string, number>();
    
    pairs.forEach(pair => {
      const fromGroup = nodeToGroup.get(pair.from);
      const toGroup = nodeToGroup.get(pair.to);
      
      if (fromGroup === undefined && toGroup === undefined) {
        // 새 그룹 생성
        const newGroup = new Set<string>([pair.from, pair.to]);
        connectionGroups.push(newGroup);
        const groupIndex = connectionGroups.length - 1;
        nodeToGroup.set(pair.from, groupIndex);
        nodeToGroup.set(pair.to, groupIndex);
      } else if (fromGroup !== undefined && toGroup === undefined) {
        // from 그룹에 to 추가
        connectionGroups[fromGroup].add(pair.to);
        nodeToGroup.set(pair.to, fromGroup);
      } else if (fromGroup === undefined && toGroup !== undefined) {
        // to 그룹에 from 추가
        connectionGroups[toGroup].add(pair.from);
        nodeToGroup.set(pair.from, toGroup);
      } else if (fromGroup !== undefined && toGroup !== undefined && fromGroup !== toGroup) {
        // 두 그룹 병합
        const merged = new Set([...connectionGroups[fromGroup], ...connectionGroups[toGroup]]);
        connectionGroups[fromGroup] = merged;
        connectionGroups[toGroup].forEach(node => nodeToGroup.set(node, fromGroup));
        connectionGroups[toGroup] = new Set(); // 빈 그룹으로 표시
      }
    });

    // 색상 팔레트
    const colors = [
      '#6366F1', // indigo (기본)
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#06B6D4', // cyan
      '#EC4899', // pink
      '#14B8A6', // teal
    ];

    // 각 연결 쌍에 색상 할당 (연결 그룹별로)
    const pairsWithColor = pairs.map(pair => {
      const fromGroup = nodeToGroup.get(pair.from);
      const toGroup = nodeToGroup.get(pair.to);
      // 두 노드가 같은 그룹에 속하면 그 그룹의 색상 사용
      const groupIndex = fromGroup !== undefined ? fromGroup : (toGroup !== undefined ? toGroup : -1);
      const colorIndex = groupIndex >= 0 ? groupIndex % colors.length : 0;
      return {
        ...pair,
        color: colors[colorIndex],
        groupIndex: groupIndex,
      };
    });

    // 같은 두 카드 사이의 연결 개수 계산 (병렬 선 표시용)
    // 양방향 연결을 고려 (A->B와 B->A는 같은 연결)
    const pairKeyToCount = new Map<string, number>();
    const pairKeyToConnections = new Map<string, Array<typeof pairsWithColor[0]>>();
    
    pairsWithColor.forEach(pair => {
      const key = [pair.from, pair.to].sort().join(':');
      pairKeyToCount.set(key, (pairKeyToCount.get(key) || 0) + 1);
      
      if (!pairKeyToConnections.has(key)) {
        pairKeyToConnections.set(key, []);
      }
      pairKeyToConnections.get(key)!.push(pair);
    });

    // 각 연결 쌍에 오프셋 인덱스 할당 (같은 두 카드 사이의 여러 연결을 병렬로 표시)
    const pairKeyToIndex = new Map<string, number>();
    pairsWithColor.forEach(pair => {
      const key = [pair.from, pair.to].sort().join(':');
      const count = pairKeyToCount.get(key) || 1;
      const currentIndex = pairKeyToIndex.get(key) || 0;
      pairKeyToIndex.set(key, currentIndex + 1);
      (pair as any).offsetIndex = currentIndex;
      (pair as any).totalConnections = count; // 같은 두 카드 사이의 총 연결 개수
      
      // 디버깅용 로그
      if (count > 1) {
        console.log(`🔗 병렬 연결 감지: ${pair.from} <-> ${pair.to}, 총 ${count}개, 인덱스 ${currentIndex}`);
      }
    });

    const validGroups = connectionGroups.filter(g => g.size > 0);
    if (pairsWithColor.length > 0) {
      console.log('🔗 연결선 개수:', pairsWithColor.length, '그룹 수:', validGroups.length);
    }
    
    return {
      pairsWithColor,
      connectionGroups: validGroups,
      nodeToGroup,
    };
  }, [filteredMemories, linkInfo, getLinkKey]);

  // 간단한 시드 기반 랜덤 함수 (groupId 기반 고정 랜덤)
  const seededRandom = useCallback((seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }, []);

  // Blob Area 생성 (연결 그룹에서 자동 생성)
  const blobAreas = useMemo(() => {
    const { connectionGroups, pairsWithColor } = connectionPairsWithColor;
    const blobs: Array<{
      id: string;
      memoryIds: string[];
      color: string;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      seed: number;
      center: { x: number; y: number };
      radius: { x: number; y: number };
    }> = [];

    connectionGroups.forEach((group, groupIndex) => {
      const memoryIds = Array.from(group);
      
      // Blob 생성 조건 확인
      // 연결된 컴포넌트(connected component)면 블롭 생성
      // 최소 조건: 그룹 내 카드 수 >= 3 (2개는 선과 겹쳐서 애매함)
      if (memoryIds.length < 3) return;

      // 연결선 개수 체크는 제거 - 연결된 컴포넌트면 무조건 블롭 생성
      // (트리/스타 형태도 포함)

      // 카드 위치 기반 bounding box 계산
      const cardPositions = memoryIds
        .map(id => {
          const pos = positions[id];
          if (!pos) return null;
          const cardData = CARD_DIMENSIONS[cardSize];
          return {
            x: pos.x,
            y: pos.y,
            width: cardData.width,
            height: cardData.height,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      if (cardPositions.length === 0) return;

      // Bounding box 계산 (padding에 랜덤 지터 적용)
      const basePadding = 40;
      const seed = groupIndex * 1000 + memoryIds.length; // 그룹별 고정 시드
      const paddingX = basePadding + (seededRandom(seed) - 0.5) * 20; // ±10px
      const paddingY = basePadding + (seededRandom(seed + 1) - 0.5) * 20; // ±10px
      
      const minX = Math.min(...cardPositions.map(p => p.x)) - paddingX;
      const minY = Math.min(...cardPositions.map(p => p.y)) - paddingY;
      const maxX = Math.max(...cardPositions.map(p => p.x + p.width)) + paddingX;
      const maxY = Math.max(...cardPositions.map(p => p.y + p.height)) + paddingY;

      // 파스텔 색상 팔레트
      const pastelColors = [
        '#E0E7FF', // indigo
        '#D1FAE5', // green
        '#FEF3C7', // amber
        '#FEE2E2', // red
        '#EDE9FE', // purple
        '#CFFAFE', // cyan
        '#FCE7F3', // pink
        '#CCFBF1', // teal
      ];

      // 원/타원 기반 Blob을 위한 중심점과 반지름 계산
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const rx = (maxX - minX) / 2;
      const ry = (maxY - minY) / 2;

      blobs.push({
        id: `blob-${groupIndex}`,
        memoryIds,
        color: pastelColors[groupIndex % pastelColors.length],
        bounds: { minX, minY, maxX, maxY },
        seed,
        center: { x: cx, y: cy },
        radius: { x: rx, y: ry },
      });
    });

    // 디버깅 로그 추가
    console.log('🎨 blobAreas 생성:', blobs.length, '개', blobs.map(b => ({ id: b.id, memoryCount: b.memoryIds.length })));

    return blobs;
  }, [connectionPairsWithColor, positions, cardSize, seededRandom, linkInfo]);

  // connectionPairsWithColor를 배열로 변환 (기존 코드 호환성)
  const connectionPairsArray = useMemo(() => {
    return connectionPairsWithColor.pairsWithColor;
  }, [connectionPairsWithColor]);

  // 새로 생성된 blob 감지 및 애니메이션 트리거
  useEffect(() => {
    const currentBlobIds = new Set(blobAreas.map(b => b.id));
    const newBlobIds = Array.from(currentBlobIds).filter(id => !animatedBlobIds.has(id));
    
    if (newBlobIds.length > 0) {
      // 새로 생성된 blob들에 애니메이션 적용
      setAnimatedBlobIds(prev => {
        const updated = new Set(prev);
        newBlobIds.forEach(id => updated.add(id));
        return updated;
      });
      
      // 애니메이션 상태 설정
      const newStates: Record<string, 'entering' | 'idle'> = {};
      newBlobIds.forEach(id => {
        newStates[id] = 'entering';
      });
      setBlobAnimationStates(prev => ({ ...prev, ...newStates }));
      
      // 애니메이션 완료 후 idle로 전환
      setTimeout(() => {
        setBlobAnimationStates(prev => {
          const updated = { ...prev };
          newBlobIds.forEach(id => {
            updated[id] = 'idle';
          });
          return updated;
        });
      }, 400); // 400ms 애니메이션
    }
  }, [blobAreas, animatedBlobIds]);

  // 블롭 위치 반응성 (카드 이동 시 살짝 늦게 따라오기)
  useEffect(() => {
    const newPositions: Record<string, { minX: number; minY: number; maxX: number; maxY: number }> = {};
    blobAreas.forEach(blob => {
      const currentPos = blobPositions[blob.id];
      if (currentPos) {
        // 기존 위치가 있으면 transition으로 부드럽게 이동
        newPositions[blob.id] = currentPos;
      } else {
        // 처음 생성된 경우 즉시 설정
        newPositions[blob.id] = blob.bounds;
      }
    });
    
    // 200ms 지연 후 새 위치로 업데이트 (center와 radius는 bounds에서 계산)
    const timer = setTimeout(() => {
      setBlobPositions(prev => {
        const updated = { ...prev };
        blobAreas.forEach(blob => {
          updated[blob.id] = blob.bounds;
        });
        return updated;
      });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [blobAreas, blobPositions]);

  return (
    <div className="w-full mx-auto space-y-6">
      {/* 필터 바 - 폴더 스타일 */}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
        {/* 전체 */}
        <button
          onClick={() => setSelectedGroupId(null)}
          className={`flex flex-col items-center gap-1 p-3 border-2 transition-all ${
            selectedGroupId === null
              ? 'bg-gray-900 border-indigo-500 scale-105'
              : 'hover:bg-gray-50 border-gray-200'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className={`w-10 h-10 transition-all`}>
            <path d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" 
                  fill={selectedGroupId === null ? 'white' : '#6B7280'}
                  stroke="none"/>
          </svg>
          <span className={`text-xs font-medium ${selectedGroupId === null ? 'text-white' : 'text-gray-600'}`}>
            전체 {memories.length}
          </span>
        </button>

        {/* 그룹 폴더들 */}
        {groups.map(group => {
          const colorMap: Record<string, string> = {
            blue: selectedGroupId === group.id ? '#3B82F6' : '#93C5FD',
            purple: selectedGroupId === group.id ? '#A855F7' : '#D8B4FE',
            green: selectedGroupId === group.id ? '#10B981' : '#86EFAC',
            orange: selectedGroupId === group.id ? '#F97316' : '#FDBA74',
            pink: selectedGroupId === group.id ? '#EC4899' : '#F9A8D4',
            red: selectedGroupId === group.id ? '#EF4444' : '#FCA5A5',
            yellow: selectedGroupId === group.id ? '#EAB308' : '#FDE047',
          };
          const folderColor = colorMap[group.color || 'blue'];
          
          return (
            <button
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              onDragOver={(e) => handleDragOver(e, group.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, group.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all relative ${
                selectedGroupId === group.id
                  ? 'bg-gray-900 shadow-lg scale-105'
                  : dropTargetGroupId === group.id
                  ? 'bg-blue-50 scale-105'
                  : 'hover:bg-gray-50'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" className={`w-10 h-10 transition-all ${
                selectedGroupId === group.id 
                  ? '' 
                  : 'drop-shadow-md hover:drop-shadow-lg'
              }`}>
                <path d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" 
                      fill={selectedGroupId === group.id ? 'white' : folderColor}
                      stroke="none"/>
              </svg>
              <span className={`text-xs font-medium max-w-[80px] truncate ${
                selectedGroupId === group.id ? 'text-white' : 'text-gray-600'
              }`}>
                {group.name}
              </span>
              <span className={`text-[11px] ${
                selectedGroupId === group.id ? 'text-gray-300' : 'text-gray-400'
              }`}>
                {group.memoryIds.length}개
              </span>
              {dropTargetGroupId === group.id && (
                <div className="absolute -top-1 -right-1 text-lg">📥</div>
              )}
            </button>
          );
        })}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">크기</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCardSize('s')}
                className={`px-2 py-1 text-xs rounded-lg ${cardSize === 's' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                작게
              </button>
              <button
                onClick={() => setCardSize('m')}
                className={`px-2 py-1 text-xs rounded-lg ${cardSize === 'm' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                보통
              </button>
              <button
                onClick={() => setCardSize('l')}
                className={`px-2 py-1 text-xs rounded-lg ${cardSize === 'l' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                크게
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 그룹 설명 */}
      {selectedGroupId && (
        <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-indigo-50 border-2 border-indigo-300">
          {isLoadingGroupDescription ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin">✨</div>
              <span>AI가 그룹을 분석하고 있어요...</span>
            </div>
          ) : groupDescription ? (
            <div className="flex items-start gap-3">
              <div className="text-2xl">📁</div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-800 mb-1">
                  {groups.find(g => g.id === selectedGroupId)?.name || '그룹'}에 대해
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{groupDescription}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>그룹 설명을 불러올 수 없습니다.</span>
            </div>
          )}
        </div>
      )}

      {/* 화이트보드 뷰 */}
      <div data-tutorial-target="board-view">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            해당 그룹에 기억이 없습니다
          </div>
        ) : (
          <div className="w-full bg-white border-2 border-gray-300 overflow-hidden">
            {/* 컨트롤 바 - 엑셀 틀고정처럼 항상 고정 */}
            <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 bg-white border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">화이트보드</span>
                <span className="text-[11px] text-gray-400">
                  {Math.round(boardSize.width)}×{Math.round(boardSize.height)}
                </span>
                {previousPositions && (
                  <button
                    onClick={handleRestoreLayout}
                    className="px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
                    title="이전 배열로 되돌리기"
                  >
                    이전 배열로
                  </button>
                )}
                <button
                  onClick={handleAutoArrange}
                  disabled={isAutoArranging}
                  className="px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                  title="연결선 기반으로 자동 배열"
                >
                  {isAutoArranging ? '배열 중...' : '맞춤 배열'}
                </button>
                <button
                  onClick={handleCreateCalendarBlock}
                  className="px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1"
                  title="캘린더 블록"
                >
                  <span>📅</span>
                  <span>캘린더</span>
                </button>
                <button
                  onClick={handleCreateMinimapBlock}
                  disabled={blocks.some(b => b.type === 'minimap')}
                  className="px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 flex items-center gap-1"
                  title={blocks.some(b => b.type === 'minimap') ? '미니맵은 보드당 하나만 추가할 수 있습니다' : '미니맵 블록 추가'}
                >
                  <span>🗺️</span>
                  <span>미니맵 추가</span>
                </button>
                <button
                  onClick={handleCreateViewerBlock}
                  className="px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1"
                  title="Viewer 위젯"
                >
                  <span>📺</span>
                  <span>Viewer</span>
                </button>
                <button
                  onClick={handleCreateMeetingRecorderBlock}
                  className="px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1"
                  title="미팅 레코더"
                >
                  <span>🎙️</span>
                  <span>미팅 레코더</span>
                </button>
                <button
                  onClick={handleCreateDatabaseBlock}
                  className="px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1"
                  title="데이터베이스"
                >
                  <span>📊</span>
                  <span>데이터베이스</span>
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => changeZoom(-0.1)}
                  className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                  disabled={zoom <= 0.5}
                >
                  -
                </button>
                <span className="text-xs font-semibold">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => changeZoom(0.1)}
                  className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                  disabled={zoom >= 1.6}
                >
                  +
                </button>
                <button
                  onClick={resetZoom}
                  className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50"
                >
                  초기화
                </button>
              </div>
            </div>

            {/* 스크롤 가능한 보드 영역 - 엑셀 틀고정처럼 컨트롤 바는 고정, 이 영역만 스크롤 */}
            <div
              ref={boardContainerRef}
              className="relative w-full overflow-auto"
              style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}
              onScroll={updateViewportBounds}
            >
              <div
                className="relative"
                style={{ minWidth: boardSize.width, minHeight: boardSize.height }}
              >
              
              <div
                className="relative"
                style={{
                  width: boardSize.width,
                  height: boardSize.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
                ref={boardRef}
                onPointerDown={(e) => {
                  // 카드나 다른 요소를 클릭한 경우 무시
                  const target = e.target as HTMLElement;
                  if (target.closest('[data-memory-card]') || target.closest('[data-calendar-block]')) {
                    return;
                  }
                  
                  // 보드 빈 공간에서 시작하는 드래그 선택
                  if (target === e.currentTarget || target.classList.contains('relative') || target.tagName === 'svg' || target.tagName === 'g' || target === boardRef.current) {
                    // Ctrl/Cmd 키가 눌려있지 않으면 기존 선택 해제
                    if (!e.ctrlKey && !e.metaKey && selectedMemoryIds.size > 0) {
                      setSelectedMemoryIds(new Set());
                    }
                    
                    // 블록 선택 해제
                    setClickedBlockId(null);
                    setClickedCardId(null);
                    
                    // 드래그 선택 시작
                    const rect = boardRef.current!.getBoundingClientRect();
                    const scale = zoomRef.current;
                    const startX = (e.clientX - rect.left) / scale;
                    const startY = (e.clientY - rect.top) / scale;
                    
                    setIsSelecting(true);
                    setSelectionBox({ startX, startY, endX: startX, endY: startY });
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {/* 드래그 선택 박스 */}
                {selectionBox && (
                  <div
                    className="absolute border-2 border-indigo-500 bg-indigo-200/20 pointer-events-none z-40"
                    style={{
                      left: `${Math.min(selectionBox.startX, selectionBox.endX)}px`,
                      top: `${Math.min(selectionBox.startY, selectionBox.endY)}px`,
                      width: `${Math.abs(selectionBox.endX - selectionBox.startX)}px`,
                      height: `${Math.abs(selectionBox.endY - selectionBox.startY)}px`,
                    }}
                  />
                )}

                {/* 다중 선택 안내 */}
                {selectedMemoryIds.size > 0 && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-2 border-2 border-indigo-600 flex items-center gap-2 z-30">
                    <span className="text-sm font-medium">
                      {selectedMemoryIds.size}개 카드 선택됨 (드래그 또는 Ctrl/Cmd + 클릭으로 선택)
                    </span>
                    <button
                      onClick={() => setSelectedMemoryIds(new Set())}
                      className="text-white hover:text-gray-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* 블록 렌더링 (가상화 적용) */}
                {visibleBlocks.map((block, blockIndex) => {
                  if (block.type === 'calendar') {
                    const config = block.config as CalendarBlockConfig;
                    return (
                      <CalendarBlock
                        key={block.id}
                        blockId={block.id}
                        x={block.x}
                        y={block.y}
                        width={block.width}
                        height={block.height}
                        config={config}
                        memories={localMemories}
                        onUpdate={handleBlockUpdate}
                        onDelete={handleBlockDelete}
                        onMemoryClick={(memoryId) => {
                          // 캘린더 위젯에서 @ 태그 클릭 시 토스트 표시
                          handleMentionClick(block.id, memoryId, true);
                        }}
                        onDateClick={(date, memoryIds) => {
                          // 날짜 클릭 시 해당 날짜의 메모리들로 필터링하거나 하이라이트
                          memoryIds.forEach(id => {
                            const element = document.getElementById(`memory-${id}`);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            element?.classList.add('ring-2', 'ring-green-400');
                            setTimeout(() => {
                              element?.classList.remove('ring-2', 'ring-green-400');
                            }, 2000);
                          });
                        }}
                        onLinkMemory={(memoryId) => {
                          // 메모리를 캘린더 블록에 연결
                          const currentConfig = config;
                          const linkedIds = currentConfig.linkedMemoryIds || [];
                          if (!linkedIds.includes(memoryId)) {
                            handleBlockUpdate(block.id, {
                              config: {
                                ...currentConfig,
                                linkedMemoryIds: [...linkedIds, memoryId]
                              }
                            });
                          }
                        }}
                        isDragging={draggingBlockId === block.id}
                        isClicked={clickedBlockId === block.id}
                        zIndex={draggingBlockId === block.id ? 10000 : (10 + blockIndex)}
                        onPointerDown={(e) => {
                          const target = e.target as HTMLElement;
                          const isInteractiveElement = target.closest('button') || 
                                                       target.closest('a') || 
                                                       target.closest('input') ||
                                                       target.closest('textarea') ||
                                                       target.closest('canvas');
                          
                          // 조작 요소가 아니면 먼저 bring-to-front 처리
                          if (!isInteractiveElement) {
                            bringToFrontBlock(block.id);
                            // Pointer capture 설정
                            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                          }
                          
                          // 조작 요소에서는 드래그만 비활성화
                          if (isInteractiveElement) {
                            return;
                          }
                          
                          if (!boardRef.current) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = boardRef.current.getBoundingClientRect();
                          const scale = zoomRef.current;
                          
                          // 통합 드래그 시스템 사용
                          setDraggingEntity({ type: 'block', id: block.id });
                          setDragOffset({
                            x: (e.clientX - rect.left) / scale - block.x,
                            y: (e.clientY - rect.top) / scale - block.y,
                          });
                        }}
                      />
                    );
                  }
                  if (block.type === 'minimap') {
                    return (
                      <div
                        key={block.id}
                        data-minimap-block={block.id}
                        className="absolute bg-white border-2 border-gray-300 overflow-hidden"
                        style={{
                          transform: `translate3d(${block.x}px, ${block.y}px, 0)`,
                          width: `${block.width || 420}px`,
                          height: `${block.height || 300}px`,
                          zIndex: draggingBlockId === block.id ? 10000 : (lastClickedItem?.type === 'block' && lastClickedItem.id === block.id ? 5000 : (clickedBlockId === block.id ? 100 + blockIndex : 10 + blockIndex)),
                          opacity: draggingBlockId === block.id ? 0.85 : 1,
                          transition: 'none',
                          willChange: draggingBlockId === block.id ? 'transform' : 'auto',
                          pointerEvents: draggingBlockId === block.id ? 'none' : 'auto',
                          contain: 'layout style paint',
                        }}
                        onPointerDown={(e) => {
                          const target = e.target as HTMLElement;
                          const isInteractiveElement = target.closest('button') || 
                                                       target.closest('canvas');
                          
                          // 조작 요소가 아니면 먼저 bring-to-front 처리
                          if (!isInteractiveElement) {
                            bringToFrontBlock(block.id);
                            // Pointer capture 설정
                            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                          }
                          
                          // 조작 요소에서는 드래그만 비활성화
                          if (isInteractiveElement) {
                            return;
                          }
                          
                          if (!boardRef.current) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = boardRef.current.getBoundingClientRect();
                          const scale = zoomRef.current;
                          
                          setDraggingEntity({ type: 'block', id: block.id });
                          setDragOffset({
                            x: (e.clientX - rect.left) / scale - block.x,
                            y: (e.clientY - rect.top) / scale - block.y,
                          });
                        }}
                      >
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">🗺️</span>
                            <span className="text-xs font-semibold text-gray-700">Minimap</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBlockDelete(block.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 text-xs"
                            title="삭제"
                          >
                            ×
                          </button>
                        </div>
                        {/* 미니맵 캔버스 */}
                        {boardSize.width > 0 && boardSize.height > 0 && (
                          <div className="h-[calc(100%-40px)] overflow-hidden">
                            <Minimap
                              boardSize={boardSize}
                              positions={positions}
                              blocks={blocks.filter(b => b.type !== 'minimap')}
                              memories={filteredMemories}
                              blobAreas={blobAreas}
                              connectionPairs={connectionPairsWithColor.pairsWithColor}
                              viewportBounds={viewportBounds}
                              zoom={zoom}
                              boardContainerRef={boardContainerRef}
                              cardSize={cardSize}
                              cardColorMap={cardColorMap}
                              cardColor={cardColor}
                              headerHeight={0}
                            />
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (block.type === 'viewer') {
                    const viewerConfig = block.config as ViewerBlockConfig;
                    return (
                      <ViewerBlock
                        key={block.id}
                        blockId={block.id}
                        x={block.x}
                        y={block.y}
                        width={block.width}
                        height={block.height}
                        config={viewerConfig}
                        onUpdate={handleBlockUpdate}
                        onDelete={handleBlockDelete}
                        isDragging={draggingBlockId === block.id}
                        isClicked={clickedBlockId === block.id}
                        zIndex={draggingBlockId === block.id ? 10000 : (10 + blockIndex)}
                        onPointerDown={(e) => {
                          // 버튼이나 링크 클릭이 아닐 때만 드래그 시작
                          const target = e.target as HTMLElement;
                          if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('canvas')) {
                            return;
                          }
                          
                          if (!boardRef.current) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = boardRef.current.getBoundingClientRect();
                          const scale = zoomRef.current;
                          
                          setDraggingEntity({ type: 'block', id: block.id });
                          setDragOffset({
                            x: (e.clientX - rect.left) / scale - block.x,
                            y: (e.clientY - rect.top) / scale - block.y,
                          });
                        }}
                        onClick={() => {
                          setClickedBlockId(block.id);
                          setClickedCardId(null);
                          // 클릭한 블록을 배열의 맨 뒤로 이동 (최상단 표시)
                          setBlocks(prev => {
                            const index = prev.findIndex(b => b.id === block.id);
                            if (index === -1 || index === prev.length - 1) return prev;
                            const newBlocks = [...prev];
                            const [clickedBlock] = newBlocks.splice(index, 1);
                            newBlocks.push(clickedBlock);
                            return newBlocks;
                          });
                        }}
                      />
                    );
                  }
                  if (block.type === 'meeting-recorder') {
                    const meetingConfig = block.config as MeetingRecorderBlockConfig;
                    return (
                      <MeetingRecorderBlock
                        key={block.id}
                        blockId={block.id}
                        x={block.x}
                        y={block.y}
                        width={block.width}
                        height={block.height}
                        config={meetingConfig}
                        onUpdate={handleBlockUpdate}
                        onDelete={handleBlockDelete}
                        isDragging={draggingBlockId === block.id}
                        isClicked={clickedBlockId === block.id}
                        zIndex={draggingBlockId === block.id ? 10000 : (lastClickedItem?.type === 'block' && lastClickedItem.id === block.id ? 5000 : (clickedBlockId === block.id ? 100 + blockIndex : 10 + blockIndex))}
                        onPointerDown={(e) => {
                          const target = e.target as HTMLElement;
                          const isInteractiveElement = target.closest('button') || 
                                                       target.closest('input') ||
                                                       target.closest('textarea');
                          
                          if (!isInteractiveElement) {
                            bringToFrontBlock(block.id);
                            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                          }
                          
                          if (isInteractiveElement) {
                            return;
                          }
                          
                          if (!boardRef.current) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = boardRef.current.getBoundingClientRect();
                          const scale = zoomRef.current;
                          
                          setDraggingEntity({ type: 'block', id: block.id });
                          setDragOffset({
                            x: (e.clientX - rect.left) / scale - block.x,
                            y: (e.clientY - rect.top) / scale - block.y,
                          });
                        }}
                      />
                    );
                  }
                  if (block.type === 'database') {
                    const databaseConfig = block.config as DatabaseBlockConfig;
                    return (
                      <DatabaseBlock
                        key={block.id}
                        blockId={block.id}
                        x={block.x}
                        y={block.y}
                        width={block.width}
                        height={block.height}
                        config={databaseConfig}
                        onUpdate={handleBlockUpdate}
                        onDelete={handleBlockDelete}
                        isDragging={draggingBlockId === block.id}
                        isClicked={clickedBlockId === block.id}
                        zIndex={draggingBlockId === block.id ? 10000 : (lastClickedItem?.type === 'block' && lastClickedItem.id === block.id ? 5000 : (clickedBlockId === block.id ? 100 + blockIndex : 10 + blockIndex))}
                        onPointerDown={(e) => {
                          const target = e.target as HTMLElement;
                          const isInteractiveElement = target.closest('button') || 
                                                       target.closest('input') ||
                                                       target.closest('select') ||
                                                       target.closest('table');
                          
                          if (!isInteractiveElement) {
                            bringToFrontBlock(block.id);
                            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                          }
                          
                          if (isInteractiveElement) {
                            return;
                          }
                          
                          if (!boardRef.current) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = boardRef.current.getBoundingClientRect();
                          const scale = zoomRef.current;
                          
                          setDraggingEntity({ type: 'block', id: block.id });
                          setDragOffset({
                            x: (e.clientX - rect.left) / scale - block.x,
                            y: (e.clientY - rect.top) / scale - block.y,
                          });
                        }}
                      />
                    );
                  }
                  return null;
                })}

                {/* 연결선 SVG - 카드 뒤에 렌더링 */}
                {/* Blob Areas 렌더링 (연결선 아래) */}
                {blobAreas.length > 0 && (
                  <svg
                    className="absolute inset-0"
                    width={boardSize.width}
                    height={boardSize.height}
                    style={{ zIndex: 0 }}
                  >
                    {blobAreas.map(blob => {
                      // 반응성: blobPositions에서 위치 가져오기 (카드 이동 시 살짝 늦게 따라오기)
                      const currentBounds = blobPositions[blob.id] || blob.bounds;
                      
                      // bounds에서 center와 radius 계산 (항상 일관되게)
                      const cx = (currentBounds.minX + currentBounds.maxX) / 2;
                      const cy = (currentBounds.minY + currentBounds.maxY) / 2;
                      const rx = (currentBounds.maxX - currentBounds.minX) / 2;
                      const ry = (currentBounds.maxY - currentBounds.minY) / 2;
                      
                      // 원/타원 기반 유기적 Blob path 생성 (24개 포인트 샘플링으로 더 부드러운 곡선)
                      const seed = blob.seed;
                      const numPoints = 24; // 20 → 24로 증가 (20% 증가, 더 매끈한 경계)
                      const pathPoints: Array<{ x: number; y: number; radius: number }> = [];
                      
                      // 이전 반지름 추적 (인접 포인트 간 급격한 변화 방지)
                      let prevRadiusX = rx;
                      let prevRadiusY = ry;
                      
                      for (let i = 0; i < numPoints; i++) {
                        const angle = (i / numPoints) * Math.PI * 2;
                        // seed 기반으로 반지름에 ±3~6px 노이즈 추가 (스파이크 방지, 진폭 25% 감소)
                        const noiseSeed = seed * 100 + i;
                        const radiusNoise = (seededRandom(noiseSeed) - 0.5) * 12; // ±8px → ±6px (25% 감소)
                        const angleNoise = (seededRandom(noiseSeed + 1000) - 0.5) * 0.08; // ±0.1 → ±0.08 rad (20% 감소)
                        
                        const adjustedAngle = angle + angleNoise;
                        
                        // 반지름에 노이즈 적용 + 인접 포인트 간 변화량 clamp (스파이크 방지)
                        const targetRx = rx + radiusNoise * 0.35; // 0.4 → 0.35 (약간 감소)
                        const targetRy = ry + radiusNoise * 0.35;
                        
                        // 인접 포인트 간 최대 변화량 제한 (±6px → ±4px, 더 강하게)
                        const maxChange = 4; // 6 → 4로 감소 (급격한 튐 더 강하게 제거)
                        const clampedRx = Math.max(
                          Math.min(targetRx, prevRadiusX + maxChange),
                          prevRadiusX - maxChange
                        );
                        const clampedRy = Math.max(
                          Math.min(targetRy, prevRadiusY + maxChange),
                          prevRadiusY - maxChange
                        );
                        
                        // 최소값 보장
                        const adjustedRx = Math.max(30, clampedRx);
                        const adjustedRy = Math.max(30, clampedRy);
                        
                        prevRadiusX = adjustedRx;
                        prevRadiusY = adjustedRy;
                        
                        const x = cx + Math.cos(adjustedAngle) * adjustedRx;
                        const y = cy + Math.sin(adjustedAngle) * adjustedRy;
                        pathPoints.push({ x, y, radius: (adjustedRx + adjustedRy) / 2 });
                      }
                      
                      // SVG path 생성 (부드러운 곡선 - Catmull-Rom 스플라인 스타일)
                      const path = pathPoints.map((point, i) => {
                        if (i === 0) {
                          return `M ${point.x} ${point.y}`;
                        }
                        
                        const prev = pathPoints[i - 1];
                        const next = pathPoints[(i + 1) % numPoints];
                        const nextNext = pathPoints[(i + 2) % numPoints];
                        
                        // 더 부드러운 곡선을 위한 제어점 계산 (Catmull-Rom 스플라인 기반)
                        const t = 0.5; // 곡선 강도
                        
                        // 이전 포인트에서 현재 포인트로의 방향
                        const dx1 = point.x - prev.x;
                        const dy1 = point.y - prev.y;
                        
                        // 현재 포인트에서 다음 포인트로의 방향
                        const dx2 = next.x - point.x;
                        const dy2 = next.y - point.y;
                        
                        // 제어점: 현재 포인트에서 약간 떨어진 위치 (부드러운 곡선)
                        const cp1x = prev.x + dx1 * t;
                        const cp1y = prev.y + dy1 * t;
                        const cp2x = point.x - dx2 * t;
                        const cp2y = point.y - dy2 * t;
                        
                        return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
                      }).join(' ') + ' Z';
                      
                      const isHovered = hoveredBlobId === blob.id || 
                        (hoveredMemoryId && blob.memoryIds.includes(hoveredMemoryId));
                      
                      // 애니메이션 상태
                      const animState = blobAnimationStates[blob.id] || 'idle';
                      const isEntering = animState === 'entering';
                      
                      // 가시성 튜닝: 맥북에서도 확실히 보이도록
                      // 색감 미세 조정: "잘 보이되, 한 발짝 물러난 필드" 느낌
                      const baseOpacity = 0.22; // 0.24 → 0.22 (약 8% 감소, 더 살짝 연하게)
                      const hoverOpacity = 0.30; // 0.32 → 0.30 (hover도 비례하여 조정)
                      const currentOpacity = isHovered ? hoverOpacity : baseOpacity;
                      
                      // 애니메이션: entering 시 scale과 opacity 애니메이션
                      const animOpacity = isEntering ? 0 : currentOpacity;
                      const animScale = isEntering ? 0.98 : 1.0;
                      // blur: 기본 4px (흐릿하지만 존재감 확보), hover 2px, entering 6px
                      const animBlur = isEntering ? 6 : (isHovered ? 2 : 4);
                      
                      return (
                        <g key={blob.id}>
                          <path
                            d={path}
                            fill={blob.color}
                            stroke={blob.color}
                            strokeWidth={isHovered ? 1.5 : 0.8}
                            strokeOpacity={isHovered ? 0.3 : 0.12}
                            opacity={animOpacity}
                            style={{
                              filter: `blur(${animBlur}px) drop-shadow(0 8px 20px rgba(0,0,0,0.08))`,
                              mixBlendMode: 'normal', // multiply 대신 normal로 변경 (더 확실히 보이게)
                              transform: `scale(${animScale})`,
                              transformOrigin: `${cx}px ${cy}px`,
                              transition: isEntering 
                                ? 'opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.4s ease-out, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), strokeOpacity 0.4s ease-out'
                                : 'opacity 0.25s ease-out, filter 0.25s ease-out, strokeOpacity 0.25s ease-out, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              cursor: 'pointer',
                              pointerEvents: 'auto',
                            }}
                            onMouseEnter={() => setHoveredBlobId(blob.id)}
                            onMouseLeave={() => setHoveredBlobId(null)}
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {connectionPairsArray.length > 0 && (
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    width={boardSize.width}
                    height={boardSize.height}
                    style={{ zIndex: 1 }}
                  >
                    <defs>
                      {/* 각 색상별 화살표 마커 생성 (색상별로 하나만) */}
                      {Array.from(new Set(connectionPairsArray.map(pair => pair.color))).map((color) => {
                        const markerId = `arrowhead-${color.replace('#', '')}`;
                        return (
                          <marker
                            key={markerId}
                            id={markerId}
                            markerWidth="10"
                            markerHeight="10"
                            refX="8"
                            refY="3"
                            orient="auto"
                            markerUnits="strokeWidth"
                          >
                            <path d="M0,0 L0,6 L9,3 z" fill={color} />
                          </marker>
                        );
                      })}
                    </defs>
                    {connectionPairsArray.map(pair => {
                      const from = positions[pair.from];
                      const to = positions[pair.to];
                      if (!from || !to) {
                        console.log('⚠️ 연결선 위치 없음:', pair, { from, to });
                        return null;
                      }
                      
                      // 면이 생긴 그룹 내부의 선인지 확인 (면이 주인공, 선은 힌트)
                      const isInBlobGroup = blobAreas.some(blob => 
                        blob.memoryIds.includes(pair.from) && blob.memoryIds.includes(pair.to)
                      );
                      
                      // 같은 두 카드 사이의 여러 연결선을 병렬로 표시하기 위한 오프셋 계산
                      const offsetIndex = (pair as any).offsetIndex || 0;
                      const totalConnections = (pair as any).totalConnections || 1;
                      // 여러 연결이 있으면 병렬로 표시 (간격 12px)
                      const lineOffset = totalConnections > 1 ? (offsetIndex - (totalConnections - 1) / 2) * 12 : 0;
                      
                      const fromX = from.x + CARD_DIMENSIONS[cardSize].centerX;
                      const fromY = from.y + CARD_DIMENSIONS[cardSize].centerY;
                      const toX = to.x + CARD_DIMENSIONS[cardSize].centerX;
                      const toY = to.y + CARD_DIMENSIONS[cardSize].centerY;
                      
                      // 오프셋 적용 (수직 방향으로 약간 이동)
                      const dx = toX - fromX;
                      const dy = toY - fromY;
                      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                      const perpX = -dy / len;
                      const perpY = dx / len;
                      
                      const adjustedFromX = fromX + perpX * lineOffset;
                      const adjustedFromY = fromY + perpY * lineOffset;
                      const adjustedToX = toX + perpX * lineOffset;
                      const adjustedToY = toY + perpY * lineOffset;
                      
                      const midX = (adjustedFromX + adjustedToX) / 2;
                      const midY = (adjustedFromY + adjustedToY) / 2;
                      const offset = 40;
                      const cx = midX - (dy / len) * offset;
                      const cy = midY + (dx / len) * offset;
                      
                      const linkKey = getLinkKey(pair.from, pair.to);
                      const note = linkNotes[linkKey];
                      // pair에 이미 isAIGenerated 정보가 있으면 사용, 없으면 linkInfo에서 가져오기
                      const isAIGenerated = (pair as any).isAIGenerated !== undefined 
                        ? (pair as any).isAIGenerated 
                        : (linkInfo[linkKey]?.isAIGenerated || false);
                      const markerId = `arrowhead-${pair.color.replace('#', '')}`;
                      
                      // 면이 생긴 그룹의 선은 더 약하게 (면이 주인공, 선은 힌트)
                      // hover 시에만 선을 다시 진하게 보이게
                      const isLineHovered = hoveredBlobId && blobAreas.some(blob => 
                        blob.id === hoveredBlobId && blob.memoryIds.includes(pair.from) && blob.memoryIds.includes(pair.to)
                      );
                      const lineOpacity = isInBlobGroup 
                        ? (isLineHovered ? 0.5 : 0.2) // 기본 0.2, hover 시 0.5
                        : 0.9;
                      const lineWidth = isInBlobGroup ? 2 : 3;
                      
                      return (
                        <g key={`${pair.from}-${pair.to}-${offsetIndex}`}>
                          <path
                            d={`M ${adjustedFromX} ${adjustedFromY} Q ${cx} ${cy} ${adjustedToX} ${adjustedToY}`}
                            stroke={pair.color}
                            strokeWidth={lineWidth}
                            strokeDasharray={isAIGenerated ? '5,5' : 'none'}  // AI 연결은 점선
                            fill="none"
                            markerEnd={isInBlobGroup ? undefined : `url(#${markerId})`}
                            opacity={lineOpacity}
                            style={{
                              transition: 'opacity 0.3s ease-out, stroke-width 0.3s ease-out',
                            }}
                          />
                          {note && (
                            <text
                              x={cx}
                              y={cy - 6}
                              textAnchor="middle"
                              fill="#475569"
                              fontSize="11"
                              fontWeight="500"
                              style={{ userSelect: 'none' }}
                            >
                              {note.length > 18 ? `${note.slice(0, 18)}...` : note}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* 드래그 선택 박스 */}
                {selectionBox && (
                  <div
                    className="absolute border-2 border-indigo-500 bg-indigo-200/20 pointer-events-none z-40"
                    style={{
                      left: `${Math.min(selectionBox.startX, selectionBox.endX)}px`,
                      top: `${Math.min(selectionBox.startY, selectionBox.endY)}px`,
                      width: `${Math.abs(selectionBox.endX - selectionBox.startX)}px`,
                      height: `${Math.abs(selectionBox.endY - selectionBox.startY)}px`,
                    }}
                  />
                )}

                {/* 다중 선택 안내 */}
                {selectedMemoryIds.size > 0 && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-2 border-2 border-indigo-600 flex items-center gap-2 z-30">
                    <span className="text-sm font-medium">
                      {selectedMemoryIds.size}개 카드 선택됨 (드래그 또는 Ctrl/Cmd + 클릭으로 선택)
                    </span>
                    <button
                      onClick={() => setSelectedMemoryIds(new Set())}
                      className="text-white hover:text-gray-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* @ 태그 관련 기록 토스트들 (여러 개 중첩 가능) */}
                {mentionToasts.length > 0 && (
                  <>
                    {/* 바깥 클릭 시 모든 토스트 닫기용 오버레이 */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMentionToasts([])}
                    />
                    {mentionToasts.map((toast) => {
                      const toastMemory = localMemories.find(m => m.id === toast.memoryId);
                      if (!toastMemory) return null;
                      
                      const safeHtml = sanitizeHtml(toastMemory.content);
                      const timeAgo = formatDistanceToNow(toastMemory.createdAt, { 
                        addSuffix: true,
                        locale: ko 
                      });
                      
                      return (
                        <div
                          key={toast.id}
                          className="absolute bg-white rounded-lg shadow-2xl border-2 border-blue-400 z-50 p-3 min-w-[280px] max-w-[320px] max-h-[500px] overflow-y-auto cursor-pointer"
                          style={{
                            left: `${toast.x}px`,
                            top: `${toast.y}px`,
                          }}
                          onClick={(e) => {
                            // 버튼이나 링크 클릭이 아닐 때만 기록으로 이동
                            const target = e.target as HTMLElement;
                            if (!target.closest('button') && !target.closest('a')) {
                              const element = document.getElementById(`memory-${toast.memoryId}`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }
                            e.stopPropagation();
                          }}
                        >
                          {/* 헤더 */}
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                            <h4 className="text-xs font-semibold text-gray-800">관련 기록</h4>
                            <button
                              onClick={() => setMentionToasts(prev => prev.filter(t => t.id !== toast.id))}
                              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                              title="닫기"
                            >
                              ×
                            </button>
                          </div>

                        {/* 제목 */}
                        {toastMemory.title && (
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">
                            {toastMemory.title}
                          </h3>
                        )}

                        {/* 내용 */}
                        <div
                          className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap mb-2"
                          dangerouslySetInnerHTML={{ __html: safeHtml }}
                        />

                        {/* 첨부 파일 */}
                        {toastMemory.attachments && toastMemory.attachments.length > 0 && (
                          <div className="mb-2 space-y-1">
                            {toastMemory.attachments.map((attachment) => {
                              const isImage = attachment.mimetype.startsWith('image/');
                              
                              if (isImage) {
                                return (
                                  <div key={attachment.id}>
                                    <img
                                      src={attachment.filepath}
                                      alt={attachment.filename}
                                      className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => window.open(attachment.filepath, '_blank')}
                                      style={{ maxHeight: '150px' }}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-0.5">{attachment.filename}</p>
                                  </div>
                                );
                              } else {
                                return (
                                  <a
                                    key={attachment.id}
                                    href={attachment.filepath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                  >
                                    <span className="text-sm">
                                      {attachment.mimetype.includes('pdf') ? '📄' : '📎'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] text-gray-700 truncate">{attachment.filename}</p>
                                      <p className="text-[9px] text-gray-500">
                                        {(attachment.size / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                    <span className="text-indigo-500 text-[10px]">열기</span>
                                  </a>
                                );
                              }
                            })}
                          </div>
                        )}

                        {/* 연결된 기록 */}
                        {toastMemory.relatedMemoryIds && toastMemory.relatedMemoryIds.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="flex items-start gap-1">
                              <svg className="w-2.5 h-2.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <div className="flex-1">
                                <div className="text-[10px] text-gray-500 mb-1">연결된 기록</div>
                                <div className="flex flex-wrap gap-1">
                                  {toastMemory.relatedMemoryIds.slice(0, 3).map(relatedId => {
                                    const relatedMemory = localMemories.find(m => m.id === relatedId);
                                    if (!relatedMemory) return null;
                                    const relatedContent = stripHtmlClient(relatedMemory.content);
                                    const relatedTitle = relatedMemory.title || relatedContent.substring(0, 20);
                                    
                                    return (
                                      <button
                                        key={relatedId}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // 연결된 기록 클릭 시 새로운 토스트 추가 (기존 토스트는 유지)
                                          const toastWidth = 320;
                                          const currentToastX = toast.x;
                                          const currentToastY = toast.y;
                                          
                                          // 현재 토스트 오른쪽에 새 토스트 표시 (공간 부족하면 왼쪽)
                                          const rightSpace = boardSize.width - (currentToastX + toastWidth);
                                          const leftSpace = currentToastX;
                                          
                                          let newToastX: number;
                                          if (rightSpace >= toastWidth + 20) {
                                            newToastX = currentToastX + toastWidth + 10;
                                          } else if (leftSpace >= toastWidth + 20) {
                                            newToastX = currentToastX - toastWidth - 10;
                                          } else {
                                            newToastX = currentToastX + toastWidth + 10;
                                          }
                                          
                                          const newToastY = Math.max(0, Math.min(currentToastY, boardSize.height - 200));
                                          
                                          // 새로운 토스트를 배열에 추가
                                          const newToastId = `toast-${Date.now()}-${Math.random()}`;
                                          setMentionToasts(prev => [...prev, {
                                            id: newToastId,
                                            memoryId: relatedId,
                                            x: newToastX,
                                            y: newToastY,
                                            relatedIds: [relatedId],
                                          }]);
                                        }}
                                        className="text-[10px] px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors border border-indigo-200 hover:border-indigo-300 line-clamp-1 max-w-[150px] text-left"
                                        title={relatedTitle}
                                      >
                                        {relatedTitle}...
                                      </button>
                                    );
                                  })}
                                  {toastMemory.relatedMemoryIds.length > 3 && (
                                    <span className="text-[10px] text-gray-400 self-center">
                                      +{toastMemory.relatedMemoryIds.length - 3}개 더
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 시간 정보 (위치 제외) */}
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[10px] text-gray-500">{timeAgo}</span>
                          {toastMemory.topic && (
                            <span className="ml-2 px-1 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] border border-indigo-200">
                              {toastMemory.topic}
                            </span>
                          )}
                          {toastMemory.nature && (
                            <span className="ml-1 px-1 py-0.5 bg-orange-50 text-orange-600 text-[10px] border border-orange-200">
                              {toastMemory.nature}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </>
                )}

                {/* 메모리 카드들 (가상화 적용) */}
                {visibleMemories.map((memory, memoryIndex) => {
                  const position = positions[memory.id] || { x: 0, y: 0 };
                  const memoryColor = cardColorMap[memory.id] || cardColor;
                  const memoryColorClass = memoryColor === 'green'
                    ? 'bg-green-50 border-green-200'
                    : memoryColor === 'pink'
                    ? 'bg-pink-50 border-pink-200'
                    : 'bg-purple-50 border-purple-200';
                  const isSelected = selectedMemoryIds.has(memory.id);
                  const isDragging = draggingId === memory.id || (isSelected && draggingId && selectedMemoryIds.has(draggingId));
                  
                  // 이 카드가 속한 Blob Area 찾기
                  const containingBlob = blobAreas.find(blob => blob.memoryIds.includes(memory.id));
                  const isBlobHovered = hoveredBlobId && containingBlob?.id === hoveredBlobId;
                  const isCardHovered = hoveredMemoryId === memory.id;
                  
                  return (
                    <div
                key={memory.id}
                      data-memory-card={memory.id}
                      onMouseEnter={() => setHoveredMemoryId(memory.id)}
                      onMouseLeave={() => setHoveredMemoryId(null)}
                      onPointerDown={(event) => {
                        // 편집 모드 체크: MemoryCard 내부의 data-editing 속성 확인
                        const cardElement = (event.currentTarget as HTMLElement).querySelector(`[data-editing="true"]`);
                        if (cardElement) {
                          // 편집 모드에서는 드래그 비활성화
                          return;
                        }
                        
                        // 버튼, 링크, 편집 가능한 요소 클릭 시 드래그 비활성화
                        const target = event.target as HTMLElement;
                        const isInteractiveElement = target.closest('button') || 
                                                     target.closest('a') || 
                                                     target.closest('[contenteditable]') || 
                                                     target.closest('input') || 
                                                     target.closest('textarea') || 
                                                     target.closest('img');
                        
                        // 조작 요소가 아니면 먼저 bring-to-front 처리
                        if (!isInteractiveElement) {
                          bringToFrontMemory(memory.id);
                          // Pointer capture 설정
                          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                        }
                        
                        // 조작 요소에서는 드래그만 비활성화 (bring-to-front는 이미 처리됨)
                        if (isInteractiveElement) {
                          return;
                        }
                        
                        handlePointerDown(memory.id, event);
                      }}
                      style={{
                        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                        willChange: isDragging ? 'transform' : 'auto',
                        opacity: isDragging ? 0.85 : 1,
                        zIndex: isDragging ? 10000 : (lastClickedItem?.type === 'memory' && lastClickedItem.id === memory.id ? 5000 : (clickedCardId === memory.id ? 100 + memoryIndex : (isSelected ? 50 + memoryIndex : 10 + memoryIndex))),
                        transition: 'none',
                        pointerEvents: isDragging ? 'none' : 'auto',
                        contain: 'layout style paint',
                      }}
                      className={`absolute ${cardSizeClass} select-none touch-none cursor-grab active:cursor-grabbing ${
                        isDragging ? 'cursor-grabbing border-2 border-indigo-500' : ''
                      } ${isSelected ? 'ring-2 ring-blue-300/50 ring-offset-1' : ''} ${
                        isBlobHovered ? 'ring-2 ring-blue-200/60 ring-offset-1' : ''
                      }`}
                    >
                      <MemoryCard
                        key={memory.id} 
                        memory={memory} 
                        onDelete={onMemoryDeleted} 
                        allMemories={localMemories}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onOpenLinkManager={setLinkManagerMemory}
                        variant="board"
                        colorClass={memoryColorClass}
                        onCardColorChange={(color) => {
                          setCardColorMap(prev => ({ ...prev, [memory.id]: color }));
                        }}
                        linkNotes={linkNotes}
                        personaId={personaId}
                        onMentionClick={(mentionedMemoryId) => handleMentionClick(memory.id, mentionedMemoryId)}
                        onCardFocus={(memoryId) => setClickedCardId(memoryId)}
                        onOpenGroupModal={(memory) => {
                          setGroupModalMemory(memory);
                          setGroupStep('loading');
                          setToast({ type: null }); // 토스트 초기화
                        }}
                        onLinkDeleted={(updatedMemory1, updatedMemory2) => {
                          // 로컬 상태 즉시 업데이트 (페이지 리로드 없이)
                          setLocalMemories(prev => {
                            const updated = [...prev];
                            const index1 = updated.findIndex(m => m.id === updatedMemory1.id);
                            const index2 = updated.findIndex(m => m.id === updatedMemory2.id);
                            
                            if (index1 !== -1) {
                              updated[index1] = updatedMemory1;
                            }
                            if (index2 !== -1) {
                              updated[index2] = updatedMemory2;
                            }
                            
                            return updated;
                          });
                        }}
                        onRequestDeleteLink={(memoryId1, memoryId2) => {
                          // 연결 삭제 확인 토스트 표시
                          setToast({ 
                            type: 'delete-link', 
                            data: { memoryId1, memoryId2 } 
                          });
                        }}
                        onRequestDelete={(memoryId) => {
                          // 기록 삭제 확인 토스트 표시
                          setToast({ 
                            type: 'delete-memory', 
                            data: { memoryId } 
                          });
                        }}
                        onRequestDeleteLocation={(memoryId) => {
                          // 위치 삭제 확인 토스트 표시
                          setToast({ 
                            type: 'delete-location', 
                            data: { memoryId } 
                          });
                        }}
                        onCreateSummaryCard={handleCreateSummaryCard}
                      />
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 링크 관리 모달 */}
      {linkManagerMemory && (
        <div data-tutorial-target="link-memories">
          <LinkManager
            currentMemory={linkManagerMemory}
            allMemories={localMemories}
            onClose={() => setLinkManagerMemory(null)}
            onLinked={async (updatedMemory1, updatedMemory2) => {
            // 로컬 상태 즉시 업데이트 (페이지 리로드 없이)
            setLocalMemories(prev => {
              const updated = [...prev];
              const index1 = updated.findIndex(m => m.id === updatedMemory1.id);
              const index2 = updated.findIndex(m => m.id === updatedMemory2.id);
              
              if (index1 !== -1) {
                updated[index1] = updatedMemory1;
              }
              if (index2 !== -1) {
                updated[index2] = updatedMemory2;
              }
              
              return updated;
            });
            
            // linkManagerMemory도 업데이트
            if (linkManagerMemory.id === updatedMemory1.id) {
              setLinkManagerMemory(updatedMemory1);
            } else if (linkManagerMemory.id === updatedMemory2.id) {
              setLinkManagerMemory(updatedMemory2);
            }
          }}
        />
        </div>
      )}

      {/* AI 자동 묶기 토스트 팝업 */}
      {toast.type === 'loading' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-white border-2 border-gray-300 p-4 min-w-[300px]">
            <div className="flex items-center gap-3">
              <div className="text-2xl animate-spin">✨</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">AI가 관련 기록을 찾고 있어요</p>
                <p className="text-xs text-gray-500">잠시만 기다려주세요...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.type === 'confirm' && toast.data && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-white border-2 border-gray-300 p-5 min-w-[400px] max-w-[500px]">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl">📁</div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-800 mb-1">
                  이렇게 묶을까요?
                </h3>
                <div className="text-sm text-gray-600 mb-3">
                  <input
                    type="text"
                    value={editableGroupName}
                    onChange={(e) => setEditableGroupName(e.target.value)}
                    className="w-full px-2 py-1 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="그룹 이름"
                  />
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 mb-4 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    묶일 기록들 ({(editableRelatedMemories?.length || 0) + 1}개):
                  </p>
                  <ul className="space-y-1.5">
                    {/* 현재 기록 */}
                    <li className="text-xs text-gray-700 flex items-center gap-2 p-1.5 bg-white/60 rounded">
                      <span className="text-blue-500">📄</span>
                      <span className="flex-1 line-clamp-1">{groupModalMemory ? stripHtmlClient(groupModalMemory.content) : ''}</span>
                    </li>
                    {/* 관련 기록들 */}
                    {editableRelatedMemories.map((m, idx: number) => {
                      const relatedMemory = localMemories.find(mem => mem.id === m.id);
                      return (
                        <li key={m.id || idx} className="text-xs text-gray-700 flex items-center gap-2 p-1.5 bg-white/60 rounded group">
                          <span className="text-blue-500">📄</span>
                          <span className="flex-1 line-clamp-1">{relatedMemory ? stripHtmlClient(relatedMemory.content) : (m.content ? stripHtmlClient(m.content) : '')}</span>
                          <button
                            onClick={() => {
                              setEditableRelatedMemories(prev => prev.filter(item => item.id !== m.id));
                            }}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                            title="제거"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCancelGroup}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirmGroup}
                    className="flex-1 px-3 py-2 text-sm bg-indigo-500 text-white border-2 border-indigo-600 hover:bg-indigo-600 transition-colors"
                  >
                    확인
                  </button>
                </div>
              </div>
              <button
                onClick={handleCancelGroup}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.type === 'success' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-green-500 text-white rounded-xl shadow-2xl p-4 min-w-[300px] border border-green-600">
            <div className="flex items-center gap-3">
              <div className="text-2xl">✅</div>
              <div>
                <p className="text-sm font-semibold">{toast.data?.message || '완료되었습니다!'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.type === 'delete-link' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-white border-2 border-gray-300 p-5 min-w-[350px] max-w-[450px]">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl">🔗</div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-800 mb-1">
                  연결을 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-gray-600">
                  이 연결을 삭제하면 두 기록 간의 연결이 끊어집니다.
                </p>
              </div>
              <button
                onClick={() => setToast({ type: null })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setToast({ type: null })}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteLink}
                className="flex-1 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.type === 'delete-memory' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-white border-2 border-gray-300 p-5 min-w-[350px] max-w-[450px]">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl">🗑️</div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-800 mb-1">
                  기록을 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-gray-600">
                  이 기록을 삭제하면 복구할 수 없습니다.
                </p>
              </div>
              <button
                onClick={() => setToast({ type: null })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setToast({ type: null })}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteMemory}
                className="flex-1 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.type === 'delete-location' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-white border-2 border-gray-300 p-5 min-w-[350px] max-w-[450px]">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl">📍</div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-800 mb-1">
                  위치 정보를 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-gray-600">
                  이 위치 정보를 삭제하면 복구할 수 없습니다.
                </p>
              </div>
              <button
                onClick={() => setToast({ type: null })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setToast({ type: null })}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteLocation}
                className="flex-1 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}


      {toast.type === 'error' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-red-500 text-white rounded-xl shadow-2xl p-4 min-w-[300px] border border-red-600">
            <div className="flex items-center gap-3">
              <div className="text-2xl">❌</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{toast.data?.message || '오류가 발생했습니다'}</p>
              </div>
              <button
                onClick={() => setToast({ type: null })}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MemoryCard = memo(function MemoryCard({ 
  memory, 
  onDelete, 
  allMemories, 
  onDragStart, 
  onDragEnd, 
  onOpenLinkManager,
  variant = 'list',
  colorClass,
  onCardColorChange,
  linkNotes,
  personaId,
  onLinkDeleted,
  onOpenGroupModal,
  onRequestDeleteLink,
  onRequestDelete,
  onRequestDeleteLocation,
  onMentionClick,
  onCardFocus,
  onCreateSummaryCard,
}: { 
  memory: Memory; 
  onDelete?: () => void; 
  allMemories: Memory[];
  onDragStart?: (memoryId: string) => void;
  onDragEnd?: () => void;
  onOpenLinkManager?: (memory: Memory) => void;
  variant?: 'board' | 'list';
  colorClass?: string;
  onCardColorChange?: (color: 'green' | 'pink' | 'purple') => void;
  linkNotes?: Record<string, string>;
  personaId?: string | null;
  onLinkDeleted?: (updatedMemory1: Memory, updatedMemory2: Memory) => void;
  onOpenGroupModal?: (memory: Memory) => void;
  onRequestDeleteLink?: (memoryId1: string, memoryId2: string) => void;
  onRequestDelete?: (memoryId: string) => void;
  onRequestDeleteLocation?: (memoryId: string) => void;
  onMentionClick?: (mentionedMemoryId: string) => void;
  onCardFocus?: (memoryId: string) => void;
  onCreateSummaryCard?: (sourceMemory: Memory, summaryText: string) => Promise<void>;
}) {
  const { viewerExists, openInViewer } = useViewer();
  // 로컬 memory 상태 관리 (수정 후 즉시 반영)
  const [localMemory, setLocalMemory] = useState<Memory>(memory);
  
  // memory prop이 변경되면 로컬 상태도 업데이트
  useEffect(() => {
    // relatedMemoryIds가 변경되었는지 확인
    const currentIds = (localMemory.relatedMemoryIds || []).sort().join(',');
    const newIds = (memory.relatedMemoryIds || []).sort().join(',');
    
    if (memory.id !== localMemory.id || currentIds !== newIds) {
      setLocalMemory(memory);
    }
  }, [memory, localMemory.id, localMemory.relatedMemoryIds]);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isCreatingSummaryCard, setIsCreatingSummaryCard] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(localMemory.title || '');
  const [editContent, setEditContent] = useState(localMemory.content);
  const editRef = useRef<HTMLDivElement>(null);
  const prevIsEditingRef = useRef(false);
  const timeAgo = formatDistanceToNow(localMemory.createdAt, { 
    addSuffix: true,
    locale: ko 
  });

  // 편집 모드로 전환할 때 초기 내용 설정
  useEffect(() => {
    if (isEditing && !prevIsEditingRef.current && editRef.current) {
      // 편집 모드로 전환하는 순간에만 초기 내용 설정
      editRef.current.innerHTML = editContent;
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, editContent]);

  const handleToggleSummary = async () => {
    if (!showSummary && !summary) {
      // 요약이 없으면 API 호출
      setIsLoadingSummary(true);
      try {
        console.log('📝 요약 요청 - personaId:', personaId);
        const url = personaId 
          ? `/api/memories/${localMemory.id}/summarize?personaId=${personaId}`
          : `/api/memories/${localMemory.id}/summarize`;
        console.log('📝 요약 API URL:', url);
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSummary(data.summary);
          setShowSummary(true);
        } else {
          alert('요약 생성 실패');
        }
      } catch (error) {
        console.error('Failed to fetch summary:', error);
        alert('요약을 가져올 수 없습니다');
      } finally {
        setIsLoadingSummary(false);
      }
    } else {
      // 이미 있으면 토글만
      setShowSummary(!showSummary);
    }
  };

  const handleToggleSuggestions = async () => {
    if (!showSuggestions && !suggestions) {
      // 제안이 없으면 API 호출
      setIsLoadingSuggestions(true);
      try {
        console.log('💡 제안 요청 - personaId:', personaId);
        const url = personaId 
          ? `/api/memories/${localMemory.id}/suggestions?personaId=${personaId}`
          : `/api/memories/${localMemory.id}/suggestions`;
        console.log('💡 제안 API URL:', url);
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } else {
          alert('제안 생성 실패');
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        alert('제안을 가져올 수 없습니다');
      } finally {
        setIsLoadingSuggestions(false);
      }
    } else {
      // 이미 있으면 토글만
      setShowSuggestions(!showSuggestions);
    }
  };

  const handleDelete = () => {
    if (onRequestDelete) {
      onRequestDelete(localMemory.id);
    }
  };

  const handleEdit = async () => {
    if (isEditing) {
      // 저장
      try {
        const updatedHtml = editRef.current?.innerHTML || editContent;
        const titleToSave = editTitle.trim() || null;
        
        const res = await fetch(`/api/memories?id=${localMemory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: titleToSave, content: updatedHtml }),
        });
        
        if (res.ok) {
          // 로컬 상태 즉시 업데이트 (새로고침 없이)
          setLocalMemory(prev => ({
            ...prev,
            title: titleToSave || undefined,
            content: updatedHtml,
          }));
          setIsEditing(false);
          // 편집 모드 종료 시 상태 초기화
          setEditTitle(titleToSave || '');
          setEditContent(updatedHtml);
        } else {
          const errorData = await res.json();
          console.error('Edit error response:', errorData);
          alert(`수정에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
        }
      } catch (error) {
        console.error('Edit error:', error);
        alert('수정에 실패했습니다');
      }
    } else {
      // 편집 모드로 전환
      setEditTitle(localMemory.title || '');
      setEditContent(localMemory.content);
      setIsEditing(true);
    }
  };

  const execEditCommand = (command: string, value?: string) => {
    if (!editRef.current) return;
    editRef.current.focus();
    document.execCommand(command, false, value);
    setEditContent(editRef.current.innerHTML);
  };

  const handleAutoGroup = () => {
    if (onOpenGroupModal) {
      onOpenGroupModal(localMemory);
    }
  };

  const handleConvertToGoal = async (suggestions: any) => {
    if (!confirm('이 AI 제안을 목표로 전환하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/memories/${localMemory.id}/convert-to-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ 목표가 생성되었습니다!\n"${data.goal.title}"`);
        // 인사이트 패널 새로고침을 위해
        window.dispatchEvent(new CustomEvent('goal-updated'));
      } else {
        alert('목표 생성 실패');
      }
    } catch (error) {
      console.error('Convert to goal error:', error);
      alert('목표 생성 중 오류 발생');
    }
  };

  // @ 태그 클릭 핸들러용 ref
  const contentRef = useRef<HTMLDivElement>(null);

  // 텍스트가 200자 이상이면 접기 기능 활성화
  const MAX_LENGTH = 200;
  const plainContent = stripHtmlClient(localMemory.content);
  const isLong = plainContent.length > MAX_LENGTH;
  const safeHtml = sanitizeHtml(localMemory.content);

  // @ 태그 클릭 핸들러를 useEffect로 추가
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const mentionLink = target.closest('a[data-memory-id]');
      if (mentionLink) {
        e.preventDefault();
        e.stopPropagation();
        const memoryId = mentionLink.getAttribute('data-memory-id');
        if (memoryId && onMentionClick) {
          onMentionClick(memoryId);
        }
      }
    };

    contentElement.addEventListener('click', handleClick);
    return () => {
      contentElement.removeEventListener('click', handleClick);
    };
  }, [onMentionClick, safeHtml]);

  const cardClassName = variant === 'board'
    ? `${colorClass || 'bg-green-50 border-2 border-green-300'} border-2`
    : 'bg-white border-2 border-gray-200 hover:border-gray-400';

  return (
    <div 
      id={`memory-${localMemory.id}`}
      data-editing={isEditing ? 'true' : 'false'}
      draggable={!isEditing}
      onDragStart={(e) => {
        if (isEditing) {
          e.preventDefault();
          return;
        }
        onDragStart?.(localMemory.id);
      }}
      onDragEnd={() => {
        if (isEditing) return;
        onDragEnd?.();
      }}
      className={`group relative p-2 border rounded-lg transition-all scroll-mt-4 h-full flex flex-col ${
        isEditing ? 'cursor-default' : 'cursor-move'
      } ${cardClassName}`}
      onPointerDown={(e) => {
        if (isEditing) {
          // 편집 모드에서는 드래그 시작 방지
          e.stopPropagation();
        }
      }}
    >
      {/* 드래그 아이콘 */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      
      {/* 상단 우측 버튼들 */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* AI 자동 묶기 버튼 */}
        <button
          onClick={handleAutoGroup}
          className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors"
          title="AI로 자동 묶기"
        >
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </button>
        
        {/* 수정 버튼 */}
        <button
          onClick={handleEdit}
          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
          title={isEditing ? '저장' : '수정'}
        >
          {isEditing ? (
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </button>
        
        {/* 삭제 버튼 */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
          title="삭제"
        >
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* 내용 (편집 모드) */}
      {isEditing ? (
        <div className="mb-2">
          {/* 제목 편집 */}
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            placeholder="제목 (선택)"
            className="w-full px-2 py-1 mb-1.5 text-xs font-semibold border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-1 px-2 py-1 border border-blue-200 rounded-t-lg bg-blue-50/60">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execEditCommand('bold')}
              className="px-2 py-1 text-xs rounded hover:bg-white font-semibold"
              title="굵게"
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execEditCommand('italic')}
              className="px-2 py-1 text-xs rounded hover:bg-white italic"
              title="기울임"
            >
              I
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execEditCommand('underline')}
              className="px-2 py-1 text-xs rounded hover:bg-white underline"
              title="밑줄"
            >
              U
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const url = prompt('링크 URL을 입력해주세요');
                if (url) execEditCommand('createLink', url);
              }}
              className="px-2 py-1 text-xs rounded hover:bg-white"
              title="하이퍼링크"
            >
              🔗
            </button>
          </div>
          <div
            ref={editRef}
            contentEditable
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            className="w-full p-2 border border-blue-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] whitespace-pre-wrap"
            onInput={() => setEditContent(editRef.current?.innerHTML || '')}
            suppressContentEditableWarning
          />
        </div>
      ) : (
        <div className="mb-2 pr-8">
          {/* 제목 */}
          {localMemory.title && (
            <h3 className="text-xs font-semibold text-gray-900 mb-1">
              {stripHtmlClient(localMemory.title)}
            </h3>
          )}
          {/* 내용 */}
          <div
            ref={contentRef}
            className={`text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
          {isLong && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="mt-1 text-blue-500 hover:text-blue-600 text-[11px] font-medium"
            >
              더보기
            </button>
          )}
          {isLong && isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="mt-1 text-gray-500 hover:text-gray-600 text-[11px] font-medium"
            >
              접기
            </button>
          )}
        </div>
      )}

      {/* AI 버튼들 */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <button
          onClick={handleToggleSummary}
          disabled={isLoadingSummary}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {isLoadingSummary ? '생성중' : showSummary ? '요약 끄기' : '요약하기'}
        </button>
        
        <button
          onClick={handleToggleSuggestions}
          disabled={isLoadingSuggestions}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {isLoadingSuggestions ? '생성중' : showSuggestions ? '제안 끄기' : '제안받기'}
        </button>
        {variant === 'board' && (
          <>
            <span className="ml-auto" />
            <div className="flex items-center gap-1" data-tutorial-target="ai-features">
              {([
                { id: 'green', class: 'bg-green-200' },
                { id: 'pink', class: 'bg-pink-200' },
                { id: 'purple', class: 'bg-purple-200' },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onCardColorChange?.(item.id)}
                  className={`w-4 h-4 rounded-full border ${item.class} border-white shadow`}
                  title={`${item.id === 'green' ? '연두' : item.id === 'pink' ? '핑크' : '보라'} 카드`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* AI 요약 표시 */}
      {showSummary && summary && (
        <div className="mb-1.5 p-1.5 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded">
          <div className="flex items-start gap-1">
            <svg className="w-2.5 h-2.5 text-purple-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="flex-1">
              <div className="text-[10px] font-semibold text-purple-700 mb-0.5">AI 요약</div>
              <p className="text-[10px] text-gray-700 leading-relaxed">{summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI 제안 표시 */}
      {showSuggestions && suggestions && (
        <div className="mb-1.5 p-2 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg space-y-2">
          {/* 다음 단계 */}
          {suggestions.nextSteps && suggestions.nextSteps.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <h4 className="text-[10px] font-bold text-blue-700">다음 단계</h4>
              </div>
              <ul className="space-y-0.5 ml-2">
                {suggestions.nextSteps.map((step: string, idx: number) => (
                  <li key={idx} className="text-[10px] text-gray-700 flex items-start gap-1">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 관련 자료 */}
          {suggestions.resources && suggestions.resources.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h4 className="text-[10px] font-bold text-green-700">관련 자료</h4>
              </div>
              <ul className="space-y-0.5 ml-2">
                {suggestions.resources.map((resource: any, idx: number) => (
                  <li key={idx} className="text-[10px] text-gray-700 cursor-default">
                    {resource.url ? (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-green-700 hover:underline cursor-pointer"
                      >
                        {resource.name}
                      </a>
                    ) : (
                      <span className="font-medium text-green-700">{resource.name}</span>
                    )}
                    {resource.type && <span className="text-gray-500 ml-1">({resource.type})</span>}
                    {resource.description && <p className="text-gray-600 ml-2">{resource.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 실행 계획 */}
          {suggestions.actionPlan && suggestions.actionPlan.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <svg className="w-2.5 h-2.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h4 className="text-[10px] font-bold text-orange-700">실행 계획</h4>
                </div>
                <button
                  onClick={() => handleConvertToGoal(suggestions)}
                  className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-full transition-all shadow-sm"
                >
                  🎯 목표로 전환
                </button>
              </div>
              <ul className="space-y-0.5 ml-2">
                {suggestions.actionPlan.map((plan: any, idx: number) => (
                  <li key={idx} className="text-[10px] text-gray-700 flex items-start gap-1">
                    <span className="font-bold text-orange-600">{plan.step}.</span>
                    <div>
                      <span>{plan.action}</span>
                      {plan.timeframe && <span className="text-gray-500 ml-1">({plan.timeframe})</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 첨부 파일 표시 */}
      {localMemory.attachments && localMemory.attachments.length > 0 && (
        <div className="mb-1.5 space-y-1.5">
          {localMemory.attachments.map((attachment) => {
            const isImage = attachment.mimetype.startsWith('image/');
            const isPdf = attachment.mimetype === 'application/pdf';
            const isDocx = attachment.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                          attachment.mimetype === 'application/msword' ||
                          attachment.filename.toLowerCase().endsWith('.docx') ||
                          attachment.filename.toLowerCase().endsWith('.doc');
            const isSupported = isImage || isPdf || isDocx;
            
            const handleAttachmentClick = (e: React.MouseEvent) => {
              if (viewerExists && isSupported) {
                e.preventDefault();
                e.stopPropagation();
                openInViewer({
                  kind: 'file',
                  url: attachment.filepath,
                  fileName: attachment.filename,
                  mimeType: attachment.mimetype,
                });
              }
              // Viewer가 없거나 지원 안 되는 파일은 기본 동작 유지
            };
            
            if (isImage) {
              return (
                <div key={attachment.id} className="mt-1 relative group">
                  <img
                    src={attachment.filepath}
                    alt={attachment.filename}
                    className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={handleAttachmentClick}
                    style={{ maxHeight: '200px' }}
                  />
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-gray-500">{attachment.filename}</p>
                    {viewerExists && (
                      <a
                        href={attachment.filepath}
                        download={attachment.filename}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                        title="다운로드"
                      >
                        ⬇️
                      </a>
                    )}
                  </div>
                </div>
              );
            } else {
              return (
                <div key={attachment.id} className="flex items-center gap-1.5">
                  <a
                    href={attachment.filepath}
                    target={viewerExists && isSupported ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    onClick={handleAttachmentClick}
                    className={`flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex-1 ${
                      viewerExists && isSupported ? 'cursor-pointer' : ''
                    }`}
                  >
                    <span className="text-sm">
                      {attachment.mimetype.includes('pdf') ? '📄' : 
                       (isDocx ? '📝' : '📎')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-700 truncate">{attachment.filename}</p>
                      <p className="text-[9px] text-gray-500">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    {!viewerExists || !isSupported ? (
                                    <span className="text-indigo-500 text-[10px]">열기</span>
                    ) : (
                      <span className="text-blue-500 text-[10px]">Viewer에서 보기</span>
                    )}
                  </a>
                  {viewerExists && (
                    <a
                      href={attachment.filepath}
                      download={attachment.filename}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                      title="다운로드"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  )}
                </div>
              );
            }
          })}
        </div>
      )}
      
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 flex-wrap">
        <span>{timeAgo}</span>
        
        {localMemory.topic && (
          <span className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">
            {localMemory.topic}
          </span>
        )}
        
        {localMemory.nature && (
          <span className="px-1 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px]">
            {localMemory.nature}
          </span>
        )}
        
        {localMemory.repeatCount !== undefined && localMemory.repeatCount > 1 && (
          <span className="px-1 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px]">
            🔁 {localMemory.repeatCount}
          </span>
        )}
        
        {localMemory.location && (
          <div className="relative inline-block group">
            <a
              href={`https://www.google.com/maps?q=${localMemory.location.latitude},${localMemory.location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-1 py-0.5 bg-green-50 text-green-600 rounded text-[10px] hover:bg-green-100 transition-colors flex items-center gap-0.5"
              title={localMemory.location.address || `${localMemory.location.latitude}, ${localMemory.location.longitude}`}
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {localMemory.location.address || '위치'}
            </a>
            {/* 위치 삭제 버튼 */}
            {isEditing && (
              <button
                onClick={() => {
                  if (onRequestDeleteLocation) {
                    onRequestDeleteLocation(localMemory.id);
                  }
                }}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600 transition-all"
                title="위치 삭제"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* 관련 기록 링크 */}
      <div className="mt-1.5 pt-1.5 border-t border-gray-100">
        <div className="flex items-start gap-1">
          <svg className="w-2.5 h-2.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <div className="flex-1">
            <div className="text-[10px] text-gray-500 mb-0.5 flex items-center justify-between">
              <span>연결된 기록</span>
              <button
                onClick={() => onOpenLinkManager?.(localMemory)}
                className="text-[10px] text-blue-500 hover:text-blue-600"
              >
                + 추가
              </button>
            </div>
            {localMemory.relatedMemoryIds && localMemory.relatedMemoryIds.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {localMemory.relatedMemoryIds.slice(0, 3).map(relatedId => {
                  const relatedMemory = allMemories.find(m => m.id === relatedId);
                  if (!relatedMemory) return null;
                  const noteKey = relatedMemory.id < localMemory.id
                    ? `${relatedMemory.id}:${localMemory.id}`
                    : `${localMemory.id}:${relatedMemory.id}`;
                  const note = linkNotes?.[noteKey];
                  
                  return (
                    <div key={relatedId} className="relative group">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // 연결된 기록 클릭 시 토스트 표시
                          if (onMentionClick) {
                            onMentionClick(relatedId);
                          }
                        }}
                        className="text-[10px] px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200 hover:border-blue-300 line-clamp-1 max-w-[150px] text-left"
                        title={relatedMemory.title || stripHtmlClient(relatedMemory.content)}
                      >
                        {relatedMemory.title || stripHtmlClient(relatedMemory.content).substring(0, 20)}...
                      </button>
                      {note && (
                        <div className="mt-0.5 text-[9px] text-gray-500 line-clamp-1">
                          메모: {note}
                        </div>
                      )}
                      {/* 링크 삭제 버튼 */}
                      {isEditing && (
                        <button
                          onClick={() => {
                            if (onRequestDeleteLink) {
                              onRequestDeleteLink(localMemory.id, relatedId);
                            }
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600 transition-all"
                          title="연결 끊기"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
                {localMemory.relatedMemoryIds.length > 3 && (
                  <span className="text-[10px] text-gray-400 self-center">
                    +{localMemory.relatedMemoryIds.length - 3}개 더
                  </span>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400">아직 연결된 기록이 없습니다</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 커스텀 비교 함수: memory와 주요 props만 비교
  return (
    prevProps.memory.id === nextProps.memory.id &&
    prevProps.memory.content === nextProps.memory.content &&
    prevProps.memory.title === nextProps.memory.title &&
    prevProps.memory.relatedMemoryIds?.length === nextProps.memory.relatedMemoryIds?.length &&
    prevProps.colorClass === nextProps.colorClass &&
    prevProps.variant === nextProps.variant &&
    prevProps.personaId === nextProps.personaId &&
    JSON.stringify(prevProps.linkNotes) === JSON.stringify(nextProps.linkNotes)
  );
});
