'use client';

import { useMemo, useCallback, useState, useRef } from 'react';
import { Memory, CanvasBlock } from '@/types';

interface MinimapProps {
  boardSize: { width: number; height: number };
  positions: Record<string, { x: number; y: number }>;
  blocks: CanvasBlock[];
  memories: Memory[];
  viewportBounds: { left: number; top: number; width: number; height: number };
  zoom: number;
  boardContainerRef: React.RefObject<HTMLDivElement | null>;
  cardSize: 's' | 'm' | 'l';
  cardColorMap: Record<string, 'green' | 'pink' | 'purple'>;
  cardColor: 'green' | 'pink' | 'purple';
}

const CARD_DIMENSIONS = {
  s: { width: 200, height: 160 },
  m: { width: 240, height: 180 },
  l: { width: 280, height: 200 },
} as const;

// 위젯 타입별 이모지 매핑
const WIDGET_EMOJI_MAP: Record<string, string> = {
  viewer: '📺',
  calendar: '📅',
  memory: '📝',
  memo: '📝',
  default: '📌',
};

// 이모지 크기 제한
const MIN_EMOJI_SIZE = 10;
const MAX_EMOJI_SIZE = 20;
const EMOJI_SIZE_RATIO = 0.4; // 미니맵에서 위젯 크기 대비 이모지 크기 비율 (40%)

interface SymbolItem {
  id: string;
  type: 'memory' | 'block';
  emoji: string;
  x: number;
  y: number;
  size: number;
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
}

export default function Minimap({
  boardSize,
  positions,
  blocks,
  memories,
  viewportBounds,
  zoom,
  boardContainerRef,
  cardSize,
  cardColorMap,
  cardColor,
}: MinimapProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const minimapWidth = 240;
  const minimapHeight = 160;
  const headerHeight = 40; // 헤더 높이 (px-3 py-2)
  const availableHeight = minimapHeight - headerHeight; // 헤더를 제외한 사용 가능한 높이
  const padding = 8;

  // 캔버스 bounds 계산 (모든 아이템 포함)
  const canvasBounds = useMemo(() => {
    let minX = 0;
    let minY = 0;
    let maxX = boardSize.width;
    let maxY = boardSize.height;

    // 메모리 카드 bounds
    memories.forEach(memory => {
      const pos = positions[memory.id];
      if (pos) {
        const cardDims = CARD_DIMENSIONS[cardSize];
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + cardDims.width);
        maxY = Math.max(maxY, pos.y + cardDims.height);
      }
    });

    // 블록 bounds
    blocks.forEach(block => {
      const w = block.width || 350;
      const h = block.height || 200;
      minX = Math.min(minX, block.x);
      minY = Math.min(minY, block.y);
      maxX = Math.max(maxX, block.x + w);
      maxY = Math.max(maxY, block.y + h);
    });

    // 최소 크기 보장
    const width = Math.max(maxX - minX, boardSize.width);
    const height = Math.max(maxY - minY, boardSize.height);

    return { minX, minY, width, height };
  }, [boardSize, positions, blocks, memories, cardSize]);

  // 스케일 계산 (헤더 높이를 제외한 영역 사용)
  const scale = useMemo(() => {
    if (canvasBounds.width <= 0 || canvasBounds.height <= 0) return 0;
    return Math.min(
      (minimapWidth - padding * 2) / canvasBounds.width,
      (availableHeight - padding * 2) / canvasBounds.height
    );
  }, [canvasBounds, minimapWidth, availableHeight, padding]);

  // 좌표 변환: 캔버스 좌표 → 미니맵 좌표
  const transformToMinimap = useCallback((x: number, y: number) => {
    const offsetX = (minimapWidth - canvasBounds.width * scale) / 2;
    const offsetY = (availableHeight - canvasBounds.height * scale) / 2;
    return {
      x: offsetX + (x - canvasBounds.minX) * scale,
      y: offsetY + (y - canvasBounds.minY) * scale,
    };
  }, [minimapWidth, availableHeight, canvasBounds, scale]);

  // 심볼 아이템 생성
  const symbolItems = useMemo(() => {
    const items: SymbolItem[] = [];

    // 메모리 카드 심볼
    memories.forEach(memory => {
      const position = positions[memory.id];
      if (!position) return;

      const cardDims = CARD_DIMENSIONS[cardSize];
      // 미니맵에서 위젯의 실제 크기 (스케일 적용)
      const scaledWidth = cardDims.width * scale;
      const scaledHeight = cardDims.height * scale;
      // 이모지 크기는 위젯의 미니맵 크기에 비례 (더 작은 쪽 기준)
      const widgetSize = Math.min(scaledWidth, scaledHeight);
      const size = Math.max(
        MIN_EMOJI_SIZE,
        Math.min(MAX_EMOJI_SIZE, widgetSize * EMOJI_SIZE_RATIO)
      );

      const { x, y } = transformToMinimap(position.x, position.y);

      items.push({
        id: `memory-${memory.id}`,
        type: 'memory',
        emoji: WIDGET_EMOJI_MAP.memory,
        x: x + scaledWidth / 2 - size / 2, // 중앙 정렬
        y: y + scaledHeight / 2 - size / 2,
        size,
        originalX: position.x,
        originalY: position.y,
        originalWidth: cardDims.width,
        originalHeight: cardDims.height,
      });
    });

    // 블록 심볼
    blocks.forEach(block => {
      if (block.type === 'minimap') return; // 미니맵 자체는 제외

      const width = block.width || 350;
      const height = block.height || 200;
      // 미니맵에서 위젯의 실제 크기 (스케일 적용)
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      // 이모지 크기는 위젯의 미니맵 크기에 비례 (더 작은 쪽 기준)
      const widgetSize = Math.min(scaledWidth, scaledHeight);
      const size = Math.max(
        MIN_EMOJI_SIZE,
        Math.min(MAX_EMOJI_SIZE, widgetSize * EMOJI_SIZE_RATIO)
      );

      const { x, y } = transformToMinimap(block.x, block.y);

      items.push({
        id: `block-${block.id}`,
        type: 'block',
        emoji: WIDGET_EMOJI_MAP[block.type] || WIDGET_EMOJI_MAP.default,
        x: x + scaledWidth / 2 - size / 2, // 중앙 정렬
        y: y + scaledHeight / 2 - size / 2,
        size,
        originalX: block.x,
        originalY: block.y,
        originalWidth: width,
        originalHeight: height,
      });
    });

    return items;
  }, [memories, positions, blocks, cardSize, scale, transformToMinimap]);

  // 뷰포트 영역 계산
  const viewportRect = useMemo(() => {
    if (viewportBounds.width <= 0 || viewportBounds.height <= 0) return null;

    const { x, y } = transformToMinimap(viewportBounds.left, viewportBounds.top);
    const w = viewportBounds.width * scale;
    const h = viewportBounds.height * scale;

    return { x, y, width: w, height: h };
  }, [viewportBounds, scale, transformToMinimap]);

  // 심볼 클릭 핸들러
  const handleSymbolClick = useCallback((item: SymbolItem) => {
    if (!boardContainerRef.current) return;

    // 원본 캔버스 위치로 이동
    const targetX = item.originalX + item.originalWidth / 2;
    const targetY = item.originalY + item.originalHeight / 2;

    const targetScrollLeft = Math.max(0, Math.min(
      targetX * zoom - boardContainerRef.current.clientWidth / 2,
      boardSize.width * zoom - boardContainerRef.current.clientWidth
    ));
    const targetScrollTop = Math.max(0, Math.min(
      targetY * zoom - boardContainerRef.current.clientHeight / 2,
      boardSize.height * zoom - boardContainerRef.current.clientHeight
    ));

    boardContainerRef.current.scrollTo({
      left: targetScrollLeft,
      top: targetScrollTop,
      behavior: 'smooth',
    });
  }, [boardContainerRef, zoom, boardSize]);

  // 배경 클릭 핸들러 (뷰포트 드래그)
  const handleBackgroundPointerDown = useCallback((e: React.PointerEvent) => {
    if (!viewportRect) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 뷰포트 영역 내 클릭인지 확인
    const isInViewport =
      mouseX >= viewportRect.x &&
      mouseX <= viewportRect.x + viewportRect.width &&
      mouseY >= viewportRect.y &&
      mouseY <= viewportRect.y + viewportRect.height;

    if (isInViewport && boardContainerRef.current) {
      setIsDragging(true);
      dragStartRef.current = { x: mouseX, y: mouseY };
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      // 배경 클릭 → 해당 위치로 이동
      const offsetX = (minimapWidth - canvasBounds.width * scale) / 2;
      const offsetY = (minimapHeight - canvasBounds.height * scale) / 2;
      const boardX = (mouseX - offsetX) / scale + canvasBounds.minX;
      const boardY = (mouseY - offsetY) / scale + canvasBounds.minY;

      if (boardContainerRef.current) {
        const targetScrollLeft = Math.max(0, Math.min(
          boardX * zoom - boardContainerRef.current.clientWidth / 2,
          boardSize.width * zoom - boardContainerRef.current.clientWidth
        ));
        const targetScrollTop = Math.max(0, Math.min(
          boardY * zoom - boardContainerRef.current.clientHeight / 2,
          boardSize.height * zoom - boardContainerRef.current.clientHeight
        ));

        boardContainerRef.current.scrollTo({
          left: targetScrollLeft,
          top: targetScrollTop,
          behavior: 'smooth',
        });
      }
    }
  }, [viewportRect, boardContainerRef, minimapWidth, minimapHeight, canvasBounds, scale, zoom, boardSize]);

  const handleBackgroundPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || !boardContainerRef.current || !viewportRect) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const deltaX = (mouseX - dragStartRef.current.x) / scale;
    const deltaY = (mouseY - dragStartRef.current.y) / scale;

    const currentScrollLeft = boardContainerRef.current.scrollLeft;
    const currentScrollTop = boardContainerRef.current.scrollTop;

    const newScrollLeft = Math.max(0, Math.min(
      currentScrollLeft + deltaX * zoom,
      boardSize.width * zoom - boardContainerRef.current.clientWidth
    ));
    const newScrollTop = Math.max(0, Math.min(
      currentScrollTop + deltaY * zoom,
      boardSize.height * zoom - boardContainerRef.current.clientHeight
    ));

    boardContainerRef.current.scrollTo({
      left: newScrollLeft,
      top: newScrollTop,
      behavior: 'auto',
    });

    dragStartRef.current = { x: mouseX, y: mouseY };
  }, [isDragging, scale, zoom, boardSize, viewportRect, boardContainerRef]);

  const handleBackgroundPointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // 보드 크기가 없으면 렌더링하지 않음
  if (boardSize.width <= 0 || boardSize.height <= 0 || scale <= 0) {
    return null;
  }

  return (
    <div
      className="relative w-full h-full bg-gray-50 rounded-lg overflow-hidden"
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerUp}
      onPointerCancel={handleBackgroundPointerUp}
      style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
    >
      {/* 보드 영역 배경 */}
      <div
        className="absolute bg-white border border-gray-200 rounded"
        style={{
          left: `${(minimapWidth - canvasBounds.width * scale) / 2}px`,
          top: `${(availableHeight - canvasBounds.height * scale) / 2}px`,
          width: `${canvasBounds.width * scale}px`,
          height: `${canvasBounds.height * scale}px`,
        }}
      />

      {/* 심볼 아이템들 */}
      {symbolItems.map(item => (
        <div
          key={item.id}
          className="absolute flex items-center justify-center transition-all duration-150 select-none"
          style={{
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: `${item.size}px`,
            height: `${item.size}px`,
            fontSize: `${item.size}px`,
            lineHeight: `${item.size}px`,
            transform: hoveredItem === item.id ? 'scale(1.3)' : 'scale(1)',
            zIndex: hoveredItem === item.id ? 10 : 1,
            cursor: 'pointer',
          }}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={(e) => {
            e.stopPropagation();
            handleSymbolClick(item);
          }}
          title={`${item.type === 'memory' ? 'Memory' : 'Block'}: ${item.id}`}
        >
          {item.emoji}
        </div>
      ))}

      {/* 뷰포트 영역 */}
      {viewportRect && (
        <div
          className="absolute border-2 border-indigo-400 bg-indigo-50/30 rounded pointer-events-none"
          style={{
            left: `${viewportRect.x}px`,
            top: `${viewportRect.y}px`,
            width: `${viewportRect.width}px`,
            height: `${viewportRect.height}px`,
          }}
        />
      )}
    </div>
  );
}
