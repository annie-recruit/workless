import { ActionProject } from '@/types';
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
  projects?: ActionProject[];
}) {
  const { positions, positionsRef, dragPositionRef, cardSize, connectionPairsArrayRef, projects } = params;

  // 연결선 path 및 label 요소들의 DOM 참조 (드래그 중 실시간 업데이트용)
  const connectionPathRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const connectionLabelRefs = useRef<Map<string, SVGTextElement>>(new Map());

  // 라이브 좌표 헬퍼: 드래그 중이면 dragPositionRef에서, 아니면 positions에서 가져오기
  const getLivePos = useCallback(
    (id: string): { x: number; y: number } | undefined => {
      // 드래그 중이면 dragPositionRef에서 (메모리, 블록, 프로젝트 등 공통)
      if (dragPositionRef.current[id]) {
        return dragPositionRef.current[id];
      }

      // positions state/ref에서 (메모리 카드 고정 위치)
      const memPos = positionsRef.current[id] ?? positions[id];
      if (memPos) return memPos;

      // projects에서 (액션 프로젝트 카드 고정 위치)
      const project = projects?.find(p => p.id === id);
      if (project) return { x: project.x, y: project.y };

      return undefined;
    },
    [dragPositionRef, positionsRef, positions, projects]
  );

  // 연결선 path/label 업데이트 함수 (드래그 중 실시간 업데이트용)
  const updateConnectionPaths = useCallback(
    (affectedIds?: Set<string>) => {
      const pairs = connectionPairsArrayRef.current;
      if (!pairs.length) return;

      const draggedIds = affectedIds ?? new Set(Object.keys(dragPositionRef.current));

      const escapeForSelector = (value: string) => {
        const cssEscape = (globalThis as any).CSS?.escape as ((v: string) => string) | undefined;
        return cssEscape ? cssEscape(value) : value.replace(/"/g, '\\"');
      };

      const getPathElement = (pathKey: string) => {
        const existing = connectionPathRefs.current.get(pathKey);
        if (existing && existing.isConnected) return existing;
        const selector = `path[data-connection-key="${escapeForSelector(pathKey)}"]`;
        const queried = document.querySelector(selector) as SVGPathElement | null;
        if (queried) connectionPathRefs.current.set(pathKey, queried);
        return queried;
      };

      const getLabelElement = (pathKey: string) => {
        const existing = connectionLabelRefs.current.get(pathKey);
        if (existing && existing.isConnected) return existing;
        const selector = `text[data-connection-label-key="${escapeForSelector(pathKey)}"]`;
        const queried = document.querySelector(selector) as SVGTextElement | null;
        if (queried) connectionLabelRefs.current.set(pathKey, queried);
        return queried;
      };

      pairs.forEach((pair: ConnectionPair) => {
        const isFromDragged = draggedIds.size === 0 || draggedIds.has(pair.from);
        const isToDragged = draggedIds.size === 0 || draggedIds.has(pair.to);
        if (!isFromDragged && !isToDragged) return;

        const pathKey = `${pair.from}-${pair.to}-${pair.offsetIndex || 0}`;
        const pathElement = getPathElement(pathKey);
        const labelElement = getLabelElement(pathKey);

        if (!pathElement && !labelElement) return;

        const fromPos = getLivePos(pair.from);
        const toPos = getLivePos(pair.to);
        if (!fromPos || !toPos) return;

        // 엔티티 타입별 중심점 계산
        const getDimensions = (id: string) => {
          const project = projects?.find(p => p.id === id);
          if (project) return { centerX: 180, centerY: 60 };
          return CARD_DIMENSIONS[cardSize];
        };

        const fromDim = getDimensions(pair.from);
        const toDim = getDimensions(pair.to);

        const fromX = fromPos.x + fromDim.centerX;
        const fromY = fromPos.y + fromDim.centerY;
        const toX = toPos.x + toDim.centerX;
        const toY = toPos.y + toDim.centerY;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const px = -dy / len;
        const py = dx / len;

        const offsetIndex = pair.offsetIndex || 0;
        const totalConnections = pair.totalConnections || 1;
        const lineOffset = totalConnections > 1 ? (offsetIndex - (totalConnections - 1) / 2) * 12 : 0;

        const adjustedFromX = fromX + px * lineOffset;
        const adjustedFromY = fromY + py * lineOffset;
        const adjustedToX = toX + px * lineOffset;
        const adjustedToY = toY + py * lineOffset;

        const midX = (adjustedFromX + adjustedToX) / 2;
        const midY = (adjustedFromY + adjustedToY) / 2;

        const curveOffset = Math.min(80, len * 0.25);
        const cx = midX - (dy / len) * curveOffset;
        const cy = midY + (dx / len) * curveOffset;

        if (pathElement) {
          pathElement.setAttribute('d', `M ${adjustedFromX} ${adjustedFromY} Q ${cx} ${cy} ${adjustedToX} ${adjustedToY}`);
        }

        if (labelElement) {
          labelElement.setAttribute('x', String(cx));
          labelElement.setAttribute('y', String(cy - 6));
        }
      });
    },
    [cardSize, connectionPairsArrayRef, connectionPathRefs, connectionLabelRefs, dragPositionRef, getLivePos, projects]
  );

  return { connectionPathRefs, connectionLabelRefs, getLivePos, updateConnectionPaths };
}
