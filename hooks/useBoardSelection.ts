import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { Memory, CanvasBlock, ActionProject } from '@/types';
import { CARD_DIMENSIONS } from '@/board/boardUtils';

export type SelectionBox = { startX: number; startY: number; endX: number; endY: number };

export function useBoardSelection(params: {
  isSelecting: boolean;
  selectionBox: SelectionBox | null;
  boardRef: RefObject<HTMLDivElement | null>;
  zoomRef: RefObject<number>;
  positionsRef: React.MutableRefObject<Record<string, { x: number; y: number }>>;
  selectedMemoryIdsRef: React.MutableRefObject<Set<string>>;
  selectedBlockIdsRef: React.MutableRefObject<Set<string>>;
  localMemories: Memory[];
  localProjects: ActionProject[];
  blocks: CanvasBlock[];
  cardSize: 's' | 'm' | 'l';
  setSelectionBox: React.Dispatch<React.SetStateAction<SelectionBox | null>>;
  setSelectedMemoryIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedBlockIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsSelecting: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    isSelecting,
    selectionBox,
    boardRef,
    zoomRef,
    positionsRef,
    selectedMemoryIdsRef,
    selectedBlockIdsRef,
    localMemories,
    localProjects,
    blocks,
    cardSize,
    setSelectionBox,
    setSelectedMemoryIds,
    setSelectedBlockIds,
    setIsSelecting,
  } = params;

  useEffect(() => {
    if (!isSelecting || !boardRef.current) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const scale = zoomRef.current || 1;
      const currentX = (e.clientX - rect.left) / scale;
      const currentY = (e.clientY - rect.top) / scale;

      setSelectionBox((prev) => {
        if (!prev) return null;

        const next = { ...prev, endX: currentX, endY: currentY };

        // Calculate collision with memories
        const boxLeft = Math.min(next.startX, next.endX);
        const boxRight = Math.max(next.startX, next.endX);
        const boxTop = Math.min(next.startY, next.endY);
        const boxBottom = Math.max(next.startY, next.endY);

        const currentPositions = positionsRef.current;
        const cardDims = CARD_DIMENSIONS[cardSize];

        // Memories selection
        const newSelectedMemories = new Set<string>();
        
        // 1. 일반 메모리 카드
        (localMemories || []).forEach((memory) => {
          const pos = currentPositions[memory.id];
          if (!pos) return;

          const cardLeft = pos.x;
          const cardRight = pos.x + cardDims.width;
          const cardTop = pos.y;
          const cardBottom = pos.y + cardDims.height;

          if (
            cardRight >= boxLeft &&
            cardLeft <= boxRight &&
            cardBottom >= boxTop &&
            cardTop <= boxBottom
          ) {
            newSelectedMemories.add(memory.id);
          }
        });

        // 2. 액션 프로젝트 카드
        (localProjects || []).forEach((project) => {
          const cardWidth = 480; // ActionProjectCard 고정 너비
          // 프로젝트 카드의 높이는 내용에 따라 가변적이지만, 대략적인 최소 높이 200px 사용
          const cardHeight = 300; 

          const cardLeft = project.x;
          const cardRight = project.x + cardWidth;
          const cardTop = project.y;
          const cardBottom = project.y + cardHeight;

          if (
            cardRight >= boxLeft &&
            cardLeft <= boxRight &&
            cardBottom >= boxTop &&
            cardTop <= boxBottom
          ) {
            newSelectedMemories.add(project.id);
          }
        });

        // Blocks (Widgets) selection
        const newSelectedBlocks = new Set<string>();
        (blocks || []).forEach((block) => {
          // 미니맵은 틀고정(Viewport coordinates)이므로 보드 좌표 기반 드래그 선택에서 제외
          if (block.type === 'minimap') return;

          // 각 위젯 타입별 실제 렌더링 크기 반영
          let width = block.width;
          let height = block.height;

          if (!width || !height) {
            if (block.type === 'calendar') {
              width = 245;
              height = 280;
            } else {
              width = 420;
              height = 320;
            }
          }

          const blockLeft = block.x;
          const blockRight = block.x + width;
          const blockTop = block.y;
          const blockBottom = block.y + height;

          if (
            blockRight >= boxLeft &&
            blockLeft <= boxRight &&
            blockBottom >= boxTop &&
            blockTop <= boxBottom
          ) {
            newSelectedBlocks.add(block.id);
          }
        });

        // Update selected memories
        const currentSelectedMemories = selectedMemoryIdsRef.current;
        let memoriesChanged = currentSelectedMemories.size !== newSelectedMemories.size;
        if (!memoriesChanged) {
          for (const id of newSelectedMemories) {
            if (!currentSelectedMemories.has(id)) {
              memoriesChanged = true;
              break;
            }
          }
        }

        if (memoriesChanged) {
          setSelectedMemoryIds(newSelectedMemories);
          selectedMemoryIdsRef.current = newSelectedMemories;
        }

        // Update selected blocks
        const currentSelectedBlocks = selectedBlockIdsRef.current;
        let blocksChanged = currentSelectedBlocks.size !== newSelectedBlocks.size;
        if (!blocksChanged) {
          for (const id of newSelectedBlocks) {
            if (!currentSelectedBlocks.has(id)) {
              blocksChanged = true;
              break;
            }
          }
        }

        if (blocksChanged) {
          setSelectedBlockIds(newSelectedBlocks);
          selectedBlockIdsRef.current = newSelectedBlocks;
        }

        return next;
      });
    };

    const handlePointerUp = () => {
      setIsSelecting(false);
      setSelectionBox(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    isSelecting,
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
  ]);
}
