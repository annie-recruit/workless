'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue, forwardRef, useImperativeHandle } from 'react';
import type { PointerEvent as ReactPointerEvent, FocusEvent as ReactFocusEvent } from 'react';
import { Memory, Group, CanvasBlock, CalendarBlockConfig, ViewerBlockConfig, MeetingRecorderBlockConfig, DatabaseBlockConfig, ActionProject } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import LinkManager from './LinkManager';
import dynamic from 'next/dynamic';
import { useViewer } from './ViewerContext';
import PixelIcon from './PixelIcon';
import { useFlagsStore } from '@/components/FlagContext';
import FlagSidebar from '@/components/FlagSidebar';
import FlagLayer from '@/components/FlagLayer';
import ProcessingLoader from './ProcessingLoader';
import MemoryCard from './MemoryCard';
import ShineHighlight from '@/src/components/highlight/ShineHighlight';
import GroupToasts from './groups/GroupToasts';
import { BOARD_PADDING, CARD_DIMENSIONS, sanitizeHtml, stripHtmlClient } from '@/board/boardUtils';
import { ActionProjectCard } from './ActionProjectCard';
import { useBoardSelection } from '@/hooks/useBoardSelection';
import { useConnectionLayer } from '@/hooks/useConnectionLayer';
import { useDragEngine, type DraggableEntity } from '@/hooks/useDragEngine';
import { useBoardCamera } from '@/hooks/board/useBoardCamera';
import { useBoardPersistence } from '@/hooks/board/useBoardPersistence';
import { useGroupsPanel, type BoardToastState } from '@/hooks/groups/useGroupsPanel';
import { useBoardFlags } from '@/hooks/flags/useBoardFlags';
import { useBoardBlocks } from '@/hooks/blocks/useBoardBlocks';
import WidgetMenuBar from './WidgetMenuBar';
import WidgetCreateButton from './WidgetCreateButton';
import { GmailImportButton } from './GmailImportButton';
import OnboardingWhiteboard from './OnboardingWhiteboard';

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


const resolveTimestamp = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return Date.now();
};


// 인라인 BlobLayer 컴포넌트 (요청사항 반영: inside fill, pixelated edge)
function BlobLayer({
  blobAreas,
  hoveredBlobId,
  hoveredMemoryId,
  isPaused = false,
  isEnabled = true,
  isHighlightMode = false,
}: {
  blobAreas?: Array<{
    id: string;
    color: string;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
    center: { x: number; y: number };
    radius: { x: number; y: number };
  }>;
  hoveredBlobId: string | null;
  hoveredMemoryId: string | null;
  isPaused?: boolean;
  isEnabled?: boolean;
  isHighlightMode?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isEnabled || !blobAreas || blobAreas.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    // 부모 컨테이너(보드) 크기에 맞춤
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    if (isPaused) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 픽셀 크기
    const PIXEL_SIZE = 4;

    const render = () => {
      // 선택적 애니메이션: 호버 중(블롭 또는 메모리 카드)이거나 하이라이트 모드일 때만 움직임
      const shouldAnimate = hoveredBlobId !== null || hoveredMemoryId !== null || isHighlightMode;
      const time = shouldAnimate ? (Date.now() - startTimeRef.current) / 1000 : 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      blobAreas.forEach((blob) => {
        // 색상 파서는 한 번만 실행되도록 최적화 가능하지만, 일단 로직 유지
        let r = 0, g = 0, b = 0;
        if (blob.color.startsWith('#')) {
          const hex = blob.color.substring(1);
          if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
          }
        }

        const isHovered = hoveredBlobId === blob.id;
        const centerAlphaMin = isHovered ? 0.12 : 0.08;
        const edgeAlphaMax = isHovered ? 0.85 : 0.75;
        const gamma = 1.4;

        const waveAmp = 4;
        const avgRadius = (blob.radius.x + blob.radius.y) / 2;

        const padding = PIXEL_SIZE * 6;
        const startXOriginal = blob.bounds.minX - padding;
        const startYOriginal = blob.bounds.minY - padding;
        const endXOriginal = blob.bounds.maxX + padding;
        const endYOriginal = blob.bounds.maxY + padding;

        // 실제 캔버스 경계 내로 제한
        const startX = Math.max(0, Math.floor(startXOriginal / PIXEL_SIZE) * PIXEL_SIZE);
        const startY = Math.max(0, Math.floor(startYOriginal / PIXEL_SIZE) * PIXEL_SIZE);
        const endX = Math.min(canvas.width, Math.ceil(endXOriginal / PIXEL_SIZE) * PIXEL_SIZE);
        const endY = Math.min(canvas.height, Math.ceil(endYOriginal / PIXEL_SIZE) * PIXEL_SIZE);

        const width = endX - startX;
        const height = endY - startY;

        if (width <= 0 || height <= 0) return; // Use 'return' to skip this blob, not the whole render.

        for (let py = 0; py < height; py += PIXEL_SIZE) {
          const y = startY + py;
          for (let px = 0; px < width; px += PIXEL_SIZE) {
            const x = startX + px;

            const dx = x - blob.center.x;
            const dy = y - blob.center.y;

            const angle = Math.atan2(dy, dx);
            const noise = Math.sin(angle * 3 + time * 0.5) * 0.5 +
              Math.sin(angle * 7 - time * 0.3) * 0.3 +
              Math.sin(angle * 11 + time * 0.2) * 0.2;

            const distBase = Math.sqrt((dx * dx) / (blob.radius.x * blob.radius.x) + (dy * dy) / (blob.radius.y * blob.radius.y));
            const effectiveDist = distBase - (noise * waveAmp) / avgRadius;

            if (effectiveDist <= 1.0) {
              let keep = true;
              const falloffStart = 0.85;
              if (effectiveDist > falloffStart) {
                const outerT = (effectiveDist - falloffStart) / (1.0 - falloffStart);
                const keepProb = 1.0 - outerT * 0.65;
                const bx = Math.abs(Math.floor(x / PIXEL_SIZE)) % 2;
                const by = Math.abs(Math.floor(y / PIXEL_SIZE)) % 2;
                const bayer = ((bx + by * 2) + 0.5) / 4.0;
                const ditherNoise = (Math.random() - 0.5) * 0.2;
                if (keepProb < bayer + ditherNoise) keep = false;
              }

              if (keep) {
                const bandNoise = Math.sin(angle * 10 + time) * 0.03;
                const tClamped = Math.max(0, Math.min(1, effectiveDist + bandNoise * effectiveDist));
                let alpha = centerAlphaMin + (edgeAlphaMax - centerAlphaMin) * Math.pow(tClamped, gamma);

                // Dither
                const xIdx = Math.floor(x / PIXEL_SIZE);
                const yIdx = Math.floor(y / PIXEL_SIZE);
                alpha += (xIdx + yIdx) % 2 === 0 ? 0.02 : -0.02;
                alpha = Math.max(0, Math.min(1, alpha));

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
              }
            }
          }
        }
      });

      // shouldAnimate가 true일 때만 다음 프레임 요청
      if (shouldAnimate) {
        requestRef.current = requestAnimationFrame(render);
      } else {
        requestRef.current = undefined;
      }
    };

    console.log('🖌️ BlobLayer render(immediate) - areas:', blobAreas?.length, 'isEnabled:', isEnabled);
    render();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [blobAreas, hoveredBlobId, hoveredMemoryId, isPaused, isEnabled, isHighlightMode]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none transition-opacity duration-700"
      style={{ zIndex: 0, opacity: isEnabled && blobAreas && blobAreas.length > 0 ? 1 : 0 }}
    />
  );
}

// 픽셀 아트 스타일 연결선 레이어 (Canvas 기반)
const PixelConnectionLayer = forwardRef(({
  connectionPairs,
  getLivePos,
  cardSize,
  boardSize,
  isPaused,
  isEnabled,
  hoveredBlobId,
  blobAreas,
  projects = [],
}: {
  connectionPairs: any[];
  getLivePos: (id: string) => { x: number; y: number } | undefined;
  cardSize: 's' | 'm' | 'l';
  boardSize: { width: number; height: number };
  isPaused: boolean;
  isEnabled: boolean;
  hoveredBlobId: string | null;
  blobAreas: any[];
  projects?: ActionProject[];
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  const renderOnce = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx || !isEnabled) return;

    const parent = canvas.parentElement;
    if (parent) {
      const dpr = window.devicePixelRatio || 1;
      const boardW = boardSize.width;
      const boardH = boardSize.height;

      // 캔버스 물리 해상도 설정 (Retina 대응)
      if (canvas.width !== boardW * dpr || canvas.height !== boardH * dpr) {
        canvas.width = boardW * dpr;
        canvas.height = boardH * dpr;
        canvas.style.width = `${boardW}px`;
        canvas.style.height = `${boardH}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 연결선 전용 픽셀 크기 (더 세밀하게 표현)
    const LINE_PIXEL_SIZE = 2;
    const ARROW_PIXEL_SIZE = 4;

    const drawPixelLine = (x1: number, y1: number, x2: number, y2: number, color: string, alpha: number) => {
      let x1p = Math.round(x1 / LINE_PIXEL_SIZE);
      let y1p = Math.round(y1 / LINE_PIXEL_SIZE);
      const x2p = Math.round(x2 / LINE_PIXEL_SIZE);
      const y2p = Math.round(y2 / LINE_PIXEL_SIZE);

      const dx = Math.abs(x2p - x1p);
      const dy = Math.abs(y2p - y1p);
      const sx = x1p < x2p ? 1 : -1;
      const sy = y1p < y2p ? 1 : -1;
      let err = dx - dy;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;

      while (true) {
        ctx.fillRect(x1p * LINE_PIXEL_SIZE, y1p * LINE_PIXEL_SIZE, LINE_PIXEL_SIZE, LINE_PIXEL_SIZE);
        if (x1p === x2p && y1p === y2p) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x1p += sx; }
        if (e2 < dx) { err += dx; y1p += sy; }
      }
    };

    const drawArrowhead = (tx: number, ty: number, angle: number, color: string, alpha: number) => {
      ctx.save();
      const ps = ARROW_PIXEL_SIZE;
      const snapX = Math.round(tx / ps) * ps;
      const snapY = Math.round(ty / ps) * ps;
      ctx.translate(snapX, snapY);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(-ps, -ps / 2, ps, ps);
      ctx.fillRect(-ps * 2, -ps, ps, ps * 2);
      ctx.restore();
    };

    connectionPairs.forEach(pair => {
      const from = getLivePos(pair.from);
      const to = getLivePos(pair.to);
      if (!from || !to) return;

      const isInBlobGroup = blobAreas.some(blob =>
        blob.memoryIds.includes(pair.from) && blob.memoryIds.includes(pair.to)
      );

      const offsetIndex = (pair as any).offsetIndex || 0;
      const totalConnections = (pair as any).totalConnections || 1;
      const lineOffset = totalConnections > 1 ? (offsetIndex - (totalConnections - 1) / 2) * 12 : 0;

      // 엔티티 타입별 중심점 계산
      const getDimensions = (id: string) => {
        const project = projects.find(p => p.id === id);
        if (project) return { centerX: 180, centerY: 60 }; // 360/2, 상단 타이틀 부근
        return CARD_DIMENSIONS[cardSize];
      };

      const fromDim = getDimensions(pair.from);
      const toDim = getDimensions(pair.to);

      // 시작점과 끝점은 절대 픽셀 스냅하지 않음 (카드 위치와 1:1 동기화)
      const fromX = from.x + fromDim.centerX;
      const fromY = from.y + fromDim.centerY;
      const toX = to.x + toDim.centerX;
      const toY = to.y + toDim.centerY;

      const dx_full = toX - fromX;
      const dy_full = toY - fromY;
      const len = Math.max(1, Math.sqrt(dx_full * dx_full + dy_full * dy_full));
      const perpX = -dy_full / (len || 1);
      const perpY = dx_full / (len || 1);

      const aFromX = fromX + perpX * lineOffset;
      const aFromY = fromY + perpY * lineOffset;
      const aToX = toX + perpX * lineOffset;
      const aToY = toY + perpY * lineOffset;

      const midX = (aFromX + aToX) / 2;
      const midY = (aFromY + aToY) / 2;
      // 곡률 강화: 더 유려한 곡선 표현
      const curveOffset = Math.min(80, len * 0.25);
      const cx = midX - (dy_full / (len || 1)) * curveOffset;
      const cy = midY + (dx_full / (len || 1)) * curveOffset;

      const isLineHovered = hoveredBlobId && blobAreas.some(blob =>
        blob.id === hoveredBlobId && blob.memoryIds.includes(pair.from) && blob.memoryIds.includes(pair.to)
      );
      const alpha = isInBlobGroup ? (isLineHovered ? 0.7 : 0.4) : 1.0;

      const steps = Math.max(10, Math.floor(len / 8));
      let lx = aFromX;
      let ly = aFromY;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const currX = (1 - t) * (1 - t) * aFromX + 2 * (1 - t) * t * cx + t * t * aToX;
        const currY = (1 - t) * (1 - t) * aFromY + 2 * (1 - t) * t * cy + t * t * aToY;
        drawPixelLine(lx, ly, currX, currY, pair.color, alpha);
        lx = currX;
        ly = currY;
      }

      if (!isInBlobGroup) {
        const angle = Math.atan2(aToY - cy, aToX - cx);
        drawArrowhead(aToX, aToY, angle, pair.color, alpha);
      }
    });
  }, [connectionPairs, getLivePos, cardSize, boardSize, isEnabled, hoveredBlobId, blobAreas, projects]);

  useImperativeHandle(ref, () => ({
    redraw: () => {
      renderOnce();
    }
  }), [renderOnce]);

  useEffect(() => {
    let animationId: number | undefined;
    const renderLoop = () => {
      renderOnce();
      if (!isPaused) {
        animationId = requestAnimationFrame(renderLoop);
      }
    };
    renderLoop();
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPaused, renderOnce]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1, opacity: isEnabled ? 1 : 0 }}
    />
  );
});
PixelConnectionLayer.displayName = 'PixelConnectionLayer';

interface MemoryViewProps {
  memories: Memory[];
  onMemoryDeleted?: () => void;
  personaId?: string | null;
}

export default function MemoryView({ memories, onMemoryDeleted, personaId }: MemoryViewProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const storageKey = selectedGroupId || 'all';
  const [draggedMemoryId, setDraggedMemoryId] = useState<string | null>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(null);
  const [linkManagerMemory, setLinkManagerMemory] = useState<Memory | null>(null);
  // 로컬 메모리 상태 (연결 추가 시 즉시 반영)
  const [localMemories, setLocalMemories] = useState<Memory[]>(memories);
  // 메모리 순서 관리 (클릭 시 최상단으로 이동)
  const [memoryOrder, setMemoryOrder] = useState<string[]>(() => memories.map(m => m.id));

  // Moved up to fix ReferenceError
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [previousPositions, setPreviousPositions] = useState<Record<string, { x: number; y: number }> | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [cardSize, setCardSize] = useState<'s' | 'm' | 'l'>('m');
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const {
    boardRef,
    boardContainerRef,
    boardSize,
    setBoardSize,
    zoom,
    setZoom,
    zoomRef,
    viewportBounds,
    animateCameraTo,
    changeZoom,
    resetZoom,
  } = useBoardCamera({ storageKey });

  const handleFocusMemory = useCallback((memoryId: string) => {
    const pos = positionsRef.current[memoryId];
    if (!pos) return;
    const { width, height } = CARD_DIMENSIONS[cardSize];
    animateCameraTo({
      x: pos.x + width / 2,
      y: pos.y + height / 2,
      zoom: zoomRef.current || 1,
    });
  }, [cardSize, animateCameraTo, zoomRef]);

  // props로부터 localMemories 동기화
  useEffect(() => {
    // 새로운 메모리가 추가되었는지 확인 (개수 증가로 간단히 판단)
    if (memories.length > localMemories.length) {
      // 새로 추가된 메모리 ID 찾기
      const prevIds = new Set(localMemories.map(m => m.id));
      const added = memories.find(m => !prevIds.has(m.id));
      if (added) {
        setPendingFocusId(added.id);
      }
    }
    setLocalMemories(memories);
  }, [memories, localMemories]);

  // 새로운 메모리 위치가 확보되면 해당 위치로 포커스
  useEffect(() => {
    if (pendingFocusId && positions[pendingFocusId]) {
      handleFocusMemory(pendingFocusId);
      setPendingFocusId(null);
    }
  }, [pendingFocusId, positions, handleFocusMemory]);

  // localMemories 변경 시 memoryOrder 동기화 (새 메모리 추가 시)
  useEffect(() => {
    const currentIds = new Set(memoryOrder);
    const newMemories = localMemories.filter(m => !currentIds.has(m.id));
    if (newMemories.length > 0) {
      setMemoryOrder(prev => [...prev, ...newMemories.map(m => m.id)]);
    }
  }, [localMemories, memoryOrder]);



  // 통합 드래그 상태 (카드와 블록 통합)
  const [draggingEntity, setDraggingEntity] = useState<DraggableEntity | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartPositions, setDragStartPositions] = useState<Record<string, { x: number; y: number }>>({}); // 드래그 시작 시점의 위치


  // 메모리 카드로 시야 이동
  const draggingId = draggingEntity?.type === 'memory' ? draggingEntity.id : null;
  const draggingBlockId = draggingEntity?.type === 'block' ? draggingEntity.id : null;



  const [selectedMemoryIds, setSelectedMemoryIds] = useState<Set<string>>(new Set()); // 다중 선택
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set()); // 다중 선택 (블록)
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null); // 드래그 선택 박스
  const [isSelecting, setIsSelecting] = useState(false); // 선택 모드인지
  const [isAutoArranging, setIsAutoArranging] = useState(false);
  const [hoveredBlobId, setHoveredBlobId] = useState<string | null>(null);
  const [hoveredMemoryId, setHoveredMemoryId] = useState<string | null>(null);

  const [cardColor, setCardColor] = useState<'green' | 'pink' | 'purple'>('green');
  const [cardColorMap, setCardColorMap] = useState<Record<string, 'green' | 'pink' | 'purple'>>({});
  const [linkNotes, setLinkNotes] = useState<Record<string, string>>({});
  const [linkInfo, setLinkInfo] = useState<Record<string, { note?: string; isAIGenerated: boolean }>>({});
  const [isBlobEnabled, setIsBlobEnabled] = useState(true);
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);

  // Blob 설정 불러오기
  useEffect(() => {
    const storedBlob = localStorage.getItem('workless.board.isBlobEnabled');
    if (storedBlob !== null) {
      setIsBlobEnabled(storedBlob === 'true');
    }
  }, []);

  // Blob 설정 저장
  const toggleBlob = () => {
    const nextValue = !isBlobEnabled;
    setIsBlobEnabled(nextValue);
    localStorage.setItem('workless.board.isBlobEnabled', String(nextValue));
  };
  const [clickedCardId, setClickedCardId] = useState<string | null>(null); // 클릭한 카드 ID
  const [clickedBlockId, setClickedBlockId] = useState<string | null>(null); // 클릭한 블록 ID
  // 마지막으로 클릭한 항목 (계속 앞에 유지)
  const [lastClickedItem, setLastClickedItem] = useState<{ type: 'memory' | 'block'; id: string } | null>(null);
  const [toast, setToast] = useState<BoardToastState>({ type: null });
  // @ 태그 클릭 시 표시할 관련 기록 토스트 (여러 개 중첩 가능)
  const [mentionToasts, setMentionToasts] = useState<Array<{ id: string; memoryId: string; x: number; y: number; relatedIds: string[] }>>([]);

  const {
    groups,
    fetchGroups,
    groupDescription,
    isLoadingGroupDescription,
    groupModalMemory,
    setGroupModalMemory,
    editableGroupName,
    setEditableGroupName,
    editableRelatedMemories,
    setEditableRelatedMemories,
    handleCancelGroup,
    handleConfirmGroup,
  } = useGroupsPanel({ selectedGroupId, setSelectedGroupId, setToast });

  const [localProjects, setLocalProjects] = useState<ActionProject[]>([]);
  const [projectPrompt, setProjectPrompt] = useState('');

  // 프로젝트 데이터 불러오기
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setLocalProjects(data.projects || []);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    };
    fetchProjects();
  }, []);

  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const isHighlightModeRef = useRef(false);



  type ActivityMetrics = {
    hoverMsTotal: number;
    editMsTotal: number;
    editCount: number;
    lastActiveAt: number;
    hoverStartAt?: number;
    editStartAt?: number;
  };

  type ContentLayout = {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };

  const activityByContentIdRef = useRef<Record<string, ActivityMetrics>>({});
  const contentLayoutRef = useRef<Record<string, ContentLayout>>({});
  const hoveredContentIdRef = useRef<string | null>(null);
  const [highlightedContentIds, setHighlightedContentIds] = useState<string[]>([]);
  const highlightedContentIdSet = useMemo(() => new Set(highlightedContentIds), [highlightedContentIds]);
  const blocksRef = useRef<CanvasBlock[]>([]);
  const { blocks, setBlocks, visibleBlocks, createBlock, updateBlock: handleBlockUpdate, deleteBlock: handleBlockDelete } =
    useBoardBlocks({ boardSize, viewportBounds });

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const getOrCreateMetrics = useCallback((contentId: string) => {
    const existing = activityByContentIdRef.current[contentId];
    if (existing) return existing;
    const next: ActivityMetrics = {
      hoverMsTotal: 0,
      editMsTotal: 0,
      editCount: 0,
      lastActiveAt: Date.now(),
    };
    activityByContentIdRef.current[contentId] = next;
    return next;
  }, []);

  const markActive = useCallback(
    (contentId: string) => {
      if (!isHighlightModeRef.current) return;
      const metrics = getOrCreateMetrics(contentId);
      metrics.lastActiveAt = Date.now();
    },
    [getOrCreateMetrics],
  );

  const startHover = useCallback(
    (contentId: string) => {
      if (!isHighlightModeRef.current) return;
      const metrics = getOrCreateMetrics(contentId);
      if (metrics.hoverStartAt == null) metrics.hoverStartAt = performance.now();
      markActive(contentId);
    },
    [getOrCreateMetrics, markActive],
  );

  const endHover = useCallback(
    (contentId: string) => {
      if (!isHighlightModeRef.current) return;
      const metrics = activityByContentIdRef.current[contentId];
      if (!metrics || metrics.hoverStartAt == null) return;
      const delta = performance.now() - metrics.hoverStartAt;
      metrics.hoverMsTotal += Math.max(0, delta);
      metrics.hoverStartAt = undefined;
      markActive(contentId);
    },
    [markActive],
  );

  const startEdit = useCallback(
    (contentId: string) => {
      if (!isHighlightModeRef.current) return;
      const metrics = getOrCreateMetrics(contentId);
      if (metrics.editStartAt == null) metrics.editStartAt = performance.now();
      markActive(contentId);
    },
    [getOrCreateMetrics, markActive],
  );

  const endEdit = useCallback(
    (contentId: string, commit: boolean) => {
      if (!isHighlightModeRef.current) return;
      const metrics = activityByContentIdRef.current[contentId];
      if (!metrics || metrics.editStartAt == null) return;
      const delta = performance.now() - metrics.editStartAt;
      metrics.editMsTotal += Math.max(0, delta);
      metrics.editStartAt = undefined;
      if (commit) metrics.editCount += 1;
      markActive(contentId);
    },
    [markActive],
  );

  const getContentIdFromTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    const memoryId = target.closest('[data-memory-card]')?.getAttribute('data-memory-card');
    if (memoryId) return `memory:${memoryId}`;
    const calendarId = target.closest('[data-calendar-block]')?.getAttribute('data-calendar-block');
    if (calendarId) return `block:${calendarId}`;
    const viewerId = target.closest('[data-viewer-block]')?.getAttribute('data-viewer-block');
    if (viewerId) return `block:${viewerId}`;
    const meetingId = target.closest('[data-meeting-recorder-block]')?.getAttribute('data-meeting-recorder-block');
    if (meetingId) return `block:${meetingId}`;
    const databaseId = target.closest('[data-database-block]')?.getAttribute('data-database-block');
    if (databaseId) return `block:${databaseId}`;
    const minimapId = target.closest('[data-minimap-block]')?.getAttribute('data-minimap-block');
    if (minimapId) return `block:${minimapId}`;
    return null;
  }, []);

  const handleActivityPointerOverCapture = useCallback(
    (e: ReactPointerEvent) => {
      if (!isHighlightModeRef.current) return;
      const nextId = getContentIdFromTarget(e.target);
      if (!nextId) return;

      const prevId = hoveredContentIdRef.current;
      if (prevId === nextId) return;

      if (prevId) endHover(prevId);
      hoveredContentIdRef.current = nextId;
      startHover(nextId);
    },
    [endHover, getContentIdFromTarget, startHover],
  );

  const handleActivityPointerOutCapture = useCallback(
    (e: ReactPointerEvent) => {
      if (!isHighlightModeRef.current) return;
      const fromId = getContentIdFromTarget(e.target);
      if (!fromId) return;

      const toId = getContentIdFromTarget((e as any).relatedTarget);
      if (toId === fromId) return;

      if (hoveredContentIdRef.current === fromId) {
        endHover(fromId);
        hoveredContentIdRef.current = null;
      }
    },
    [endHover, getContentIdFromTarget],
  );

  const handleActivityPointerLeaveBoard = useCallback(() => {
    if (!isHighlightModeRef.current) return;
    const prevId = hoveredContentIdRef.current;
    if (prevId) endHover(prevId);
    hoveredContentIdRef.current = null;
  }, [endHover]);

  const handleActivityFocusCapture = useCallback(
    (e: ReactFocusEvent) => {
      if (!isHighlightModeRef.current) return;
      const contentId = getContentIdFromTarget(e.target);
      if (!contentId) return;
      if (contentId.startsWith('memory:')) return;
      startEdit(contentId);
    },
    [getContentIdFromTarget, startEdit],
  );

  const handleActivityBlurCapture = useCallback(
    (e: ReactFocusEvent) => {
      if (!isHighlightModeRef.current) return;
      const contentId = getContentIdFromTarget(e.target);
      if (!contentId) return;
      if (contentId.startsWith('memory:')) return;

      const relatedContentId = getContentIdFromTarget((e as any).relatedTarget);
      if (relatedContentId === contentId) return;
      endEdit(contentId, true);
    },
    [endEdit, getContentIdFromTarget],
  );

  useEffect(() => {
    isHighlightModeRef.current = isHighlightMode;
    if (!isHighlightMode) {
      hoveredContentIdRef.current = null;
      activityByContentIdRef.current = {};
      setHighlightedContentIds([]);
    }
  }, [isHighlightMode]);

  useEffect(() => {
    if (!isHighlightMode) return;

    const TOP_N = 5;
    const HOVER_MIN_MS = 500;

    const scoreOf = (hoverMs: number, editMs: number, editCount: number) =>
      hoverMs + editMs * 2 + editCount * 2000;

    const isExcludedContentId = (contentId: string) => {
      if (!contentId.startsWith('block:')) return false;
      const blockId = contentId.slice('block:'.length);
      const block = blocksRef.current.find((b) => b.id === blockId);
      return block?.type === 'viewer';
    };

    const ensureMetricsForLayouts = () => {
      const now = Date.now();
      Object.keys(contentLayoutRef.current).forEach((contentId) => {
        if (isExcludedContentId(contentId)) return;
        const m = getOrCreateMetrics(contentId);
        m.lastActiveAt = m.lastActiveAt || now;
      });
    };

    const recalc = (isJustEnabled: boolean) => {
      const now = Date.now();
      const nowPerf = performance.now();

      ensureMetricsForLayouts();

      const allContentIds = Array.from(
        new Set([
          ...Object.keys(contentLayoutRef.current),
          ...Object.keys(activityByContentIdRef.current),
        ]),
      );

      const entries = allContentIds
        .map((contentId) => {
          if (isExcludedContentId(contentId)) return null;
          const metrics = getOrCreateMetrics(contentId);
          const hoverMs =
            metrics.hoverMsTotal + (metrics.hoverStartAt == null ? 0 : Math.max(0, nowPerf - metrics.hoverStartAt));
          const editMs =
            metrics.editMsTotal + (metrics.editStartAt == null ? 0 : Math.max(0, nowPerf - metrics.editStartAt));
          const score = scoreOf(hoverMs, editMs, metrics.editCount);
          return { contentId, hoverMs, editMs, editCount: metrics.editCount, score, lastActiveAt: metrics.lastActiveAt };
        })
        .filter((e): e is NonNullable<typeof e> => e != null)
        .filter((e) => contentLayoutRef.current[e.contentId] != null);

      const eligible = entries.filter((e) => e.hoverMs >= HOVER_MIN_MS || e.editCount >= 1 || e.score >= HOVER_MIN_MS);

      const forcedIds = isJustEnabled
        ? entries
          .slice()
          .sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0))
          .slice(0, 3)
          .map((e) => e.contentId)
        : [];

      const nextIds = [
        ...forcedIds,
        ...eligible
          .sort((a, b) => b.score - a.score)
          .map((e) => e.contentId),
      ]
        .filter((id, idx, arr) => arr.indexOf(id) === idx)
        .slice(0, TOP_N);

      setHighlightedContentIds(nextIds);
    };

    ensureMetricsForLayouts();
    recalc(true);
    const immediateRetry = window.setTimeout(() => recalc(true), 120);

    const interval = window.setInterval(() => recalc(false), 1200);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(immediateRetry);
    };
  }, [getOrCreateMetrics, isHighlightMode]);

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

    const memoryIdToDelete = toast.data.memoryId;

    try {
      const res = await fetch(`/api/memories?id=${memoryIdToDelete}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // 로컬 상태 즉시 업데이트 (UI에서 바로 삭제)
        setLocalMemories(prev => prev.filter(m => m.id !== memoryIdToDelete));
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
  const flagsStore = useFlagsStore();
  const {
    flags,
    selectedFlagId,
    hoveredFlagId,
    activeNearestFlagId,
    isPlacingFlag,
    placingFlagDraft,
    startPlacingFlag: handleAddFlag,
    cancelPlacingFlag,
    commitFlagAt,
    goToFlag: handleGoToFlag,
    onBoardPointerMove: handleBoardPointerMove,
  } = useBoardFlags({
    storageKey,
    flagsStore,
    boardRef,
    zoomRef,
    boardSize,
    viewportBounds,
    animateCameraTo,
    onStartPlacingFlag: () => {
      setDraggingEntity(null);
      setIsSelecting(false);
      setSelectionBox(null);
      setClickedCardId(null);
      setSelectedMemoryIds(new Set());
      setSelectedBlockIds(new Set());
    },
  });

  // 통합 드래그 엔진: 즉시 반응형 (RAF 제거)

  const dragStartPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const selectedMemoryIdsRef = useRef<Set<string>>(new Set());
  const selectedBlockIdsRef = useRef<Set<string>>(new Set());
  const selectionBoxRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  // 드래그 중인 요소들의 DOM 참조 (직접 DOM 조작용)
  const draggedElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const rafIdRef = useRef<number | null>(null);
  const dragPositionRef = useRef<Record<string, { x: number; y: number }>>({});

  const connectionPairsArrayRef = useRef<Array<{ from: string; to: string; color: string; groupIndex?: number; offsetIndex?: number; totalConnections?: number; isAIGenerated?: boolean }>>([]);
  const { connectionPathRefs, connectionLabelRefs, getLivePos, updateConnectionPaths } = useConnectionLayer({
    positions,
    positionsRef,
    dragPositionRef,
    cardSize,
    connectionPairsArrayRef,
    projects: localProjects,
  });

  // 픽셀 연결선 레이어 제어용 ref
  const pixelLayerRef = useRef<{ redraw: () => void }>(null);

  useEffect(() => {
    selectionBoxRef.current = selectionBox;
  }, [selectionBox]);


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

  const handleCreateCalendarBlock = () => createBlock('calendar');
  const handleCreateMinimapBlock = () => createBlock('minimap');
  const handleCreateViewerBlock = () => createBlock('viewer');
  const handleCreateMeetingRecorderBlock = () => createBlock('meeting-recorder');
  const handleCreateDatabaseBlock = () => createBlock('database');



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

  const ensureBoardBounds = (x: number, y: number) => {
    const { width: cardWidth, height: cardHeight } = CARD_DIMENSIONS[cardSize];
    setBoardSize(prev => {
      const requiredWidth = Math.max(prev.width, x + cardWidth + BOARD_PADDING / 2);
      const requiredHeight = Math.max(prev.height, y + cardHeight + BOARD_PADDING / 2);

      if (requiredWidth === prev.width && requiredHeight === prev.height) {
        return prev;
      }

      // 성능 최적화: 1픽셀씩 늘리지 않고 500px 단위(Chunk)로 넉넉하게 확장하여 리렌더링 빈도 감소
      const CHUNK_SIZE = 500;
      const newWidth = requiredWidth > prev.width ? Math.ceil(requiredWidth / CHUNK_SIZE) * CHUNK_SIZE : requiredWidth;
      const newHeight = requiredHeight > prev.height ? Math.ceil(requiredHeight / CHUNK_SIZE) * CHUNK_SIZE : requiredHeight;

      return {
        width: newWidth,
        height: newHeight,
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

  const { positionsLoaded } = useBoardPersistence({
    storageKey,
    filteredMemories,
    positions,
    setPositions,
    cardSize,
    setCardSize,
    cardColor,
    setCardColor,
    cardColorMap,
    setCardColorMap,
  });

  // 뷰포트 기반 가상화: 보이는 카드만 렌더링
  const visibleMemories = useMemo(() => {
    if (filteredMemories.length === 0) return [];

    // 뷰포트 경계 계산 (여유 공간 추가)
    const padding = 200;
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

      return !(cardRight < viewLeft || cardLeft > viewRight || cardBottom < viewTop || cardTop > viewBottom);
    });
  }, [filteredMemories, positions, viewportBounds, cardSize]);

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
        height: Math.max(3600, (maxY + padding) * 3),
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
    const height = Math.max(3600, (maxY + padding) * 3);
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

  useBoardSelection({
    isSelecting,
    selectionBox,
    boardRef,
    zoomRef,
    positionsRef,
    selectedMemoryIdsRef,
    selectedBlockIdsRef,
    localMemories,
    blocks,
    cardSize,
    setSelectionBox,
    setSelectedMemoryIds,
    setSelectedBlockIds,
    setIsSelecting,
  });



  useDragEngine({
    draggingEntity,
    boardRef,
    boardContainerRef,
    zoomRef,
    dragOffset,
    blocks,
    localMemories,
    localProjects,
    positionsRef,
    dragStartPositionsRef,
    selectedMemoryIdsRef,
    draggedElementsRef,
    rafIdRef,
    dragPositionRef,
    ensureBoardBounds,
    handleBlockUpdate,
    setBlocks,
    setPositions,
    setLocalProjects,
    setDraggingEntity,
    isSelecting,
    setIsSelecting,
    setSelectionBox,
    updateConnectionPaths,
    pixelLayerRef,
  });

  const handleAutoArrange = async () => {
    if (filteredMemories.length === 0 && blocks.length === 0) return;

    setIsAutoArranging(true);

    try {
      // 현재 위치 백업
      const backupPositions = { ...positions };
      setPreviousPositions(backupPositions);

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

      // 블록(위젯) 정보 준비
      const blockData = blocks.map(b => ({
        id: b.id,
        type: b.type,
        width: b.width || (b.type === 'calendar' ? 350 : 240),
        height: b.height || (b.type === 'calendar' ? 400 : 180),
      }));

      // AI 레이아웃 생성 API 호출
      const res = await fetch('/api/board/arrange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memories: memoryData,
          blocks: blockData,
          connections,
          currentPositions: positions,
          cardSize,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newLayout: Record<string, { x: number; y: number }> = data.layout || {};
        const newBlockPositions: Record<string, { x: number; y: number }> = data.blockLayout || {};

        // 새 메모리 레이아웃 적용
        setPositions(newLayout);

        // 새 블록 레이아웃 적용
        if (Object.keys(newBlockPositions).length > 0) {
          setBlocks(prev => prev.map(b => {
            if (newBlockPositions[b.id]) {
              return { ...b, ...newBlockPositions[b.id] };
            }
            return b;
          }));
        }

        // 보드 크기 조정
        const { width: cardWidth, height: cardHeight } = CARD_DIMENSIONS[cardSize];
        let maxX = 0;
        let maxY = 0;

        // 메모리 기반 최대값
        (Object.values(newLayout) as { x: number; y: number }[]).forEach((pos) => {
          maxX = Math.max(maxX, pos.x + cardWidth);
          maxY = Math.max(maxY, pos.y + cardHeight);
        });

        // 블록 기반 최대값
        blocks.forEach(b => {
          const pos = newBlockPositions[b.id] || { x: b.x, y: b.y };
          const w = b.width || 350;
          const h = b.height || 400;
          maxX = Math.max(maxX, pos.x + w);
          maxY = Math.max(maxY, pos.y + h);
        });

        setBoardSize({
          width: Math.max(1200, maxX + BOARD_PADDING),
          height: Math.max(3600, (maxY + BOARD_PADDING) * 3),
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
        height: Math.max(3600, (maxY + BOARD_PADDING) * 3),
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

      // 포인터 캡처로 즉시 반응 보장
      if (event.currentTarget instanceof HTMLElement) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (err) {
          // 포인터 캡처 실패해도 계속 진행
        }
      }

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

      // 통합 드래그 시스템 사용 (즉시 상태 업데이트)
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
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-orange-50">
        <div className="w-full max-w-5xl mx-auto px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              환영합니다! 🎉
            </h2>
            <p className="text-gray-600">
              첫 기억을 입력하거나 아래에서 연습해보세요
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <OnboardingWhiteboard />
          </div>
        </div>
      </div>
    );
  }

  const cardSizeData = CARD_DIMENSIONS[cardSize];
  const cardSizeClass = cardSize === 's' ? 'w-[260px]' : cardSize === 'l' ? 'w-[360px]' : 'w-[320px]';
  const cardSizeCenter = { x: cardSizeData.centerX, y: cardSizeData.centerY };

  const cardColorClass = 'bg-gray-50';

  // 연결 그룹을 찾아서 색상 할당
  const connectionPairsWithColor = useMemo(() => {
    const set = new Set<string>();
    const pairs: Array<{ from: string; to: string }> = [];
    const visibleIds = new Set(filteredMemories.map(m => m.id));
    const allMemoryIds = new Set(localMemories.map(m => m.id));
    const invalidConnections: Array<{ memoryId: string; invalidRelatedId: string }> = [];

    console.log('🔗 연결선 생성 시작:', {
      totalLocalMemories: localMemories.length,
      filteredMemories: filteredMemories.length,
      visibleIds: Array.from(visibleIds),
    });

    // 연결 쌍 수집 (localMemories 전체를 기반으로, visibleIds에 있는 것만 필터링)
    localMemories.forEach(memory => {
      const related = memory.relatedMemoryIds || [];
      if (related.length > 0) {
        console.log('📌 메모리 연결 정보:', {
          memoryId: memory.id,
          content: memory.content.substring(0, 50),
          relatedMemoryIds: related,
          isVisible: visibleIds.has(memory.id),
        });
      }
      related.forEach(relatedId => {
        // 양쪽 모두 localMemories에 있고, visibleIds에 있는 것만 표시
        if (!allMemoryIds.has(relatedId)) {
          console.log('⚠️ 연결된 메모리가 localMemories에 없음:', relatedId, '- DB 정리 필요');
          // 유효하지 않은 연결 정보를 수집 (실제 정리는 useEffect에서 처리)
          invalidConnections.push({ memoryId: memory.id, invalidRelatedId: relatedId });
          return;
        }
        if (!visibleIds.has(memory.id) || !visibleIds.has(relatedId)) {
          console.log('⚠️ 연결된 메모리가 필터링됨:', { memoryId: memory.id, relatedId, memoryVisible: visibleIds.has(memory.id), relatedVisible: visibleIds.has(relatedId) });
          return;
        }
        const key = [memory.id, relatedId].sort().join(':');
        if (set.has(key)) return;
        set.add(key);
        pairs.push({ from: memory.id, to: relatedId });
        console.log('✅ 연결 쌍 추가:', { from: memory.id, to: relatedId });
      });
    });

    console.log('🔗 총 연결 쌍:', pairs.length, pairs);

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

    // 색상 팔레트 - 주황+인디고 계열로 통일
    const colors = [
      '#6366F1', // indigo
      '#818CF8', // indigo-400
      '#A5B4FC', // indigo-300
      '#FB923C', // orange-400
      '#FDBA74', // orange-300
      '#FED7AA', // orange-200
      '#4F46E5', // indigo-600
      '#7C3AED', // indigo-700
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
      invalidConnections,
    };
  }, [localMemories, filteredMemories, linkInfo, getLinkKey]);

  // 유효하지 않은 연결 정리 (부작용을 useEffect로 분리)
  useEffect(() => {
    const { invalidConnections } = connectionPairsWithColor;
    if (!invalidConnections || invalidConnections.length === 0) return;

    // 중복 제거를 위한 Set 사용
    const cleanupSet = new Set<string>();
    invalidConnections.forEach(({ memoryId, invalidRelatedId }) => {
      cleanupSet.add(`${memoryId}:${invalidRelatedId}`);
    });

    // 디바운싱: 너무 자주 호출되지 않도록 타이머 사용
    const timer = setTimeout(() => {
      // 각 유효하지 않은 연결을 정리 (백그라운드에서 조용히 실행)
      cleanupSet.forEach(key => {
        const [memoryId, invalidRelatedId] = key.split(':');
        fetch('/api/memories/cleanup-relations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memoryId, invalidRelatedId }),
        })
          .then(res => {
            if (!res.ok) {
              console.warn('연결 정리 응답 실패:', res.status);
            }
          })
          .catch(err => {
            // 에러를 조용히 처리 (백그라운드 작업이므로)
            console.warn('연결 정리 요청 실패 (무시됨):', err.message);
          });
      });
    }, 1000); // 1초 디바운싱

    return () => clearTimeout(timer);
  }, [connectionPairsWithColor.invalidConnections?.length, localMemories.length]);

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
      if (memoryIds.length < 2) return;

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

      // 주황+인디고 파스텔 색상 팔레트
      const pastelColors = [
        '#E0E7FF', // indigo-100
        '#C7D2FE', // indigo-200
        '#A5B4FC', // indigo-300
        '#FED7AA', // orange-200
        '#FDBA74', // orange-300
        '#FED7AA', // orange-200 (반복)
        '#DDD6FE', // indigo-100 (보라 계열)
        '#E9D5FF', // indigo-50 (연한 보라)
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

  // connectionPairsArray를 ref에도 저장 (드래그 중 업데이트 함수에서 사용)
  useEffect(() => {
    connectionPairsArrayRef.current = connectionPairsArray;
  }, [connectionPairsArray]);

  // calculateGroupBounds: 그룹의 메모리 ID들로부터 bounds 계산
  const calculateGroupBounds = useCallback((memoryIds: string[], positions: Record<string, { x: number; y: number }>, cardSize: 's' | 'm' | 'l') => {
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

    if (cardPositions.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    const padding = 20;
    const minX = Math.min(...cardPositions.map(p => p.x)) - padding;
    const minY = Math.min(...cardPositions.map(p => p.y)) - padding;
    const maxX = Math.max(...cardPositions.map(p => p.x + p.width)) + padding;
    const maxY = Math.max(...cardPositions.map(p => p.y + p.height)) + padding;

    return { minX, minY, maxX, maxY };
  }, [cardSize]);

  // groups 기반 blobAreas for Minimap
  const minimapBlobAreas = useMemo(() => {
    return groups
      .filter(g => g.memoryIds && g.memoryIds.length > 0)
      .map(g => ({
        id: g.id,
        bounds: calculateGroupBounds(g.memoryIds, positions, cardSize),
        color: '#A5B4FC', // 테마 색 (indigo-300)
      }));
  }, [groups, positions, cardSize, calculateGroupBounds]);

  // filteredMemories 기반 connectionPairs for Minimap (실제 보드와 동일한 데이터 사용)
  const minimapConnectionPairs = useMemo(() => {
    // connectionPairsWithColor의 pairsWithColor를 직접 사용 (실제 보드와 동일)
    // filteredMemories에 있는 메모리들만 필터링
    const visibleIds = new Set(filteredMemories.map(m => m.id));

    return connectionPairsWithColor.pairsWithColor
      .filter((pair: any) => visibleIds.has(pair.from) && visibleIds.has(pair.to))
      .map((pair: any) => ({
        from: pair.from,
        to: pair.to,
        color: pair.color || '#6366F1',
        offsetIndex: pair.offsetIndex || 0,
        totalConnections: pair.totalConnections || 1,
      }));
  }, [filteredMemories, connectionPairsWithColor]);

  // Minimap용 positions: 메모리 positions + blocks 위치 병합
  const minimapPositions = useMemo(() => {
    const merged: Record<string, { x: number; y: number }> = { ...positions };

    // blocks의 위치를 positions에 추가
    blocks.forEach(block => {
      if (block.x !== undefined && block.y !== undefined) {
        merged[block.id] = { x: block.x, y: block.y };
      }
    });

    return merged;
  }, [positions, blocks]);

  // Select/Delete Keyboard Handler
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const memCount = selectedMemoryIds.size;
        const blockCount = selectedBlockIds.size;

        if (memCount === 0 && blockCount === 0) return;

        let confirmMsg = '';
        if (memCount > 0 && blockCount > 0) confirmMsg = `선택한 기록 ${memCount}개와 위젯 ${blockCount}개를 삭제하시겠습니까?`;
        else if (memCount > 0) confirmMsg = `선택한 기록 ${memCount}개를 삭제하시겠습니까?`;
        else if (blockCount > 0) confirmMsg = `선택한 위젯 ${blockCount}개를 삭제하시겠습니까?`;

        if (confirm(confirmMsg)) {
          // Delete Memories
          if (memCount > 0) {
            const memoriesToDelete = Array.from(selectedMemoryIds);
            await Promise.all(memoriesToDelete.map(id =>
              fetch(`/api/memories?id=${id}`, { method: 'DELETE' })
            ));

            setLocalMemories(prev => prev.filter(m => !selectedMemoryIds.has(m.id)));
            onMemoryDeleted?.();
          }

          // Delete Blocks
          if (blockCount > 0) {
            const blocksToDelete = Array.from(selectedBlockIds);
            blocksToDelete.forEach(id => handleBlockDelete(id));
          }

          setSelectedMemoryIds(new Set());
          setSelectedBlockIds(new Set());
          selectedMemoryIdsRef.current = new Set();
          selectedBlockIdsRef.current = new Set();
          setClickedCardId(null);
          setClickedBlockId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMemoryIds, selectedBlockIds, handleBlockDelete, onMemoryDeleted]);

  return (
    <div className="w-full mx-auto space-y-6 font-galmuri11">
      {/* 필터 바 - 폴더 스타일 */}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {(() => {
            const folderColorMap: Record<string, string> = {
              orange: '#fb923c', // 주황 키 컬러
              indigo: '#6366f1', // 인디고 키 컬러
            };

            const folderButtonBase =
              'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all w-[92px]';

            return (
              <>
                {/* 전체 */}
                <button
                  onClick={() => setSelectedGroupId(null)}
                  className={`${folderButtonBase} ${selectedGroupId === null
                    ? 'bg-gray-900 border-transparent scale-105'
                    : 'hover:bg-gray-50 border-transparent'
                    }`}
                >
                  <div className="relative">
                    <PixelIcon
                      name="folder"
                      size={40}
                      className=""
                      style={{ color: selectedGroupId === null ? '#FFFFFF' : '#6B7280' }}
                    />
                    {/* 픽셀 스타일 뱃지 */}
                    <div className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 ${
                      selectedGroupId === null 
                        ? 'bg-white border-white text-gray-900' 
                        : 'bg-gray-900 border-gray-900 text-white'
                    } text-[9px] font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]`}>
                      {memories.length}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${selectedGroupId === null ? 'text-white' : 'text-gray-600'}`}>
                    전체
                  </span>
                </button>

                {/* 그룹 폴더들 */}
                {groups.map((group, index) => {
                  const palette = Object.values(folderColorMap);
                  // 주황/인디고를 번갈아가며 사용
                  const fallbackColor = palette[index % palette.length] || '#6366f1';
                  const folderColor = folderColorMap[group.color || ''] || fallbackColor;

                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      onDragOver={(e) => handleDragOver(e, group.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, group.id)}
                      className={`${folderButtonBase} relative ${selectedGroupId === group.id
                        ? 'bg-gray-900 border-transparent scale-105'
                        : dropTargetGroupId === group.id
                          ? 'bg-indigo-50 border-transparent scale-105'
                          : 'hover:bg-gray-50 border-transparent'
                        }`}
                    >
                      <div className="relative">
                        <PixelIcon
                          name="folder"
                          size={40}
                          className=""
                          style={{ color: selectedGroupId === group.id ? '#FFFFFF' : folderColor }}
                        />
                        {/* 픽셀 스타일 뱃지 */}
                        <div className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 ${
                          selectedGroupId === group.id 
                            ? 'bg-white border-white text-gray-900' 
                            : 'bg-gray-900 border-gray-900 text-white'
                        } text-[9px] font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]`}>
                          {group.memoryIds.length}
                        </div>
                      </div>
                      <span className={`text-xs font-medium max-w-[80px] truncate ${selectedGroupId === group.id ? 'text-white' : 'text-gray-600'
                        }`}>
                        {group.name}
                      </span>
                      {dropTargetGroupId === group.id && (
                        <div className="absolute -top-1 -right-1">
                          <PixelIcon name="download" size={16} className="text-indigo-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>

      {/* 그룹 설명 */}
      {selectedGroupId && (
        <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-indigo-50 border border-indigo-300">
          {isLoadingGroupDescription ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ProcessingLoader size={16} variant="inline" tone="indigo" />
              <span>AI가 그룹을 분석하고 있어요...</span>
            </div>
          ) : groupDescription ? (
            <div className="flex items-start gap-3">
              <PixelIcon name="folder" size={24} />
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
      <div data-tutorial-target="board-view" className="h-[calc(300vh-280px)] min-h-[1500px]">
        <div className="w-full h-full bg-white border border-gray-300 font-galmuri11 flex overflow-hidden">
          <FlagSidebar
            flags={flags}
            selectedFlagId={selectedFlagId}
            activeFlagId={activeNearestFlagId}
            hoveredFlagId={hoveredFlagId}
            isPlacing={isPlacingFlag}
            onAddFlag={handleAddFlag}
            onGoToFlag={handleGoToFlag}
            onHoverFlag={(id) => flagsStore.hoverFlag(storageKey, id)}
          />
          <div className="flex-1 bg-white relative flex flex-col min-w-0 overflow-hidden">
            {/* 컨트롤 바 - (좌측 깃발 사이드바처럼) 스크롤과 무관하게 상단 고정 */}
            <div className="shrink-0 sticky top-0 z-30 flex items-center justify-between px-3 py-2 text-xs text-gray-500 bg-white border-b border-gray-200 shadow-sm">
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

                <GmailImportButton 
                  onImportComplete={(count) => {
                    console.log(`Gmail에서 ${count}개의 이메일을 가져왔습니다.`);
                    // 메모리 새로고침은 부모에서 처리
                    if (onMemoryDeleted) {
                      onMemoryDeleted();
                    }
                  }}
                />

                <WidgetCreateButton
                  isOpen={isWidgetMenuOpen}
                  onClick={() => setIsWidgetMenuOpen((prev) => !prev)}
                />
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

            {/* 위젯 생성 메뉴 바 */}
            {isWidgetMenuOpen && (
              <WidgetMenuBar
                blocks={blocks}
                selectedMemoryIds={selectedMemoryIds}
                isBlobEnabled={isBlobEnabled}
                onCreateCalendar={handleCreateCalendarBlock}
                onCreateMinimap={handleCreateMinimapBlock}
                onCreateViewer={handleCreateViewerBlock}
                onCreateMeetingRecorder={handleCreateMeetingRecorderBlock}
                onCreateDatabase={handleCreateDatabaseBlock}
                onCreateProject={() => setToast({ type: 'confirm', data: { type: 'create-project' } })}
                onToggleBlob={toggleBlob}
              />
            )}

            <div className="flex-1 min-h-0 overflow-auto bg-white relative" ref={boardContainerRef}>
              <div
                className={`relative ${isPlacingFlag ? 'cursor-crosshair' : ''}`}
                style={{
                  width: boardSize.width,
                  height: boardSize.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
                ref={boardRef}
                onPointerMove={handleBoardPointerMove}
                onPointerOverCapture={handleActivityPointerOverCapture}
                onPointerOutCapture={handleActivityPointerOutCapture}
                onPointerLeave={handleActivityPointerLeaveBoard}
                onFocusCapture={handleActivityFocusCapture}
                onBlurCapture={handleActivityBlurCapture}
                onContextMenu={(e) => {
                  if (!isPlacingFlag) return;
                  e.preventDefault();
                  e.stopPropagation();
                  cancelPlacingFlag();
                }}
                onPointerDown={(e) => {
                  if (isPlacingFlag) {
                    if (!boardRef.current) return;
                    const rect = boardRef.current.getBoundingClientRect();
                    const scale = zoomRef.current;
                    const x = (e.clientX - rect.left) / scale;
                    const y = (e.clientY - rect.top) / scale;

                    e.preventDefault();
                    e.stopPropagation();

                    if (x >= 0 && y >= 0 && x <= boardSize.width && y <= boardSize.height) {
                      commitFlagAt(x, y);
                      return;
                    }

                    cancelPlacingFlag();
                    return;
                  }

                  // 카드나 블록, 버튼, 링크 등을 클릭한 경우 무시
                  const target = e.target as HTMLElement;

                  // 상호작용 가능한 요소를 클릭한 경우 무시
                  // 메모리 카드나 블록 내부의 요소는 제외
                  const isInteractive =
                    target.closest('[data-memory-card]') ||
                    target.closest('[data-calendar-block]') ||
                    target.closest('[data-viewer-block]') ||
                    target.closest('[data-meeting-recorder-block]') ||
                    target.closest('[data-database-block]') ||
                    target.closest('[data-minimap-block]') ||
                    target.closest('button') ||
                    target.closest('input') ||
                    target.closest('textarea');

                  if (isInteractive) {
                    return;
                  }

                  // 링크는 메모리 카드나 블록 내부의 링크만 제외
                  const link = target.closest('a[href]');
                  if (link) {
                    const isLinkInCard = link.closest('[data-memory-card]') ||
                      link.closest('[data-calendar-block]') ||
                      link.closest('[data-viewer-block]') ||
                      link.closest('[data-meeting-recorder-block]') ||
                      link.closest('[data-database-block]') ||
                      link.closest('[data-minimap-block]');
                    if (isLinkInCard) {
                      return;
                    }
                  }

                  // 보드 빈 공간에서 시작하는 드래그 선택
                  // 상호작용 요소가 아니면 선택 모드 시작
                  // Ctrl/Cmd 키가 눌려있지 않으면 기존 선택 해제
                  if (!e.ctrlKey && !e.metaKey && selectedMemoryIds.size > 0) {
                    setSelectedMemoryIds(new Set());
                  }

                  // 블록 선택 해제
                  setClickedBlockId(null);
                  setClickedCardId(null);

                  // 드래그 선택 시작
                  if (!boardRef.current) return;

                  const rect = boardRef.current.getBoundingClientRect();
                  const scale = zoomRef.current;
                  const startX = (e.clientX - rect.left) / scale;
                  const startY = (e.clientY - rect.top) / scale;

                  // 이벤트 전파 방지 (먼저 처리)
                  e.preventDefault();
                  e.stopPropagation();

                  // 선택 모드 시작
                  setIsSelecting(true);
                  setSelectionBox({ startX, startY, endX: startX, endY: startY });

                  // 포인터 캡처로 드래그 중에도 이벤트 받기
                  if (e.currentTarget instanceof HTMLElement) {
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch (err) {
                      // 포인터 캡처 실패해도 계속 진행
                    }
                  }
                }}
              >
                <FlagLayer
                  flags={flags}
                  hoveredFlagId={hoveredFlagId}
                  selectedFlagId={selectedFlagId}
                  draft={isPlacingFlag ? placingFlagDraft : null}
                />

                {/* 미니맵 블록은 boardRef 내부에 렌더링 */}
                {blocks.find(b => b.type === 'minimap') && (() => {
                  const minimapBlock = blocks.find(b => b.type === 'minimap')!;
                  // 기존 블록이 크면 메모리 카드 크기로 강제 축소
                  const minimapWidth = minimapBlock.width && minimapBlock.width > 250 ? 240 : (minimapBlock.width || 240);
                  const minimapHeight = minimapBlock.height && minimapBlock.height > 190 ? 180 : (minimapBlock.height || 180);

                  // 보드 좌표계로 위치 설정
                  const left = minimapBlock.x;
                  const top = minimapBlock.y;
                  const minimapZIndex =
                    draggingBlockId === minimapBlock.id
                      ? 10000
                      : lastClickedItem?.type === 'block' && lastClickedItem.id === minimapBlock.id
                        ? 5000
                        : clickedBlockId === minimapBlock.id
                          ? 100
                          : 30;

                  contentLayoutRef.current[`block:${minimapBlock.id}`] = {
                    x: left,
                    y: top,
                    width: minimapWidth,
                    height: minimapHeight,
                    zIndex: minimapZIndex,
                  };

                  return (
                    <div
                      key={minimapBlock.id}
                      data-block-id={minimapBlock.id}
                      data-minimap-block={minimapBlock.id}
                      className={`absolute bg-white border-[3px] border-black rounded-lg shadow-xl ${isHighlightMode && highlightedContentIdSet.has(`block:${minimapBlock.id}`)
                        ? 'outline outline-2 outline-indigo-500/35'
                        : ''
                        }`}
                      style={{
                        transform: `translate3d(${left}px, ${top}px, 0)`,
                        width: `${minimapWidth}px`,
                        height: `${minimapHeight}px`,
                        zIndex: minimapZIndex,
                        opacity: draggingBlockId === minimapBlock.id ? 0.85 : 1,
                        transition: 'none',
                        willChange: draggingBlockId === minimapBlock.id ? 'transform' : 'auto',
                        pointerEvents: draggingBlockId === minimapBlock.id ? 'none' : 'auto',
                        contain: 'layout style paint',
                      }}
                      onPointerDown={(e) => {
                        const target = e.target as HTMLElement;
                        // 버튼만 제외하고, 캔버스 포함 모든 영역에서 드래그 가능
                        const isInteractiveElement = target.closest('button');

                        if (!isInteractiveElement) {
                          bringToFrontBlock(minimapBlock.id);
                          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        }

                        if (isInteractiveElement) {
                          return;
                        }

                        e.preventDefault();
                        e.stopPropagation();

                        // 보드 좌표계로 드래그 시작
                        const rect = boardRef.current!.getBoundingClientRect();
                        const scale = zoomRef.current;
                        const mouseX = (e.clientX - rect.left) / scale;
                        const mouseY = (e.clientY - rect.top) / scale;

                        setDraggingEntity({ type: 'block', id: minimapBlock.id });
                        setDragOffset({
                          x: mouseX - minimapBlock.x,
                          y: mouseY - minimapBlock.y,
                        });
                      }}
                    >
                      {/* 헤더 */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-300 bg-white rounded-t-lg">
                        <div className="flex items-center gap-1.5">
                          <PixelIcon name="minimap" size={16} />
                          <span className="text-xs font-semibold text-gray-700">Minimap</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBlockDelete(minimapBlock.id);
                          }}
                          className="text-gray-400 hover:text-gray-600 text-xs"
                          title="삭제"
                        >
                          ×
                        </button>
                      </div>
                      {/* 크기 조정 핸들 */}
                      <div
                        className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity rounded-tl-lg"
                        style={{ zIndex: 1000 }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const startWidth = minimapBlock.width || 240;
                          const startHeight = minimapBlock.height || 180;

                          const handleMove = (moveEvent: PointerEvent) => {
                            const deltaX = moveEvent.clientX - startX;
                            const deltaY = moveEvent.clientY - startY;
                            // 메모리 카드 크기 정도로 제한 (최대 280x200, 최소 200x150)
                            const newWidth = Math.max(200, Math.min(280, startWidth + deltaX));
                            const newHeight = Math.max(150, Math.min(200, startHeight + deltaY));

                            setBlocks(prev => {
                              const updated = [...prev];
                              const index = updated.findIndex(b => b.id === minimapBlock.id);
                              if (index !== -1) {
                                const currentBlock = updated[index];
                                updated[index] = { ...currentBlock, width: newWidth, height: newHeight };
                              }
                              return updated;
                            });
                          };

                          const handleUp = () => {
                            window.removeEventListener('pointermove', handleMove);
                            window.removeEventListener('pointerup', handleUp);

                            // 최신 상태에서 크기 가져와서 저장
                            setBlocks(prev => {
                              const currentBlock = prev.find(b => b.id === minimapBlock.id);
                              if (currentBlock && (currentBlock.width !== startWidth || currentBlock.height !== startHeight)) {
                                handleBlockUpdate(minimapBlock.id, {
                                  width: currentBlock.width,
                                  height: currentBlock.height
                                });
                              }
                              return prev;
                            });
                          };

                          window.addEventListener('pointermove', handleMove);
                          window.addEventListener('pointerup', handleUp);
                        }}
                      />
                      {/* 미니맵 캔버스 */}
                      {boardSize.width > 0 && boardSize.height > 0 && (
                        <div
                          className="overflow-hidden rounded-b-lg"
                          style={{
                            height: `${(minimapBlock.height || 180) - 40}px`,
                            width: '100%'
                          }}
                        >
                          <Minimap
                            positions={minimapPositions}
                            blocks={blocks.filter(b => b.type !== 'minimap')}
                            memories={filteredMemories}
                            connectionPairs={minimapConnectionPairs}
                            viewportBounds={viewportBounds}
                            zoom={zoom}
                            cardColorMap={cardColorMap}
                            boardSize={boardSize}
                            containerWidth={minimapBlock.width || 240}
                            containerHeight={(minimapBlock.height || 180) - 40}
                            cardSize={cardSize}
                            blobAreas={blobAreas}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
                {/* 드래그 선택 박스 */}
                {selectionBox && (() => {
                  const left = Math.min(selectionBox.startX, selectionBox.endX);
                  const top = Math.min(selectionBox.startY, selectionBox.endY);
                  const width = Math.abs(selectionBox.endX - selectionBox.startX);
                  const height = Math.abs(selectionBox.endY - selectionBox.startY);

                  // 최소 크기 보장 (너무 작으면 보이지 않음)
                  // 드래그 방향과 관계없이 항상 표시
                  if (width < 0.5 && height < 0.5) return null;

                  return (
                    <div
                      className="absolute border-[3px] border-gray-800 bg-gray-200/10 pointer-events-none"
                      style={{
                        left: `${Math.max(0, left)}px`,
                        top: `${Math.max(0, top)}px`,
                        width: `${Math.max(1, width)}px`,
                        height: `${Math.max(1, height)}px`,
                        zIndex: 10001,
                      }}
                    />
                  );
                })()}

                {/* 다중 선택 안내 */}
                {selectedMemoryIds.size > 0 && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-2 border border-indigo-600 flex items-center gap-2 z-30">
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
                    const blockZIndex = draggingBlockId === block.id ? 10000 : (10 + blockIndex);

                    contentLayoutRef.current[`block:${block.id}`] = {
                      x: block.x,
                      y: block.y,
                      width: block.width || 350,
                      height: block.height || 240,
                      zIndex: blockZIndex,
                    };
                    return (
                      <div key={block.id} data-block-id={block.id}>
                        <CalendarBlock
                          blockId={block.id}
                          x={block.x}
                          y={block.y}
                          width={block.width}
                          height={block.height}
                          config={config}
                          memories={localMemories}
                          onUpdate={handleBlockUpdate}
                          onDelete={handleBlockDelete}
                          isHighlighted={isHighlightMode && highlightedContentIdSet.has(`block:${block.id}`)}
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
                          zIndex={blockZIndex}
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
                      </div>
                    );
                  }
                  // 미니맵은 transform 밖에 별도 렌더링하므로 여기서는 제외
                  if (block.type === 'minimap') {
                    return null;
                  }
                  if (block.type === 'viewer') {
                    const viewerConfig = block.config as ViewerBlockConfig;
                    const blockZIndex = draggingBlockId === block.id ? 10000 : (10 + blockIndex);

                    contentLayoutRef.current[`block:${block.id}`] = {
                      x: block.x,
                      y: block.y,
                      width: block.width || 420,
                      height: block.height || 320,
                      zIndex: blockZIndex,
                    };
                    return (
                      <div key={block.id} data-block-id={block.id}>
                        <ViewerBlock
                          blockId={block.id}
                          x={block.x}
                          y={block.y}
                          width={block.width}
                          height={block.height}
                          zoom={zoom}
                          config={viewerConfig}
                          onUpdate={handleBlockUpdate}
                          onDelete={handleBlockDelete}
                          isDragging={draggingBlockId === block.id}
                          isClicked={clickedBlockId === block.id}
                          zIndex={blockZIndex}
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
                      </div>
                    );
                  }
                  if (block.type === 'meeting-recorder') {
                    const meetingConfig = block.config as MeetingRecorderBlockConfig;
                    const blockZIndex =
                      draggingBlockId === block.id
                        ? 10000
                        : lastClickedItem?.type === 'block' && lastClickedItem.id === block.id
                          ? 5000
                          : clickedBlockId === block.id
                            ? 100 + blockIndex
                            : 10 + blockIndex;

                    contentLayoutRef.current[`block:${block.id}`] = {
                      x: block.x,
                      y: block.y,
                      width: block.width || 420,
                      height: block.height || 320,
                      zIndex: blockZIndex,
                    };
                    return (
                      <div key={block.id} data-block-id={block.id}>
                        <MeetingRecorderBlock
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
                          zIndex={blockZIndex}
                          isHighlighted={isHighlightMode && highlightedContentIdSet.has(`block:${block.id}`)}
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
                      </div>
                    );
                  }
                  if (block.type === 'database') {

                    const databaseConfig = block.config as DatabaseBlockConfig;
                    const blockZIndex =
                      draggingBlockId === block.id
                        ? 10000
                        : lastClickedItem?.type === 'block' && lastClickedItem.id === block.id
                          ? 5000
                          : clickedBlockId === block.id
                            ? 100 + blockIndex
                            : 10 + blockIndex;

                    contentLayoutRef.current[`block:${block.id}`] = {
                      x: block.x,
                      y: block.y,
                      width: block.width || 420,
                      height: block.height || 320,
                      zIndex: blockZIndex,
                    };

                    return (
                      <div key={block.id} data-block-id={block.id}>
                        <DatabaseBlock
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
                          zIndex={blockZIndex}
                          isHighlighted={isHighlightMode && highlightedContentIdSet.has(`block:${block.id}`)}
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
                      </div>
                    );
                  }
                  return null;
                })}

                <PixelConnectionLayer
                  ref={pixelLayerRef}
                  connectionPairs={connectionPairsArray}
                  getLivePos={getLivePos}
                  cardSize={cardSize}
                  boardSize={boardSize}
                  isPaused={!draggingEntity && hoveredBlobId === null}
                  isEnabled={true}
                  hoveredBlobId={hoveredBlobId}
                  blobAreas={blobAreas}
                  projects={localProjects}
                />

                <BlobLayer
                  blobAreas={blobAreas}
                  hoveredBlobId={hoveredBlobId}
                  hoveredMemoryId={hoveredMemoryId}
                  isPaused={!!draggingEntity}
                  isEnabled={isBlobEnabled}
                  isHighlightMode={isHighlightMode}
                />

                {connectionPairsArray.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
                    {/* 선 자체는 Canvas 레이어로 이동하고, 텍스트 라벨만 SVG로 유지 가능 */}
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      width={boardSize.width}
                      height={boardSize.height}
                    >
                      {connectionPairsArray.map(pair => {
                        const from = getLivePos(pair.from);
                        const to = getLivePos(pair.to);
                        if (!from || !to) return null;

                        const getDim = (id: string) => {
                          const p = localProjects.find(item => item.id === id);
                          if (p) return { centerX: 180, centerY: 60 };
                          return CARD_DIMENSIONS[cardSize];
                        };
                        const fromDim = getDim(pair.from);
                        const toDim = getDim(pair.to);

                        const fromX = from.x + fromDim.centerX;
                        const fromY = from.y + fromDim.centerY;
                        const toX = to.x + toDim.centerX;
                        const toY = to.y + toDim.centerY;

                        const midX = (fromX + toX) / 2;
                        const midY = (fromY + toY) / 2;

                        const dx = toX - fromX;
                        const dy = toY - fromY;
                        const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                        const curveOffset = Math.min(45, len * 0.18);
                        const cx = midX - (dy / len) * curveOffset;
                        const cy = midY + (dx / len) * curveOffset;

                        const linkKey = getLinkKey(pair.from, pair.to);
                        const note = linkNotes[linkKey];
                        const pathKey = `${pair.from}-${pair.to}-${(pair as any).offsetIndex || 0}`;

                        return note ? (
                          <text
                            key={`text-${pathKey}`}
                            data-connection-label-key={pathKey}
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
                        ) : null;
                      })}
                    </svg>
                  </div>
                )}

                {/* 드래그 선택 박스 */}
                {selectionBox && (() => {
                  const left = Math.min(selectionBox.startX, selectionBox.endX);
                  const top = Math.min(selectionBox.startY, selectionBox.endY);
                  const width = Math.abs(selectionBox.endX - selectionBox.startX);
                  const height = Math.abs(selectionBox.endY - selectionBox.startY);

                  // 최소 크기 보장 (너무 작으면 보이지 않음)
                  // 드래그 방향과 관계없이 항상 표시
                  if (width < 0.5 && height < 0.5) return null;

                  return (
                    <div
                      className="absolute border-[3px] border-gray-800 bg-gray-200/10 pointer-events-none"
                      style={{
                        left: `${Math.max(0, left)}px`,
                        top: `${Math.max(0, top)}px`,
                        width: `${Math.max(1, width)}px`,
                        height: `${Math.max(1, height)}px`,
                        zIndex: 10001,
                      }}
                    />
                  );
                })()}

                {/* 다중 선택 안내 */}
                {selectedMemoryIds.size > 0 && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-2 border border-indigo-600 flex items-center gap-2 z-30">
                    <span className="text-sm font-medium">
                      {selectedMemoryIds.size}개 카드 선택됨
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
                      const timeAgo = formatDistanceToNow(resolveTimestamp(toastMemory.createdAt), {
                        addSuffix: true,
                        locale: ko
                      });

                      return (
                        <div
                          key={toast.id}
                          className="absolute bg-white border border-indigo-400 z-50 p-3 min-w-[280px] max-w-[320px] max-h-[500px] overflow-y-auto cursor-pointer"
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
                                      <PixelIcon
                                        name={attachment.mimetype.includes('pdf') ? 'pdf' : 'attachment'}
                                        size={16}
                                      />
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
                  const memoryColorClass = 'bg-gray-50';
                  const isSelected = selectedMemoryIds.has(memory.id);
                  const isDragging = draggingId === memory.id || (isSelected && draggingId && selectedMemoryIds.has(draggingId));

                  // 이 카드가 속한 Blob Area 찾기
                  const containingBlob = blobAreas.find(blob => blob.memoryIds.includes(memory.id));
                  const isBlobHovered = hoveredBlobId && containingBlob?.id === hoveredBlobId;
                  const isCardHovered = hoveredMemoryId === memory.id;
                  const memoryZIndex = isDragging
                    ? 10000
                    : lastClickedItem?.type === 'memory' && lastClickedItem.id === memory.id
                      ? 5000
                      : clickedCardId === memory.id
                        ? 100 + memoryIndex
                        : isSelected
                          ? 50 + memoryIndex
                          : 10 + memoryIndex;

                  contentLayoutRef.current[`memory:${memory.id}`] = {
                    x: position.x,
                    y: position.y,
                    width: cardSizeData.width,
                    height: cardSizeData.height,
                    zIndex: memoryZIndex,
                  };

                  return (
                    <div
                      key={`${memory.id}-${memoryIndex}`}
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
                        zIndex: memoryZIndex,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                        pointerEvents: isDragging ? 'none' : 'auto',
                        contain: isDragging ? 'layout style paint' : 'none',
                        transformOrigin: 'center center',
                        overflow: 'visible',
                      }}
                      className={`absolute ${cardSizeClass} select-none touch-none cursor-grab active:cursor-grabbing ${isDragging ? 'cursor-grabbing border border-indigo-500' : ''
                        } ${isSelected ? 'ring-2 ring-blue-300/50 ring-offset-1' : ''} ${isBlobHovered ? 'ring-2 ring-blue-200/60 ring-offset-1' : ''
                        }`}
                    >
                      <MemoryCard
                        key={memory.id}
                        memory={memory}
                        onDelete={onMemoryDeleted}
                        allMemories={localMemories}
                        isHighlighted={isHighlightMode && highlightedContentIdSet.has(`memory:${memory.id}`)}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onOpenLinkManager={setLinkManagerMemory}
                        variant="board"
                        colorClass={memoryColorClass}
                        onCardColorChange={(color) =>
                          setCardColorMap((prev) => ({ ...prev, [memory.id]: color }))
                        }
                        linkNotes={linkNotes}
                        personaId={personaId}
                        onMentionClick={(mentionedMemoryId) =>
                          handleMentionClick(memory.id, mentionedMemoryId)
                        }
                        onCardFocus={(memoryId) => setClickedCardId(memoryId)}
                        onOpenGroupModal={(memory) => {
                          setGroupModalMemory(memory);
                          setToast({ type: null });
                        }}
                        onLinkDeleted={(updatedMemory1, updatedMemory2) => {
                          setLocalMemories((prev) => {
                            const updated = [...prev];
                            const index1 = updated.findIndex((m) => m.id === updatedMemory1.id);
                            const index2 = updated.findIndex((m) => m.id === updatedMemory2.id);
                            if (index1 !== -1) updated[index1] = updatedMemory1;
                            if (index2 !== -1) updated[index2] = updatedMemory2;
                            return updated;
                          });
                        }}
                        onRequestDeleteLink={(memoryId1, memoryId2) =>
                          setToast({ type: 'delete-link', data: { memoryId1, memoryId2 } })
                        }
                        onRequestDelete={(memoryId) =>
                          setToast({ type: 'delete-memory', data: { memoryId } })
                        }
                        onRequestDeleteLocation={(memoryId) =>
                          setToast({ type: 'delete-location', data: { memoryId } })
                        }
                        onCreateSummaryCard={handleCreateSummaryCard}
                        onActivityEditStart={(memoryId) => startEdit(`memory:${memoryId}`)}
                        onActivityEditCommit={(memoryId) => endEdit(`memory:${memoryId}`, true)}
                        onActivityEditEnd={() => { }}
                      />
                    </div>
                  );
                })}

                {/* 액션 프로젝트 카드들 */}
                {localProjects.map((project) => {
                  const isDragging = draggingEntity?.type === 'project' && draggingEntity.id === project.id;

                  return (
                    <div
                      key={project.id}
                      data-project-card={project.id}
                      style={{
                        transform: `translate3d(${project.x}px, ${project.y}px, 0)`,
                        zIndex: isDragging ? 10000 : 50,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                        transformOrigin: 'center center',
                      }}
                      className="absolute cursor-grab active:cursor-grabbing"
                      onPointerDown={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('button') ||
                          target.closest('input') ||
                          target.closest('textarea') ||
                          target.closest('[data-interactive="true"]')
                        ) return;

                        if (!boardRef.current) return;
                        e.preventDefault();
                        const rect = boardRef.current.getBoundingClientRect();
                        const scale = zoomRef.current;

                        setDraggingEntity({ type: 'project', id: project.id });
                        setDragOffset({
                          x: (e.clientX - rect.left) / scale - project.x,
                          y: (e.clientY - rect.top) / scale - project.y,
                        });
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      }}
                    >
                      <ActionProjectCard
                        project={project}
                        isDragging={isDragging}
                        onUpdate={(id, updates) => {
                          setLocalProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
                          fetch('/api/projects', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id, ...updates }),
                          }).catch(err => console.error(err));
                        }}
                        onDelete={async (id) => {
                          if (confirm('프로젝트를 삭제하시겠습니까?')) {
                            setLocalProjects(prev => prev.filter(p => p.id !== id));
                            await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
                          }
                        }}
                      />
                    </div>
                  );
                })}

                <BlobLayer
                  blobAreas={blobAreas}
                  hoveredBlobId={hoveredBlobId}
                  hoveredMemoryId={hoveredMemoryId}
                  isPaused={!!draggingEntity}
                  isEnabled={isBlobEnabled}
                  isHighlightMode={isHighlightMode}
                />

                {isHighlightMode &&
                  highlightedContentIds.map((contentId) => {
                    if (contentId.startsWith('memory:')) {
                      const memoryId = contentId.slice('memory:'.length);
                      if (!visibleMemories.some((m) => m.id === memoryId)) return null;
                    } else if (contentId.startsWith('block:')) {
                      const blockId = contentId.slice('block:'.length);
                      if (!blocks.some((b) => b.id === blockId)) return null;
                    }
                    const rect = contentLayoutRef.current[contentId];
                    if (!rect) return null;
                    return <ShineHighlight key={`shine:${contentId}`} targetRect={rect} />;
                  })}
              </div>
              {filteredMemories.length === 0 && (
                <div className="absolute left-0 right-0 top-12 bottom-0 flex items-center justify-center text-sm text-gray-400 pointer-events-none">
                  해당 그룹에 기억이 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
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
      <GroupToasts
        toast={toast}
        editableGroupName={editableGroupName}
        setEditableGroupName={setEditableGroupName}
        editableRelatedMemories={editableRelatedMemories}
        setEditableRelatedMemories={setEditableRelatedMemories}
        groupModalMemory={groupModalMemory}
        localMemories={localMemories}
        onCancelGroup={handleCancelGroup}
        onConfirmGroup={handleConfirmGroup}
      />

      {toast.type === 'success' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
          <div className="bg-green-500 text-white border-4 border-gray-900 p-5 min-w-[300px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
            {/* 픽셀 코너 장식 */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            
            <div className="flex items-center gap-3">
              <PixelIcon name="success" size={24} />
              <div>
                <p className="text-sm font-black uppercase tracking-tight">{toast.data?.message || '완료되었습니다!'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.type === 'delete-link' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
          <div className="bg-white border-4 border-gray-900 p-5 min-w-[350px] max-w-[450px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
            {/* 픽셀 코너 장식 */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            
            <div className="flex items-start gap-3 mb-4">
              <PixelIcon name="link" size={24} />
              <div className="flex-1">
                <h3 className="text-base font-black text-gray-900 mb-1 uppercase tracking-tight">
                  연결을 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-gray-600">
                  이 연결을 삭제하면 두 기록 간의 연결이 끊어집니다.
                </p>
              </div>
              <button
                onClick={() => setToast({ type: null })}
                className="p-1 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-all"
              >
                <PixelIcon name="close" size={16} className="text-gray-600" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setToast({ type: null })}
                className="flex-1 px-4 py-2 text-xs font-bold border-2 border-gray-900 text-gray-700 bg-white hover:bg-gray-100 transition-all uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                취소
              </button>
              <button
                onClick={handleDeleteLink}
                className="flex-1 px-4 py-2 text-xs font-black bg-red-500 text-white border-2 border-gray-900 hover:bg-red-600 transition-all uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.type === 'delete-memory' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
          <div className="bg-white border-4 border-gray-900 p-5 min-w-[350px] max-w-[450px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
            {/* 픽셀 코너 장식 */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            
            <div className="flex items-start gap-3 mb-4">
              <PixelIcon name="delete" size={24} />
              <div className="flex-1">
                <h3 className="text-base font-black text-gray-900 mb-1 uppercase tracking-tight">
                  기록을 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-gray-600">
                  이 기록을 삭제하면 복구할 수 없습니다.
                </p>
              </div>
              <button
                onClick={() => setToast({ type: null })}
                className="p-1 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-all"
              >
                <PixelIcon name="close" size={16} className="text-gray-600" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setToast({ type: null })}
                className="flex-1 px-4 py-2 text-xs font-bold border-2 border-gray-900 text-gray-700 bg-white hover:bg-gray-100 transition-all uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                취소
              </button>
              <button
                onClick={handleDeleteMemory}
                className="flex-1 px-4 py-2 text-xs font-black bg-red-500 text-white border-2 border-gray-900 hover:bg-red-600 transition-all uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.type === 'delete-location' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
          <div className="bg-white border-4 border-gray-900 p-5 min-w-[350px] max-w-[450px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
            {/* 픽셀 코너 장식 */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            
            <div className="flex items-start gap-3 mb-4">
              <PixelIcon name="location" size={24} />
              <div className="flex-1">
                <h3 className="text-base font-black text-gray-900 mb-1 uppercase tracking-tight">
                  위치 정보를 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-gray-600">
                  이 위치 정보를 삭제하면 복구할 수 없습니다.
                </p>
              </div>
              <button
                onClick={() => setToast({ type: null })}
                className="p-1 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-all"
              >
                <PixelIcon name="close" size={16} className="text-gray-600" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setToast({ type: null })}
                className="flex-1 px-4 py-2 text-xs font-bold border-2 border-gray-900 text-gray-700 bg-white hover:bg-gray-100 transition-all uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                취소
              </button>
              <button
                onClick={handleDeleteLocation}
                className="flex-1 px-4 py-2 text-xs font-black bg-red-500 text-white border-2 border-gray-900 hover:bg-red-600 transition-all uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.type === 'confirm' && toast.data?.type === 'create-project' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
          <div className="bg-white border-4 border-gray-900 p-6 min-w-[400px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
            {/* 픽셀 코너 장식 */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-100 border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                <PixelIcon name="target" size={24} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-gray-900 mb-1 uppercase tracking-tight">액션 프로젝트 생성</h3>
                <p className="text-sm text-gray-600 font-medium">선택한 {selectedMemoryIds.size}개의 기록을 바탕으로 계획을 세웁니다.</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-black text-gray-500 mb-1.5 uppercase tracking-widest">
                어떤 프로젝트를 생성할까요?
              </label>
              <textarea
                value={projectPrompt}
                onChange={(e) => setProjectPrompt(e.target.value)}
                placeholder="예: 안티 그라비티 학습 프로젝트, 2주 습관 만들기 등"
                className="w-full h-24 p-3 bg-gray-50 border-2 border-gray-900 text-sm font-medium focus:ring-0 focus:border-indigo-500 transition-colors resize-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setToast({ type: null });
                  setProjectPrompt('');
                }}
                className="flex-1 px-4 py-3 text-sm font-black border-2 border-gray-900 bg-white hover:bg-gray-100 transition-all uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                취소
              </button>
              <button
                disabled={!projectPrompt.trim()}
                onClick={async () => {
                  try {
                    setToast({ type: 'loading', data: { message: 'AI가 실천 계획을 세우는 중...' } });

                    const res = await fetch('/api/projects', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sourceMemoryIds: Array.from(selectedMemoryIds),
                        userPrompt: projectPrompt,
                        x: 100,
                        y: 100,
                        color: 'indigo'
                      }),
                    });

                    if (res.ok) {
                      const data = await res.json();
                      setLocalProjects(prev => [data.project, ...prev]);
                      setToast({ type: 'success', data: { message: '액션 프로젝트가 생성되었습니다!' } });
                      setSelectedMemoryIds(new Set());
                      setProjectPrompt('');
                    } else {
                      setToast({ type: 'error', data: { message: '프로젝트 생성 실패' } });
                    }
                  } catch (error) {
                    setToast({ type: 'error', data: { message: '오류가 발생했습니다' } });
                  }
                }}
                className="flex-1 px-4 py-3 text-sm font-black bg-indigo-500 text-white border-2 border-gray-900 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] disabled:transform-none"
              >
                프로젝트 생성
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.type === 'error' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
          <div className="bg-red-500 text-white border-4 border-gray-900 p-5 min-w-[300px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
            {/* 픽셀 코너 장식 */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            
            <div className="flex items-center gap-3">
              <PixelIcon name="error" size={24} />
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-tight">{toast.data?.message || '오류가 발생했습니다'}</p>
              </div>
              <button
                onClick={() => setToast({ type: null })}
                className="p-1 hover:bg-red-600 border-2 border-transparent hover:border-white/30 transition-all"
              >
                <PixelIcon name="close" size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
