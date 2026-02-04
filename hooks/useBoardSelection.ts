import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { Memory, CanvasBlock } from '@/types';
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
        // localMemories might be undefined in some edge cases
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

        // Blocks selection
        const newSelectedBlocks = new Set<string>();
        // blocks might be undefined initially
        (blocks || []).forEach((block) => {
          const blockLeft = block.x;
          const blockRight = block.x + (block.width || 400); // Default width fallback
          const blockTop = block.y;
          const blockBottom = block.y + (block.height || 300); // Default height fallback

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
