'use client';

import { useEffect, useMemo, useCallback, useState, useRef, useLayoutEffect } from 'react';
import { Memory, CanvasBlock } from '@/types';

interface BlobArea {
  id: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  color?: string;
  points?: Array<{ x: number; y: number }>;
}

interface ConnectionPair {
  from: string;
  to: string;
  points?: Array<{ x: number; y: number }>;
  color?: string;
}

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
  blobAreas?: BlobArea[];
  connectionPairs?: ConnectionPair[];
  headerHeight?: number;
}

const CARD_DIMENSIONS = {
  s: { width: 200, height: 160 },
  m: { width: 240, height: 180 },
  l: { width: 280, height: 200 },
} as const;

const WIDGET_EMOJI_MAP: Record<string, string> = {
  viewer: '📺',
  calendar: '📅',
  memory: '📝',
  memo: '📝',
  default: '📌',
};

const MIN_EMOJI_SIZE = 10;
const MAX_EMOJI_SIZE = 18;
const EMOJI_SIZE_RATIO = 0.45;

// 화면에서 아이콘 간격을 조금 압축(더 근접하게 보이도록)
const DISPLAY_COMPRESSION = 0.78;

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

function parseHexColor(hex = '#DDEBF7') {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2) || 'DD', 16);
  const g = parseInt(h.slice(2, 4) || 'EB', 16);
  const b = parseInt(h.slice(4, 6) || 'F7', 16);
  return { r, g, b };
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
  blobAreas = [],
  connectionPairs = [],
  headerHeight: propHeaderHeight,
}: MinimapProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const maxContainerWidth = 720;
  const maxContainerHeight = 560;
  const contentPadding = 10;
  const localHeaderHeight = propHeaderHeight ?? 36;

  // 부모(블록 / modal) 실제 사용 가능한 영역 측정 — 이걸로 스케일과 컨테이너 크기 결정
  const [measured, setMeasured] = useState({ w: maxContainerWidth, h: maxContainerHeight });
  const [parentIsPositioned, setParentIsPositioned] = useState(true);
  useLayoutEffect(() => {
    const el = containerRef.current?.parentElement ?? containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setMeasured({ w: Math.max(220, Math.floor(r.width)), h: Math.max(140, Math.floor(r.height)) });
      const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : null;
      setParentIsPositioned(!!style && style.position !== 'static');
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  // 1) content bounds in board coordinates (memories, blocks, blobs)
  const canvasBounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    memories.forEach(memory => {
      const pos = positions[memory.id];
      if (pos) {
        const dims = CARD_DIMENSIONS[cardSize];
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + dims.width);
        maxY = Math.max(maxY, pos.y + dims.height);
      }
    });

    blocks.forEach(block => {
      if (typeof block.x === 'number' && typeof block.y === 'number') {
        const w = block.width ?? 350;
        const h = block.height ?? 200;
        minX = Math.min(minX, block.x);
        minY = Math.min(minY, block.y);
        maxX = Math.max(maxX, block.x + w);
        maxY = Math.max(maxY, block.y + h);
      }
    });

    if (Array.isArray(blobAreas)) {
      blobAreas.forEach(blob => {
        if (!blob?.bounds) return;
        minX = Math.min(minX, blob.bounds.minX);
        minY = Math.min(minY, blob.bounds.minY);
        maxX = Math.max(maxX, blob.bounds.maxX);
        maxY = Math.max(maxY, blob.bounds.maxY);
      });
    }

    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
      return { minX: 0, minY: 0, width: boardSize.width, height: boardSize.height };
    }

    const width = maxX - minX;
    const height = maxY - minY;
    return {
      minX: minX - contentPadding,
      minY: minY - contentPadding,
      width: width + contentPadding * 2,
      height: height + contentPadding * 2,
    };
  }, [memories, positions, blocks, blobAreas, boardSize, cardSize]);

  // 2) compute scale to fit content into measured parent area
  const baseScale = useMemo(() => {
    if (canvasBounds.width <= 0 || canvasBounds.height <= 0) return 0;
    // available space inside parent (reserve small frame)
    const availW = Math.max(120, Math.min(measured.w - 24, maxContainerWidth));
    const availH = Math.max(100, Math.min(measured.h - localHeaderHeight - 24, maxContainerHeight));
    return Math.min(availW / canvasBounds.width, availH / canvasBounds.height);
  }, [canvasBounds, measured, localHeaderHeight]);

  if (baseScale <= 0) return null;

  // displayScale compresses distances slightly to make icons closer (cute)
  const displayScale = baseScale * DISPLAY_COMPRESSION;

  // 3) board pixel dims (visual)
  const boardPixelWidth = canvasBounds.width * displayScale;
  const boardPixelHeight = canvasBounds.height * displayScale;

  // container dims: ensure it fits inside measured parent and global max.
  const framePaddingHorizontal = 16; // small frame so content doesn't touch edges
  const framePaddingVertical = 16;
  let containerWidth = Math.min(Math.ceil(boardPixelWidth + framePaddingHorizontal), measured.w - 12, maxContainerWidth);
  let containerHeight = Math.min(Math.ceil(localHeaderHeight + boardPixelHeight + framePaddingVertical), measured.h - 12, maxContainerHeight);

  // Center the board area inside container (gives small frame margin)
  const offsetX = Math.round(Math.max(8, (containerWidth - boardPixelWidth) / 2));
  const offsetY = Math.round(localHeaderHeight + Math.max(6, (containerHeight - localHeaderHeight - boardPixelHeight) / 2));

  // transforms
  const transformToMinimap = useCallback(
    (x: number, y: number) => ({
      x: offsetX + (x - canvasBounds.minX) * displayScale,
      y: offsetY + (y - canvasBounds.minY) * displayScale,
    }),
    [offsetX, offsetY, canvasBounds.minX, displayScale]
  );

  const transformFromMinimap = useCallback(
    (mx: number, my: number) => ({
      x: (mx - offsetX) / displayScale + canvasBounds.minX,
      y: (my - offsetY) / displayScale + canvasBounds.minY,
    }),
    [offsetX, offsetY, canvasBounds.minX, displayScale]
  );

  // 4) symbol items
  const symbolItems = useMemo(() => {
    const items: SymbolItem[] = [];

    memories.forEach(memory => {
      const pos = positions[memory.id];
      if (!pos) return;
      const dims = CARD_DIMENSIONS[cardSize];
      const scaledW = dims.width * displayScale;
      const scaledH = dims.height * displayScale;
      const widgetSize = Math.min(scaledW, scaledH);
      const size = Math.max(MIN_EMOJI_SIZE, Math.min(MAX_EMOJI_SIZE, widgetSize * EMOJI_SIZE_RATIO));
      const { x, y } = transformToMinimap(pos.x, pos.y);

      items.push({
        id: `memory-${memory.id}`,
        type: 'memory',
        emoji: WIDGET_EMOJI_MAP.memory,
        x: x + scaledW / 2 - size / 2,
        y: y + scaledH / 2 - size / 2,
        size,
        originalX: pos.x,
        originalY: pos.y,
        originalWidth: dims.width,
        originalHeight: dims.height,
      });
    });

    blocks.forEach(block => {
      if (block.type === 'minimap') return;
      if (typeof block.x !== 'number' || typeof block.y !== 'number') return;
      const w = block.width ?? 350;
      const h = block.height ?? 200;
      const scaledW = w * displayScale;
      const scaledH = h * displayScale;
      const widgetSize = Math.min(scaledW, scaledH);
      const size = Math.max(MIN_EMOJI_SIZE, Math.min(MAX_EMOJI_SIZE, widgetSize * EMOJI_SIZE_RATIO));
      const { x, y } = transformToMinimap(block.x, block.y);

      items.push({
        id: `block-${block.id}`,
        type: 'block',
        emoji: WIDGET_EMOJI_MAP[block.type] || WIDGET_EMOJI_MAP.default,
        x: x + scaledW / 2 - size / 2,
        y: y + scaledH / 2 - size / 2,
        size,
        originalX: block.x,
        originalY: block.y,
        originalWidth: w,
        originalHeight: h,
      });
    });

    return items;
  }, [memories, positions, blocks, cardSize, displayScale, transformToMinimap]);

  // 5) viewport rect
  const viewportRect = useMemo(() => {
    if (!viewportBounds || viewportBounds.width <= 0 || viewportBounds.height <= 0) return null;
    const { x, y } = transformToMinimap(viewportBounds.left, viewportBounds.top);
    return { x, y, width: viewportBounds.width * displayScale, height: viewportBounds.height * displayScale };
  }, [viewportBounds, displayScale, transformToMinimap]);

  // helper
  const findSymbolByRef = useCallback(
    (ref?: string) => {
      if (!ref) return undefined;
      let found = symbolItems.find(it => it.id === ref);
      if (found) return found;
      const raw = ref.replace(/^memory-/, '').replace(/^block-/, '');
      found = symbolItems.find(it => it.id === `memory-${raw}`) || symbolItems.find(it => it.id === `block-${raw}`);
      return found;
    },
    [symbolItems]
  );

  // 6) draw on canvas (blobs then connections). Increased center intensity and halo.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || displayScale <= 0) return;

    const cssW = Math.max(1, Math.ceil(boardPixelWidth));
    const cssH = Math.max(1, Math.ceil(boardPixelHeight));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * (window.devicePixelRatio || 1));
    canvas.height = Math.round(cssH * (window.devicePixelRatio || 1));
    const dpr = window.devicePixelRatio || 1;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // blobs
    if (Array.isArray(blobAreas) && blobAreas.length > 0) {
      blobAreas.forEach(blob => {
        if (!blob?.bounds) return;

        const minMapped = transformToMinimap(blob.bounds.minX, blob.bounds.minY);
        const maxMapped = transformToMinimap(blob.bounds.maxX, blob.bounds.maxY);

        const x = minMapped.x - offsetX;
        const y = minMapped.y - offsetY;
        const width = Math.max(12, maxMapped.x - minMapped.x);
        const height = Math.max(12, maxMapped.y - minMapped.y);
        const cx = x + width / 2;
        const cy = y + height / 2;
        const rx = Math.max(8, width / 2);
        const ry = Math.max(8, height / 2);

        const color = blob.color || '#DDEBF7';
        const { r, g, b } = parseHexColor(color);

        // halo (soft blurred larger ellipse)
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 1.5, ry * 1.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.16)`;
        // soft blur using shadow trick + globalAlpha fallback
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.20)`;
        ctx.shadowBlur = Math.max(8, Math.round(18 * (1 / DISPLAY_COMPRESSION)));
        ctx.fill();
        ctx.restore();

        // main radial gradient (stronger center)
        const grad = ctx.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.05, cx, cy, Math.max(rx, ry));
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.92)`);
        grad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.46)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.12)`);

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });
    }

    // connections (over blobs)
    if (Array.isArray(connectionPairs) && connectionPairs.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      connectionPairs.forEach(pair => {
        let strokeColor = 'rgba(99,102,241,0.5)';
        if ((pair as any).color) strokeColor = (pair as any).color;

        if (pair.points && pair.points.length >= 2) {
          const mapped = pair.points.map(p => {
            const m = transformToMinimap(p.x, p.y);
            return { x: m.x - offsetX, y: m.y - offsetY };
          });
          ctx.beginPath();
          ctx.moveTo(mapped[0].x, mapped[0].y);
          for (let i = 1; i < mapped.length; i++) ctx.lineTo(mapped[i].x, mapped[i].y);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = Math.max(1, 1.2 * displayScale);
          ctx.globalAlpha = 0.9;
          ctx.stroke();
          return;
        }

        const fromSym = findSymbolByRef(pair.from);
        const toSym = findSymbolByRef(pair.to);
        if (!fromSym || !toSym) return;

        const fx = fromSym.x + fromSym.size / 2 - offsetX;
        const fy = fromSym.y + fromSym.size / 2 - offsetY;
        const tx = toSym.x + toSym.size / 2 - offsetX;
        const ty = toSym.y + toSym.size / 2 - offsetY;

        const dx = tx - fx;
        const dy = ty - fy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 2) return;

        // cute curve: control point offset perpendicular to the line,
        // scaled by distance and a small easing factor so short lines curve less.
        const normX = dx / dist;
        const normY = dy / dist;
        const perpX = -normY;
        const perpY = normX;
        const offsetFactor = Math.min(0.36, 0.18 + Math.min(1, dist / 200) * 0.24); // adapt to distance
        const curvature = dist * offsetFactor;
        const midX = (fx + tx) / 2 + perpX * curvature;
        const midY = (fy + ty) / 2 + perpY * curvature * 0.85;

        ctx.beginPath();
        ctx.moveTo(fx, fy);
        // use quadratic curve for smoothness
        ctx.quadraticCurveTo(midX, midY, tx, ty);

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(1, 1.4 * displayScale);
        ctx.globalAlpha = 0.95;
        ctx.stroke();

        // small subtle dot at midpoint (cute)
        ctx.beginPath();
        ctx.fillStyle = strokeColor;
        ctx.globalAlpha = 0.85;
        ctx.arc(midX, midY, Math.max(0.8, 1.6 * displayScale), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }, [
    canvasRef,
    blobAreas,
    connectionPairs,
    transformToMinimap,
    findSymbolByRef,
    offsetX,
    offsetY,
    boardPixelWidth,
    boardPixelHeight,
    displayScale,
  ]);

  // handlers (pan-to / drag)
  const handleBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      if (mouseY < localHeaderHeight) return;
      if (viewportRect) {
        const isInViewport = mouseX >= viewportRect.x && mouseX <= viewportRect.x + viewportRect.width && mouseY >= viewportRect.y && mouseY <= viewportRect.y + viewportRect.height;
        if (isInViewport && boardContainerRef.current) {
          setIsDragging(true);
          dragStartRef.current = { x: mouseX, y: mouseY };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }
      const boardCoord = transformFromMinimap(mouseX, mouseY);
      if (!boardContainerRef.current) return;
      const left = Math.max(0, Math.min(boardCoord.x * zoom - boardContainerRef.current.clientWidth / 2, boardSize.width * zoom - boardContainerRef.current.clientWidth));
      const top = Math.max(0, Math.min(boardCoord.y * zoom - boardContainerRef.current.clientHeight / 2, boardSize.height * zoom - boardContainerRef.current.clientHeight));
      boardContainerRef.current.scrollTo({ left, top, behavior: 'smooth' });
    },
    [viewportRect, boardContainerRef, transformFromMinimap, zoom, boardSize, localHeaderHeight]
  );

  const handleBackgroundPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStartRef.current || !boardContainerRef.current || !viewportRect) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const deltaX = (mouseX - dragStartRef.current.x) / displayScale;
      const deltaY = (mouseY - dragStartRef.current.y) / displayScale;
      const curLeft = boardContainerRef.current.scrollLeft;
      const curTop = boardContainerRef.current.scrollTop;
      const newLeft = Math.max(0, Math.min(curLeft + deltaX * zoom, boardSize.width * zoom - boardContainerRef.current.clientWidth));
      const newTop = Math.max(0, Math.min(curTop + deltaY * zoom, boardSize.height * zoom - boardContainerRef.current.clientHeight));
      boardContainerRef.current.scrollTo({ left: newLeft, top: newTop, behavior: 'auto' });
      dragStartRef.current = { x: mouseX, y: mouseY };
    },
    [isDragging, displayScale, zoom, boardSize, viewportRect, boardContainerRef]
  );

  const handleBackgroundPointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleSymbolClick = useCallback(
    (item: SymbolItem) => {
      if (!boardContainerRef.current) return;
      const targetX = item.originalX + item.originalWidth / 2;
      const targetY = item.originalY + item.originalHeight / 2;
      const left = Math.max(0, Math.min(targetX * zoom - boardContainerRef.current.clientWidth / 2, boardSize.width * zoom - boardContainerRef.current.clientWidth));
      const top = Math.max(0, Math.min(targetY * zoom - boardContainerRef.current.clientHeight / 2, boardSize.height * zoom - boardContainerRef.current.clientHeight));
      boardContainerRef.current.scrollTo({ left, top, behavior: 'smooth' });
    },
    [boardContainerRef, zoom, boardSize]
  );

  if (boardSize.width <= 0 || boardSize.height <= 0 || displayScale <= 0) return null;

  const containerAbsoluteStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    top: `${Math.max(8, 12)}px`,
    width: `${containerWidth}px`,
    height: `${containerHeight}px`,
    zIndex: 999,
    cursor: isDragging ? 'grabbing' : 'pointer',
  };

  const containerBlockStyle: React.CSSProperties = {
    width: `${containerWidth}px`,
    height: `${containerHeight}px`,
    margin: '12px auto',
    cursor: isDragging ? 'grabbing' : 'pointer',
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-gray-50 rounded-lg overflow-hidden shadow-sm"
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerUp}
      onPointerCancel={handleBackgroundPointerUp}
      style={parentIsPositioned ? containerAbsoluteStyle : containerBlockStyle}
    >
      {/* header spacer (title handled outside) */}
      <div style={{ height: `${localHeaderHeight}px` }} />

      {/* board background */}
      <div
        className="absolute bg-white border border-gray-200 rounded"
        style={{
          left: `${offsetX}px`,
          top: `${offsetY}px`,
          width: `${Math.ceil(boardPixelWidth)}px`,
          height: `${Math.ceil(boardPixelHeight)}px`,
          boxSizing: 'border-box',
          zIndex: 1,
        }}
      />

      {/* canvas draws blobs + connections */}
      <canvas
        ref={canvasRef}
        className="absolute pointer-events-none"
        style={{
          left: `${offsetX}px`,
          top: `${offsetY}px`,
          width: `${Math.ceil(boardPixelWidth)}px`,
          height: `${Math.ceil(boardPixelHeight)}px`,
          zIndex: 5,
        }}
      />

      {/* symbols (emojis) with subtle 3D / embossed appearance */}
      {symbolItems.map(item => {
        // emoji background subtle radial, text-shadow layers for depth
        const bgSize = Math.max(18, item.size + 6);
        const bgGrad = `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.85), rgba(255,255,255,0.5) 20%, rgba(0,0,0,0.02) 80%)`;
        const shadow = `${item.size * 0.05}px ${item.size * 0.08}px ${Math.max(2, item.size * 0.25)}px rgba(0,0,0,0.12)`;
        return (
          <div
            key={item.id}
            className="absolute flex items-center justify-center select-none"
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              width: `${bgSize}px`,
              height: `${bgSize}px`,
              fontSize: `${item.size}px`,
              lineHeight: `${item.size}px`,
              transform: hoveredItem === item.id ? 'scale(1.28)' : 'scale(1)',
              zIndex: hoveredItem === item.id ? 30 : 20,
              cursor: 'pointer',
              transition: 'transform 140ms',
              borderRadius: '999px',
              background: bgGrad,
              boxShadow: shadow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // small inner uplift to make it feel '3D'
              transformOrigin: 'center center',
            }}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={e => {
              e.stopPropagation();
              handleSymbolClick(item);
            }}
            title={`${item.type === 'memory' ? 'Memory' : 'Block'}: ${item.id}`}
          >
            <span
              style={{
                display: 'inline-block',
                transform: 'translateY(-2%)',
                // multi-layer text shadows for embossed look
                textShadow: `0 0 0 rgba(0,0,0,0), 0 1px 0 rgba(255,255,255,0.6), 0 3px 6px rgba(0,0,0,0.12)`,
                filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.6))',
                lineHeight: 1,
              }}
            >
              {item.emoji}
            </span>
          </div>
        );
      })}

      {/* viewport overlay */}
      {viewportRect && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${viewportRect.x}px`,
            top: `${viewportRect.y}px`,
            width: `${viewportRect.width}px`,
            height: `${viewportRect.height}px`,
            border: '2px solid rgba(37,99,235,0.7)',
            background: 'rgba(59,130,246,0.06)',
            borderRadius: '8px',
            zIndex: 40,
          }}
        />
      )}
    </div>
  );
}