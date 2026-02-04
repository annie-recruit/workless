'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Memory, CanvasBlock } from '@/types';
import { CARD_DIMENSIONS } from '@/board/boardUtils';

interface MinimapProps {
  positions: Record<string, { x: number; y: number }>;
  blocks: CanvasBlock[];
  memories: Memory[];
  connectionPairs?: { from: string; to: string; color: string; offsetIndex: number }[];
  viewportBounds: { left: number; top: number; width: number; height: number };
  zoom: number;
  cardColorMap: Record<string, 'green' | 'pink' | 'purple'>;
  // 화이트보드 전체 크기 (보드 좌표계)
  boardSize: { width: number; height: number };
  containerWidth?: number; // 위젯 블록 내부에서 사용할 때 컨테이너 너비
  containerHeight?: number; // 위젯 블록 내부에서 사용할 때 컨테이너 높이
  cardSize?: 's' | 'm' | 'l'; // 카드 크기
  blobAreas?: Array<{ // 실제 보드의 blobAreas 정보
    id: string;
    memoryIds: string[];
    color: string;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
  }>;
}

// localStorage 키
const MINIMAP_POSITION_KEY = 'workless-minimap-position';

// 원본 카드 색상 매핑 - 모두 연한 회색으로 통일
const CARD_COLORS = {
  green: { bg: '#F9FAFB', border: '#D1D5DB', dot: '#9CA3AF' }, // gray 계열
  pink: { bg: '#F9FAFB', border: '#D1D5DB', dot: '#9CA3AF' }, // gray 계열
  purple: { bg: '#F9FAFB', border: '#D1D5DB', dot: '#9CA3AF' }, // gray 계열
} as const;

const MINIMAP_WIDTH = 220; // 미니맵 가로 폭 고정 (위젯 모드가 아닐 때)
const CONTENT_PADDING = 80; // 콘텐츠 주변 최소 여백

export default function Minimap({
  positions,
  blocks,
  memories,
  connectionPairs,
  viewportBounds,
  zoom,
  cardColorMap,
  boardSize,
  containerWidth,
  containerHeight,
  cardSize = 'm',
  blobAreas
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 위젯 모드 여부 확인
  const isWidgetMode = containerWidth !== undefined && containerHeight !== undefined;
  const minimapWidth = isWidgetMode ? containerWidth : MINIMAP_WIDTH;

  // 드래그 상태 및 위치
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ right: number; bottom: number }>({ right: 24, bottom: 24 });
  const dragStartRef = useRef<{ x: number; y: number; startRight: number; startBottom: number } | null>(null);

  // localStorage에서 위치 복원
  useEffect(() => {
    if (isWidgetMode) return; // 위젯 모드에서는 드래그 불가

    try {
      const saved = localStorage.getItem(MINIMAP_POSITION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPosition(parsed);
      }
    } catch (e) {
      console.error('Failed to load minimap position:', e);
    }
  }, [isWidgetMode]);

  // 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isWidgetMode) return; // 위젯 모드에서는 드래그 불가

    // 캔버스나 내부 요소를 클릭한 경우에만 드래그 시작
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startRight: position.right,
      startBottom: position.bottom,
    };
  };

  useEffect(() => {
    if (!isDragging || isWidgetMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;

      const deltaX = dragStartRef.current.x - e.clientX; // 오른쪽 기준이므로 반대
      const deltaY = dragStartRef.current.y - e.clientY; // 아래쪽 기준이므로 반대

      const newRight = Math.max(0, Math.min(window.innerWidth - minimapWidth, dragStartRef.current.startRight + deltaX));
      const newBottom = Math.max(0, Math.min(window.innerHeight - (bounds.h || 200), dragStartRef.current.startBottom + deltaY));

      setPosition({ right: newRight, bottom: newBottom });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;

      // localStorage에 위치 저장
      try {
        localStorage.setItem(MINIMAP_POSITION_KEY, JSON.stringify(position));
      } catch (e) {
        console.error('Failed to save minimap position:', e);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position, minimapWidth, isWidgetMode]);

  // 카드 크기 정보
  const cardDims = CARD_DIMENSIONS[cardSize];

  // 1. 실제 메모리 데이터 기반으로 실시간 연결 쌍(Pairs) 추출
  // connectionPairs가 제공되면 사용하고, 없으면 내부에서 계산
  const realConnections = useMemo(() => {
    if (connectionPairs) {
      // connectionPairs가 제공되면 그것을 사용 (from, to만 추출)
      return connectionPairs
        .filter(pair => positions[pair.from] && positions[pair.to])
        .map(pair => ({ from: pair.from, to: pair.to }));
    }

    // 기존 로직: 메모리 데이터에서 연결 추출
    const pairs: { from: string; to: string }[] = [];
    const visited = new Set<string>();

    memories.forEach(m => {
      m.relatedMemoryIds?.forEach(targetId => {
        const pairKey = [m.id, targetId].sort().join('-');
        if (!visited.has(pairKey) && positions[m.id] && positions[targetId]) {
          pairs.push({ from: m.id, to: targetId });
          visited.add(pairKey);
        }
      });
    });
    return pairs;
  }, [memories, positions, connectionPairs]);

  // 2. 연결 그룹 분석 (blobAreas가 제공되면 사용, 없으면 내부 계산)
  const connectedGroups = useMemo(() => {
    // blobAreas가 제공되면 그것을 사용
    if (blobAreas && blobAreas.length > 0) {
      return blobAreas.map(blob => blob.memoryIds);
    }

    // 기존 로직: 연결 기반 그룹 계산
    const adj = new Map<string, string[]>();
    realConnections.forEach(({ from, to }) => {
      if (!adj.has(from)) adj.set(from, []);
      if (!adj.has(to)) adj.set(to, []);
      adj.get(from)!.push(to);
      adj.get(to)!.push(from);
    });

    const groups: string[][] = [];
    const visited = new Set<string>();
    Object.keys(positions).forEach(id => {
      if (!visited.has(id)) {
        const group: string[] = [];
        const queue = [id];
        visited.add(id);
        while (queue.length > 0) {
          const curr = queue.shift()!;
          group.push(curr);
          (adj.get(curr) || []).forEach(next => {
            if (!visited.has(next)) {
              visited.add(next);
              queue.push(next);
            }
          });
        }
        if (group.length >= 3) groups.push(group);
      }
    });
    return groups;
  }, [realConnections, positions, blobAreas]);

  // 연결 그룹별 색상 매핑 (connectionPairs의 색상 사용)
  const groupColors = useMemo(() => {
    const colorMap = new Map<string, string>();
    if (connectionPairs) {
      connectionPairs.forEach(pair => {
        const key1 = `${pair.from}-${pair.to}`;
        const key2 = `${pair.to}-${pair.from}`;
        colorMap.set(key1, pair.color);
        colorMap.set(key2, pair.color);
      });
    }
    return colorMap;
  }, [connectionPairs]);

  // 1. 실제 콘텐츠 기준 Bounding Box & 창 크기 계산
  const bounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasContent = false;

    // 실제로 화면에 보이는 요소들만 대상으로 범위 계산
    const visibleIds = new Set([
      ...memories.map(m => m.id),
      ...blocks.map(b => b.id)
    ]);

    Object.entries(positions).forEach(([id, pos]) => {
      if (!visibleIds.has(id)) return;
      hasContent = true;

      const block = blocks.find(b => b.id === id);
      let width: number = cardDims.width;
      let height: number = cardDims.height;

      if (block) {
        if (block.type === 'calendar') {
          width = block.width || 350;
          height = block.height || 240;
        } else if (block.type === 'viewer' || block.type === 'meeting-recorder' || block.type === 'database') {
          width = block.width || 420;
          height = block.height || 320;
        } else {
          width = block.width || 350;
          height = block.height || 300;
        }
      }

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + width);
      maxY = Math.max(maxY, pos.y + height);
    });

    // 콘텐츠가 없으면 기본 보드 크기 사용
    if (!hasContent) {
      minX = 0;
      minY = 0;
      maxX = boardSize.width;
      maxY = boardSize.height;
    }

    // 여유 패딩 (충분히 주어서 시야 박스가 움직여도 지도가 너무 자주 변하지 않게 함)
    const padding = 200;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentW = maxX - minX;
    const contentH = maxY - minY;

    const scale = isWidgetMode && containerWidth && containerHeight
      ? Math.min(containerWidth / contentW, containerHeight / contentH)
      : minimapWidth / contentW;

    return {
      minX,
      minY,
      scale,
      h: isWidgetMode ? containerHeight : contentH * scale,
      contentW,
      contentH
    };
  }, [positions, blocks, memories, cardDims, boardSize, containerWidth, containerHeight, minimapWidth, isWidgetMode]);

  // 4. 캔버스 렌더링 (배경, 블롭, 연결선)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 픽셀아트 효과를 위해 anti-aliasing 끄기
    ctx.imageSmoothingEnabled = false;

    // 배경 그리기
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 블롭 그리기 - 연결된 메모리카드가 모여있는 영역을 블롭으로 처리 (각 점이 아니라 영역)
    if (blobAreas && blobAreas.length > 0) {
      // 실제 보드의 blobAreas 사용 (각 그룹의 영역을 하나의 블롭으로)
      blobAreas.forEach(blob => {
        const { bounds: blobBounds, color: blobColor } = blob;

        // 블롭 bounds를 미니맵 좌표로 변환
        const minX = (blobBounds.minX - bounds.minX) * bounds.scale;
        const minY = (blobBounds.minY - bounds.minY) * bounds.scale;
        const maxX = (blobBounds.maxX - bounds.minX) * bounds.scale;
        const maxY = (blobBounds.maxY - bounds.minY) * bounds.scale;

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const radiusX = (maxX - minX) / 2;
        const radiusY = (maxY - minY) / 2;
        const radius = Math.max(radiusX, radiusY);

        // 그라데이션 블롭 (영역 전체를 하나의 블롭으로) - 더 진하게
        const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        grad.addColorStop(0, `${blobColor}80`);
        grad.addColorStop(0.5, `${blobColor}50`);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (connectedGroups.length > 0) {
      // blobAreas가 없으면 연결 그룹의 bounds를 계산해서 영역으로 그리기
      connectedGroups.forEach((group) => {
        // 그룹의 첫 번째 연결에서 색상 가져오기
        let groupColor = '#A5B4FC'; // 기본 색상
        if (group.length >= 2 && connectionPairs) {
          const firstId = group[0];
          const secondId = group[1];
          const foundPair = connectionPairs.find(p =>
            (p.from === firstId && p.to === secondId) ||
            (p.from === secondId && p.to === firstId)
          );
          if (foundPair) groupColor = foundPair.color;
        }

        // 그룹의 전체 bounds 계산 (각 점이 아니라 영역)
        const groupPositions = group
          .map(id => {
            const pos = positions[id];
            if (!pos) return null;

            const block = blocks.find(b => b.id === id);
            if (block) {
              let blockWidth = block.width || 350;
              let blockHeight = block.height || 300;

              if (block.type === 'calendar') {
                blockWidth = block.width || 350;
                blockHeight = block.height || 240;
              } else if (block.type === 'viewer' || block.type === 'meeting-recorder' || block.type === 'database') {
                blockWidth = block.width || 420;
                blockHeight = block.height || 320;
              }

              return {
                minX: pos.x,
                minY: pos.y,
                maxX: pos.x + blockWidth,
                maxY: pos.y + blockHeight,
              };
            } else {
              return {
                minX: pos.x,
                minY: pos.y,
                maxX: pos.x + cardDims.width,
                maxY: pos.y + cardDims.height,
              };
            }
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);

        if (groupPositions.length === 0) return;

        // 그룹의 전체 bounding box 계산
        const padding = 40;
        const groupMinX = Math.min(...groupPositions.map(p => p.minX)) - padding;
        const groupMinY = Math.min(...groupPositions.map(p => p.minY)) - padding;
        const groupMaxX = Math.max(...groupPositions.map(p => p.maxX)) + padding;
        const groupMaxY = Math.max(...groupPositions.map(p => p.maxY)) + padding;

        // 미니맵 좌표로 변환
        const minX = (groupMinX - bounds.minX) * bounds.scale;
        const minY = (groupMinY - bounds.minY) * bounds.scale;
        const maxX = (groupMaxX - bounds.minX) * bounds.scale;
        const maxY = (groupMaxY - bounds.minY) * bounds.scale;

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const radiusX = (maxX - minX) / 2;
        const radiusY = (maxY - minY) / 2;
        const radius = Math.max(radiusX, radiusY);

        // 그룹 전체를 하나의 블롭으로 그리기 - 더 진하게
        const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        grad.addColorStop(0, `${groupColor}80`);
        grad.addColorStop(0.5, `${groupColor}50`);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 연결선 그리기 - 픽셀아트 스타일
    if (connectionPairs) {
      // 같은 연결 쌍 그룹화 (병렬 연결선 처리)
      const pairMap = new Map<string, typeof connectionPairs>();
      connectionPairs.forEach(pair => {
        const key = [pair.from, pair.to].sort().join(':');
        if (!pairMap.has(key)) pairMap.set(key, []);
        pairMap.get(key)!.push(pair);
      });

      // 노드 중심점 계산 헬퍼 함수
      const getNodeCenter = (id: string, pos: { x: number; y: number }) => {
        const block = blocks.find(b => b.id === id);
        if (block) {
          let blockWidth = block.width || 350;
          let blockHeight = block.height || 300;

          if (block.type === 'calendar') {
            blockWidth = block.width || 350;
            blockHeight = block.height || 240;
          } else if (block.type === 'viewer' || block.type === 'meeting-recorder' || block.type === 'database') {
            blockWidth = block.width || 420;
            blockHeight = block.height || 320;
          }

          return {
            x: (pos.x + blockWidth / 2 - bounds.minX) * bounds.scale,
            y: (pos.y + blockHeight / 2 - bounds.minY) * bounds.scale,
          };
        } else {
          return {
            x: (pos.x + cardDims.width / 2 - bounds.minX) * bounds.scale,
            y: (pos.y + cardDims.height / 2 - bounds.minY) * bounds.scale,
          };
        }
      };

      // 픽셀 계단식 선 그리기 함수
      const drawPixelLine = (x1: number, y1: number, x2: number, y2: number, color: string, lineWidth: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';

        const dx = x2 - x1;
        const dy = y2 - y1;

        // 픽셀 계단 효과: 수평 우선 → 수직 → 수평 (3단계)
        ctx.beginPath();
        ctx.moveTo(Math.round(x1), Math.round(y1));

        // 1단계: 수평으로 1/3 이동
        const midX1 = Math.round(x1 + dx / 3);
        ctx.lineTo(midX1, Math.round(y1));

        // 2단계: 수직으로 전체 이동
        ctx.lineTo(midX1, Math.round(y2));

        // 3단계: 수평으로 나머지 이동
        ctx.lineTo(Math.round(x2), Math.round(y2));

        ctx.stroke();
      };

      pairMap.forEach((pairs, key) => {
        const totalConnections = pairs.length;
        pairs.forEach((pair, idx) => {
          const p1 = positions[pair.from];
          const p2 = positions[pair.to];
          if (!p1 || !p2) return;

          const fromCenter = getNodeCenter(pair.from, p1);
          const toCenter = getNodeCenter(pair.to, p2);
          const fromX = fromCenter.x;
          const fromY = fromCenter.y;
          const toX = toCenter.x;
          const toY = toCenter.y;

          // 오프셋 적용 (병렬 연결선) - 더 넓게
          const dx = toX - fromX;
          const dy = toY - fromY;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) return;

          const perpX = -dy / len;
          const perpY = dx / len;
          const offset = (idx - (totalConnections - 1) / 2) * 5 * bounds.scale; // 3 -> 5로 증가

          const offsetFromX = fromX + perpX * offset;
          const offsetFromY = fromY + perpY * offset;
          const offsetToX = toX + perpX * offset;
          const offsetToY = toY + perpY * offset;

          // 픽셀 계단식 연결선 그리기 (더 굵게, 최소 두께 보장)
          const lineWidth = Math.max(2, 3 * bounds.scale); // 최소 2px 보장
          drawPixelLine(offsetFromX, offsetFromY, offsetToX, offsetToY, pair.color || '#C4B5FD', lineWidth);
        });
      });
    } else {
      // connectionPairs가 없을 때 기본 연결선 - 픽셀 스타일
      const lineWidth = Math.max(2, 3 * bounds.scale); // 최소 2px 보장

      const drawPixelLine = (x1: number, y1: number, x2: number, y2: number) => {
        ctx.strokeStyle = '#94A3B8'; // 더 진한 회색으로 변경
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';

        const dx = x2 - x1;
        const dy = y2 - y1;

        ctx.beginPath();
        ctx.moveTo(Math.round(x1), Math.round(y1));

        // 픽셀 계단 효과: 수평 → 수직 → 수평
        const midX1 = Math.round(x1 + dx / 3);
        ctx.lineTo(midX1, Math.round(y1));
        ctx.lineTo(midX1, Math.round(y2));
        ctx.lineTo(Math.round(x2), Math.round(y2));

        ctx.stroke();
      };

      realConnections.forEach(({ from, to }) => {
        const p1 = positions[from];
        const p2 = positions[to];
        if (!p1 || !p2) return;

        const block1 = blocks.find(b => b.id === from);
        const block2 = blocks.find(b => b.id === to);
        const fromX = block1
          ? (p1.x + (block1.width || 350) / 2 - bounds.minX) * bounds.scale
          : (p1.x + cardDims.width / 2 - bounds.minX) * bounds.scale;
        const fromY = block1
          ? (p1.y + (block1.height || 300) / 2 - bounds.minY) * bounds.scale
          : (p1.y + cardDims.height / 2 - bounds.minY) * bounds.scale;
        const toX = block2
          ? (p2.x + (block2.width || 350) / 2 - bounds.minX) * bounds.scale
          : (p2.x + cardDims.width / 2 - bounds.minX) * bounds.scale;
        const toY = block2
          ? (p2.y + (block2.height || 300) / 2 - bounds.minY) * bounds.scale
          : (p2.y + cardDims.height / 2 - bounds.minY) * bounds.scale;

        drawPixelLine(fromX, fromY, toX, toY);
      });
    }
  }, [connectedGroups, bounds, positions, realConnections, cardColorMap, connectionPairs, cardDims, blocks, blobAreas]);

  return (
    <div
      ref={containerRef}
      onMouseDown={isWidgetMode ? undefined : handleMouseDown}
      className={isWidgetMode ? "relative w-full h-full bg-white overflow-hidden" : "fixed bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden"}
      style={{
        width: isWidgetMode ? '100%' : minimapWidth,
        height: isWidgetMode ? '100%' : bounds.h,
        transition: isDragging ? 'none' : (isWidgetMode ? 'none' : 'height 0.3s ease'),
        cursor: isWidgetMode ? 'default' : (isDragging ? 'grabbing' : 'grab'),
        right: isWidgetMode ? undefined : `${position.right}px`,
        bottom: isWidgetMode ? undefined : `${position.bottom}px`,
        userSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        width={minimapWidth}
        height={bounds.h}
        className="absolute inset-0"
      />

      {/* 노드 점 (원본 색상과 크기 반영) - 실제 렌더링되는 메모리/블록만 표시 */}
      {Object.entries(positions)
        .filter(([id]) => {
          // blocks에 있거나 memories에 있는 항목만 표시
          const block = blocks.find(b => b.id === id);
          const memory = memories.find(m => m.id === id);
          return block || memory;
        })
        .map(([id, pos]) => {
          const block = blocks.find(b => b.id === id);
          const isBlock = !!block;

          let colors;
          let centerX, centerY;

          if (isBlock && block) {
            // 블록 타입별 색상
            const blockColors = {
              viewer: { dot: '#A78BFA', border: '#C4B5FD', bg: '#F5F3FF' },
              calendar: { dot: '#60A5FA', border: '#93C5FD', bg: '#DBEAFE' },
              database: { dot: '#34D399', border: '#6EE7B7', bg: '#D1FAE5' },
              'meeting-recorder': { dot: '#F472B6', border: '#F9A8D4', bg: '#FCE7F3' },
              default: { dot: '#94A3B8', border: '#CBD5E1', bg: '#F1F5F9' },
            };
            colors = blockColors[block.type as keyof typeof blockColors] || blockColors.default;

            // 블록의 경우 - 이제 점이 아니라 실제 영역을 보여줍니다 (위치 동기화용)
            let blockWidth = block.width || 350;
            let blockHeight = block.height || 300;

            if (block.type === 'calendar') {
              blockWidth = block.width || 350;
              blockHeight = block.height || 240;
            } else if (block.type === 'viewer' || block.type === 'meeting-recorder' || block.type === 'database') {
              blockWidth = block.width || 420;
              blockHeight = block.height || 320;
            }

            const drawWidth = blockWidth * bounds.scale;
            const drawHeight = blockHeight * bounds.scale;
            const left = (pos.x - bounds.minX) * bounds.scale;
            const top = (pos.y - bounds.minY) * bounds.scale;

            return (
              <div
                key={id}
                className="absolute select-none pointer-events-none"
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${drawWidth}px`,
                  height: `${drawHeight}px`,
                  backgroundColor: `${colors.dot}15`, // 훨씬 더 연하게 변경
                  border: `${Math.max(1, 1.5 * bounds.scale)}px solid ${colors.border}`,
                  borderRadius: '1px',
                }}
              >
                {/* 중심점 표시 */}
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: `${Math.max(3, 5 * bounds.scale)}px`,
                    height: `${Math.max(3, 5 * bounds.scale)}px`,
                    backgroundColor: colors.dot,
                  }}
                />
              </div>
            );
          } else {
            // 메모리 카드의 경우 - 깔끔하게 점(Dot)으로 원복
            const colorType = cardColorMap[id] || 'purple';
            colors = CARD_COLORS[colorType];

            // 현재 화면에 보이는 카드는 파란색으로 강조
            const isInViewport = viewportBounds.width > 0 && viewportBounds.height > 0 &&
              pos.x >= viewportBounds.left &&
              pos.x + cardDims.width <= viewportBounds.left + viewportBounds.width &&
              pos.y >= viewportBounds.top &&
              pos.y + cardDims.height <= viewportBounds.top + viewportBounds.height;

            if (isInViewport) {
              colors = { dot: '#3B82F6', border: '#2563EB', bg: '#DBEAFE' };
            }

            // 카드의 정중앙 위치 계산
            const centerX = (pos.x + cardDims.width / 2 - bounds.minX) * bounds.scale;
            const centerY = (pos.y + cardDims.height / 2 - bounds.minY) * bounds.scale;
            const dotSize = Math.max(4, 8 * bounds.scale);

            return (
              <div
                key={id}
                className="absolute -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none rounded-full"
                style={{
                  left: `${centerX}px`,
                  top: `${centerY}px`,
                  width: `${dotSize}px`,
                  height: `${dotSize}px`,
                  backgroundColor: colors.dot,
                  border: `${Math.max(1, 1.5 * bounds.scale)}px solid ${colors.border}`,
                }}
              />
            );
          }
        })}

      {/* 뷰포트 네비게이팅 박스 */}
      {viewportBounds.width > 0 && viewportBounds.height > 0 && (() => {
        // viewportBounds는 보드 좌표계에서의 위치
        // bounds.minX/minY는 패딩을 포함한 값이므로, 다른 모든 요소들과 동일하게 변환
        // (pos.x - bounds.minX) * scale 패턴을 사용
        const viewportLeft = (viewportBounds.left - bounds.minX) * bounds.scale;
        const viewportTop = (viewportBounds.top - bounds.minY) * bounds.scale;
        const viewportWidth = viewportBounds.width * bounds.scale;
        const viewportHeight = viewportBounds.height * bounds.scale;

        const maxWidth = isWidgetMode && containerWidth ? containerWidth : minimapWidth;
        const maxHeight = bounds.h;

        // 뷰포트 박스가 미니맵 경계를 벗어나더라도 크기와 위치를 유지하도록 clamping 제거
        // overflow-hidden 처리된 컨테이너가 자연스럽게 잘래내도록 함
        const finalLeft = viewportLeft;
        const finalTop = viewportTop;
        const finalWidth = viewportWidth;
        const finalHeight = viewportHeight;

        // 디버깅 로그
        if (process.env.NODE_ENV === 'development') {
          // positions의 실제 범위 계산 (blocks 포함)
          let actualMinX = Infinity, actualMinY = Infinity, actualMaxX = -Infinity, actualMaxY = -Infinity;
          Object.entries(positions).forEach(([id, pos]) => {
            const block = blocks.find(b => b.id === id);
            if (block) {
              const blockWidth = block.width || 350;
              const blockHeight = block.height || 300;
              actualMinX = Math.min(actualMinX, pos.x);
              actualMinY = Math.min(actualMinY, pos.y);
              actualMaxX = Math.max(actualMaxX, pos.x + blockWidth);
              actualMaxY = Math.max(actualMaxY, pos.y + blockHeight);
            } else {
              actualMinX = Math.min(actualMinX, pos.x);
              actualMinY = Math.min(actualMinY, pos.y);
              actualMaxX = Math.max(actualMaxX, pos.x + cardDims.width);
              actualMaxY = Math.max(actualMaxY, pos.y + cardDims.height);
            }
          });

          console.log('[Minimap viewportBounds] 렌더링:', {
            viewportBounds,
            bounds,
            scale: bounds.scale,
            '계산 전': {
              viewportLeft,
              viewportTop,
              viewportWidth,
              viewportHeight,
            },
            '계산 후': {
              finalLeft,
              finalTop,
              finalWidth,
              finalHeight,
            },
            maxWidth,
            maxHeight,
            isWidgetMode,
            containerWidth,
            containerHeight,
            // 실제 콘텐츠 범위 (패딩 제외)
            actualContentRange: {
              minX: actualMinX,
              minY: actualMinY,
              maxX: actualMaxX,
              maxY: actualMaxY,
            },
            // bounds 범위 (패딩 포함)
            boundsRange: {
              minX: bounds.minX,
              minY: bounds.minY,
              maxX: bounds.minX + (isWidgetMode && containerWidth ? containerWidth / bounds.scale : minimapWidth / bounds.scale),
              maxY: bounds.minY + bounds.h / bounds.scale,
            },
            // 뷰포트 박스가 실제 콘텐츠와 일치하는지 확인
            // viewportBounds.left가 0이면 실제 콘텐츠 시작 위치(actualMinX)를 가리켜야 함
            // 따라서 expected 위치는 (actualMinX - bounds.minX) * scale
            viewportMatchesContent: {
              viewportLeftMatches: Math.abs(viewportLeft - (actualMinX - bounds.minX) * bounds.scale) < 1,
              viewportTopMatches: Math.abs(viewportTop - (actualMinY - bounds.minY) * bounds.scale) < 1,
              expectedLeft: (actualMinX - bounds.minX) * bounds.scale,
              expectedTop: (actualMinY - bounds.minY) * bounds.scale,
              actualLeft: viewportLeft,
              actualTop: viewportTop,
              // 추가 정보: 계산 상세
              calculation: {
                viewportBoundsLeft: viewportBounds.left,
                viewportBoundsTop: viewportBounds.top,
                boundsMinX: bounds.minX,
                boundsMinY: bounds.minY,
                actualMinX,
                actualMinY,
                scale: bounds.scale,
                calculatedLeft: (viewportBounds.left - bounds.minX) * bounds.scale,
                calculatedTop: (viewportBounds.top - bounds.minY) * bounds.scale,
              },
            },
          });
        }

        return (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-10"
            style={{
              left: `${finalLeft}px`,
              top: `${finalTop}px`,
              width: `${finalWidth}px`,
              height: `${finalHeight}px`,
            }}
          />
        );
      })()}
    </div>
  );
}