'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

// 라운드 사각형 그리기 헬퍼 함수
const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  if (width <= 0 || height <= 0) return;
  
  // radius가 너무 크면 조정
  const r = Math.min(radius, Math.min(width, height) / 2);
  
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const minimapWidth = 240;
  const minimapHeight = 160;
  const padding = 8;

  // 스케일 계산
  const scale = Math.min(
    (minimapWidth - padding * 2) / boardSize.width,
    (minimapHeight - padding * 2) / boardSize.height
  );

  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 초기화
    ctx.clearRect(0, 0, minimapWidth, minimapHeight);

    // 배경
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, minimapWidth, minimapHeight);

    // 보드 영역 그리기
    const boardDisplayWidth = boardSize.width * scale;
    const boardDisplayHeight = boardSize.height * scale;
    const offsetX = (minimapWidth - boardDisplayWidth) / 2;
    const offsetY = (minimapHeight - boardDisplayHeight) / 2;

    // 보드 배경 (라운드)
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, offsetX, offsetY, boardDisplayWidth, boardDisplayHeight, 4);
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 클러스터링을 위한 그리드 설정
    const gridCellSize = 12; // 미니맵 그리드 셀 크기
    const gridMap = new Map<string, Array<{ x: number; y: number; w: number; h: number; color: string; strokeColor: string }>>();

    // 메모리 카드를 그리드에 배치 (원본과 100% 동일한 스타일)
    memories.forEach((memory) => {
      const position = positions[memory.id];
      if (!position) return;

      const memoryColor = cardColorMap[memory.id] || cardColor;
      // 원본 Tailwind 색상 사용
      // green-50: rgb(240, 253, 250), green-200: rgb(167, 243, 208)
      // pink-50: rgb(253, 244, 255), pink-200: rgb(251, 207, 232)
      // purple-50: rgb(250, 245, 255), purple-200: rgb(233, 213, 255)
      const fillColor = memoryColor === 'green' 
        ? 'rgb(240, 253, 250)' 
        : memoryColor === 'pink' 
        ? 'rgb(253, 244, 255)' 
        : 'rgb(250, 245, 255)';
      const strokeColor = memoryColor === 'green'
        ? 'rgb(167, 243, 208)'
        : memoryColor === 'pink'
        ? 'rgb(251, 207, 232)'
        : 'rgb(233, 213, 255)';

      const cardDims = CARD_DIMENSIONS[cardSize];
      const x = offsetX + position.x * scale;
      const y = offsetY + position.y * scale;
      // 원본 크기 그대로 (비율 유지)
      const w = Math.max(2, cardDims.width * scale);
      const h = Math.max(2, cardDims.height * scale);

      // 미니맵 범위 내에만 처리
      if (x + w > offsetX && x < offsetX + boardDisplayWidth && y + h > offsetY && y < offsetY + boardDisplayHeight) {
        // 그리드 셀 좌표 계산
        const gridX = Math.floor((x - offsetX) / gridCellSize);
        const gridY = Math.floor((y - offsetY) / gridCellSize);
        const gridKey = `${gridX},${gridY}`;

        if (!gridMap.has(gridKey)) {
          gridMap.set(gridKey, []);
        }
        gridMap.get(gridKey)!.push({ x, y, w, h, color: fillColor, strokeColor });
      }
    });

    // 그리드 기반 클러스터링 렌더링 (원본 스타일 그대로)
    gridMap.forEach((items, gridKey) => {
      if (items.length === 1) {
        // 단일 아이템: 원본 스타일 그대로
        const item = items[0];
        // rounded-lg = 8px
        const radius = Math.min(8, Math.min(item.w, item.h) / 2);

        // Shadow (shadow-md)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        // Fill (원본 배경색)
        ctx.fillStyle = item.color;
        drawRoundedRect(ctx, item.x, item.y, item.w, item.h, radius);
        ctx.fill();

        // Shadow reset
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Stroke (원본 border 색상, 1px)
        ctx.strokeStyle = item.strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // 클러스터: 스택 표현 (2~3개 겹쳐서, 원본 스타일 유지)
        const stackCount = Math.min(items.length, 3);
        const stackOffset = 2.5; // 2-3px offset

        items.slice(0, stackCount).forEach((item, idx) => {
          const offsetX_stack = idx * stackOffset;
          const offsetY_stack = idx * stackOffset;
          // rounded-lg = 8px
          const radius = Math.min(8, Math.min(item.w, item.h) / 2);

          // Shadow (shadow-md)
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;

          // Fill
          ctx.fillStyle = item.color;
          drawRoundedRect(ctx, item.x + offsetX_stack, item.y + offsetY_stack, item.w, item.h, radius);
          ctx.fill();

          // Shadow reset
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // Stroke
          ctx.strokeStyle = item.strokeColor;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }
    });

    // 캘린더 블록 그리기 (원본 스타일 그대로)
    blocks.filter(block => block.type === 'calendar').forEach((block) => {
      const x = offsetX + block.x * scale;
      const y = offsetY + block.y * scale;
      const w = Math.max(3, (block.width || 350) * scale);
      const h = Math.max(3, (block.height || 200) * scale);

      // 미니맵 범위 내에만 그리기
      if (x + w > offsetX && x < offsetX + boardDisplayWidth && y + h > offsetY && y < offsetY + boardDisplayHeight) {
        // rounded-lg = 8px
        const radius = Math.min(8, Math.min(w, h) / 2);

        // Shadow (shadow-lg)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        // Fill (bg-white)
        ctx.fillStyle = 'rgb(255, 255, 255)';
        drawRoundedRect(ctx, x, y, w, h, radius);
        ctx.fill();

        // Shadow reset
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Stroke (border-gray-200, 1px)
        ctx.strokeStyle = 'rgb(229, 231, 235)'; // gray-200
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // 뷰포트 영역 그리기 (유리창 느낌)
    if (viewportBounds.width > 0 && viewportBounds.height > 0) {
      const vx = offsetX + viewportBounds.left * scale;
      const vy = offsetY + viewportBounds.top * scale;
      const vw = Math.max(4, viewportBounds.width * scale);
      const vh = Math.max(4, viewportBounds.height * scale);

      // 미니맵 범위 내로 clamp
      const clampedVx = Math.max(offsetX, Math.min(vx, offsetX + boardDisplayWidth));
      const clampedVy = Math.max(offsetY, Math.min(vy, offsetY + boardDisplayHeight));
      const clampedVw = Math.min(vw, offsetX + boardDisplayWidth - clampedVx);
      const clampedVh = Math.min(vh, offsetY + boardDisplayHeight - clampedVy);

      if (clampedVw > 0 && clampedVh > 0) {
        // radius 8-10
        const radius = Math.min(10, Math.min(clampedVw, clampedVh) / 2);

        // Fill (유리창 느낌)
        ctx.fillStyle = 'rgba(99,102,241,0.06)';
        drawRoundedRect(ctx, clampedVx, clampedVy, clampedVw, clampedVh, radius);
        ctx.fill();

        // Stroke (shadow 제거)
        ctx.strokeStyle = 'rgba(99,102,241,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [boardSize, positions, blocks, memories, viewportBounds, scale, cardSize, cardColorMap, cardColor]);

  // 미니맵 그리기
  useEffect(() => {
    if (scale > 0 && boardSize.width > 0 && boardSize.height > 0) {
      drawMinimap();
    }
  }, [drawMinimap, scale, boardSize]);

  // 클릭/드래그 핸들러
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !boardContainerRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const boardDisplayWidth = boardSize.width * scale;
    const boardDisplayHeight = boardSize.height * scale;
    const offsetX = (minimapWidth - boardDisplayWidth) / 2;
    const offsetY = (minimapHeight - boardDisplayHeight) / 2;

    // 뷰포트 영역 내 클릭인지 확인
    const vx = offsetX + viewportBounds.left * scale;
    const vy = offsetY + viewportBounds.top * scale;
    const vw = viewportBounds.width * scale;
    const vh = viewportBounds.height * scale;

    const isInViewport = mouseX >= vx && mouseX <= vx + vw && mouseY >= vy && mouseY <= vy + vh;

    if (isInViewport) {
      // 뷰포트 드래그 시작
      setIsDragging(true);
      dragStartRef.current = { x: mouseX, y: mouseY };
      canvas.setPointerCapture(e.pointerId);
    } else {
      // 미니맵 클릭 → 해당 위치로 이동
      const boardX = (mouseX - offsetX) / scale;
      const boardY = (mouseY - offsetY) / scale;

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
  }, [boardSize, scale, zoom, viewportBounds, boardContainerRef]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current || !boardContainerRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const boardDisplayWidth = boardSize.width * scale;
    const offsetX = (minimapWidth - boardDisplayWidth) / 2;
    const offsetY = (minimapHeight - boardSize.height * scale) / 2;

    // 마우스 이동량을 보드 좌표로 변환
    const deltaX = (mouseX - dragStartRef.current.x) / scale;
    const deltaY = (mouseY - dragStartRef.current.y) / scale;

    // 현재 스크롤 위치에서 이동
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

    // RAF로 스크롤 업데이트
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      if (boardContainerRef.current) {
        boardContainerRef.current.scrollTo({
          left: newScrollLeft,
          top: newScrollTop,
          behavior: 'auto',
        });
      }
    });

    dragStartRef.current = { x: mouseX, y: mouseY };
  }, [isDragging, boardSize, scale, zoom, boardContainerRef]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // 보드 크기가 없으면 렌더링하지 않음
  if (boardSize.width <= 0 || boardSize.height <= 0 || scale <= 0) {
    return null;
  }

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={minimapWidth}
        height={minimapHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={isDragging ? 'cursor-grabbing' : 'cursor-pointer'}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
