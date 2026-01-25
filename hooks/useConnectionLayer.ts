import { useCallback, useRef } from 'react';
import { CARD_DIMENSIONS } from '@/board/boardUtils';

export type ConnectionPair = {
  from: string;
  to: string;
  color: string;
  groupIndex?: number;
  offsetIndex?: number;
  totalConnections?: number;
  isAIGenerated?: boolean;
};

export function useConnectionLayer(params: {
  positions: Record<string, { x: number; y: number }>;
  positionsRef: React.MutableRefObject<Record<string, { x: number; y: number }>>;
  dragPositionRef: React.MutableRefObject<Record<string, { x: number; y: number }>>;
  cardSize: 's' | 'm' | 'l';
  connectionPairsArrayRef: React.MutableRefObject<ConnectionPair[]>;
}) {
  const { positions, positionsRef, dragPositionRef, cardSize, connectionPairsArrayRef } = params;

  // 연결선 path 요소들의 DOM 참조 (드래그 중 실시간 업데이트용)
  const connectionPathRefs = useRef<Map<string, SVGPathElement>>(new Map());

  // 라이브 좌표 헬퍼: 드래그 중이면 dragPositionRef에서, 아니면 positions에서 가져오기
  const getLivePos = useCallback(
    (id: string): { x: number; y: number } | undefined => {
      // 드래그 중이면 dragPositionRef에서, 아니면 positions state에서
      if (dragPositionRef.current[id]) {
        return dragPositionRef.current[id];
      }
      // positions state는 항상 최신이므로 positionsRef와 동기화되어 있음
      return positionsRef.current[id] ?? positions[id];
    },
    [dragPositionRef, positionsRef, positions]
  );

  // 연결선 path 업데이트 함수 (드래그 중 실시간 업데이트용)
  const updateConnectionPaths = useCallback(
    (affectedIds?: Set<string>) => {
      const pairs = connectionPairsArrayRef.current;
      if (!pairs.length || connectionPathRefs.current.size === 0) return;

      const draggedIds = affectedIds ?? new Set(Object.keys(dragPositionRef.current));
      if (draggedIds.size === 0) return; // 드래그 중인 카드가 없으면 스킵

      const escapeForSelector = (value: string) => {
        const cssEscape = (globalThis as any).CSS?.escape as ((v: string) => string) | undefined;
        return cssEscape ? cssEscape(value) : value.replace(/"/g, '\\"');
      };

      const getPathElement = (pathKey: string) => {
        const existing = connectionPathRefs.current.get(pathKey);
        if (existing && existing.isConnected) return existing;
        if (existing && !existing.isConnected) {
          connectionPathRefs.current.delete(pathKey);
        }
        const selector = `path[data-connection-key="${escapeForSelector(pathKey)}"]`;
        const queried = document.querySelector(selector) as SVGPathElement | null;
        if (queried) {
          connectionPathRefs.current.set(pathKey, queried);
        }
        return queried;
      };

      pairs.forEach((pair: { from: string; to: string; color: string; offsetIndex?: number; totalConnections?: number }) => {
        const isFromDragged = draggedIds.has(pair.from);
        const isToDragged = draggedIds.has(pair.to);
        if (!isFromDragged && !isToDragged) return; // 둘 다 드래그 중이 아니면 스킵

        const pathKey = `${pair.from}-${pair.to}-${pair.offsetIndex || 0}`;
        let pathElement = getPathElement(pathKey);
        if (!pathElement) {
          const reversedKey = `${pair.to}-${pair.from}-${pair.offsetIndex || 0}`;
          pathElement = getPathElement(reversedKey);
        }
        if (!pathElement) return;

        // 라이브 좌표 가져오기
        const fromPos = getLivePos(pair.from);
        const toPos = getLivePos(pair.to);
        if (!fromPos || !toPos) return;

        // 연결선 좌표 계산 (기존 로직과 동일)
        const fromX = fromPos.x + CARD_DIMENSIONS[cardSize].centerX;
        const fromY = fromPos.y + CARD_DIMENSIONS[cardSize].centerY;
        const toX = toPos.x + CARD_DIMENSIONS[cardSize].centerX;
        const toY = toPos.y + CARD_DIMENSIONS[cardSize].centerY;

        const offsetIndex = pair.offsetIndex || 0;
        const totalConnections = pair.totalConnections || 1;
        const lineOffset = totalConnections > 1 ? (offsetIndex - (totalConnections - 1) / 2) * 12 : 0;

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

        // path d 속성 직접 업데이트
        pathElement.setAttribute('d', `M ${adjustedFromX} ${adjustedFromY} Q ${cx} ${cy} ${adjustedToX} ${adjustedToY}`);
      });
    },
    [cardSize, connectionPairsArrayRef, connectionPathRefs, dragPositionRef, getLivePos]
  );

  return { connectionPathRefs, getLivePos, updateConnectionPaths };
}
