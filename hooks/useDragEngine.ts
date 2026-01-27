import { useEffect, type RefObject } from 'react';
import { ActionProject, CanvasBlock, Memory } from '@/types';

export type DraggableEntity = { type: 'memory'; id: string } | { type: 'block'; id: string } | { type: 'project'; id: string };

export function useDragEngine(params: {
  draggingEntity: DraggableEntity | null;
  boardRef: RefObject<HTMLDivElement | null>;
  boardContainerRef: RefObject<HTMLDivElement | null>;
  zoomRef: RefObject<number>;
  dragOffset: { x: number; y: number };
  blocks: CanvasBlock[];
  localMemories: Memory[];
  localProjects: ActionProject[];
  positionsRef: React.MutableRefObject<Record<string, { x: number; y: number }>>;
  dragStartPositionsRef: React.MutableRefObject<Record<string, { x: number; y: number }>>;
  selectedMemoryIdsRef: React.MutableRefObject<Set<string>>;
  draggedElementsRef: React.MutableRefObject<Map<string, HTMLElement>>;
  rafIdRef: React.MutableRefObject<number | null>;
  dragPositionRef: React.MutableRefObject<Record<string, { x: number; y: number }>>;
  ensureBoardBounds: (x: number, y: number) => void;
  handleBlockUpdate: (blockId: string, updates: Partial<CanvasBlock>) => void;
  setBlocks: React.Dispatch<React.SetStateAction<CanvasBlock[]>>;
  setPositions: React.Dispatch<React.SetStateAction<Record<string, { x: number; y: number }>>>;
  setLocalProjects: React.Dispatch<React.SetStateAction<ActionProject[]>>;
  setDraggingEntity: React.Dispatch<React.SetStateAction<DraggableEntity | null>>;
  isSelecting: boolean;
  setIsSelecting: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectionBox: React.Dispatch<
    React.SetStateAction<{ startX: number; startY: number; endX: number; endY: number } | null>
  >;
  updateConnectionPaths: (affectedIds?: Set<string>) => void;
  pixelLayerRef: React.RefObject<{ redraw: () => void } | null>;
}) {
  const {
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
  } = params;

  useEffect(() => {
    if (!draggingEntity || !boardRef.current) {
      return;
    }

    const collectDraggedElements = () => {
      draggedElementsRef.current.clear();
      dragPositionRef.current = {};

      if (draggingEntity.type === 'block') {
        const wrapperElement = document.querySelector(
          `[data-block-id="${draggingEntity.id}"]`
        ) as HTMLElement;
        if (wrapperElement) {
          const childWithTransform = Array.from(wrapperElement.children).find((el) => {
            const element = el as HTMLElement;
            return typeof element.style.transform === 'string' && element.style.transform.length > 0;
          }) as HTMLElement | undefined;

          const blockElement = childWithTransform || wrapperElement;
          if (blockElement) {
            draggedElementsRef.current.set(draggingEntity.id, blockElement);
            const block = blocks.find((b) => b.id === draggingEntity.id);
            if (block) {
              dragPositionRef.current[draggingEntity.id] = { x: block.x, y: block.y };
            }
          }
        }
      } else if (draggingEntity.type === 'project') {
        const projectElement = document.querySelector(`[data-project-card="${draggingEntity.id}"]`) as HTMLElement;
        if (projectElement) {
          draggedElementsRef.current.set(draggingEntity.id, projectElement);
          const project = localProjects.find((p) => p.id === draggingEntity.id);
          if (project) {
            dragPositionRef.current[draggingEntity.id] = { x: project.x, y: project.y };
          }
        }
      } else {
        const currentSelectedIds = selectedMemoryIdsRef.current;
        const idsToDrag =
          currentSelectedIds.has(draggingEntity.id) && currentSelectedIds.size > 1
            ? Array.from(currentSelectedIds)
            : [draggingEntity.id];

        idsToDrag.forEach((id) => {
          const cardElement = document.querySelector(`[data-memory-card="${id}"]`) as HTMLElement;
          if (cardElement) {
            draggedElementsRef.current.set(id, cardElement);
            const currentPositions = positionsRef.current;
            const currentDragStartPositions = dragStartPositionsRef.current;
            dragPositionRef.current[id] =
              currentDragStartPositions[id] || currentPositions[id] || { x: 0, y: 0 };
          }
        });
      }
    };

    collectDraggedElements();

    const handleMove = (event: PointerEvent) => {
      if (!boardRef.current || !draggingEntity) return;

      event.preventDefault();

      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);

      rafIdRef.current = requestAnimationFrame(() => {
        const rect = boardRef.current!.getBoundingClientRect();
        const scale = zoomRef.current;
        const mouseX = (event.clientX - rect.left) / scale;
        const mouseY = (event.clientY - rect.top) / scale;

        if (draggingEntity.type === 'block') {
          const newX = Math.max(0, mouseX - dragOffset.x);
          const newY = Math.max(0, mouseY - dragOffset.y);
          const element = draggedElementsRef.current.get(draggingEntity.id);
          if (element) {
            element.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
            dragPositionRef.current[draggingEntity.id] = { x: newX, y: newY };
            updateConnectionPaths(new Set([draggingEntity.id]));
          }
        } else if (draggingEntity.type === 'project') {
          const newX = Math.max(0, mouseX - dragOffset.x);
          const newY = Math.max(0, mouseY - dragOffset.y);
          const element = draggedElementsRef.current.get(draggingEntity.id);
          if (element) {
            element.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
            dragPositionRef.current[draggingEntity.id] = { x: newX, y: newY };
            updateConnectionPaths(new Set([draggingEntity.id]));
          }
        } else {
          const newX = Math.max(0, mouseX - dragOffset.x);
          const newY = Math.max(0, mouseY - dragOffset.y);
          const currentSelectedIds = selectedMemoryIdsRef.current;
          const affectedIds = new Set<string>();

          if (currentSelectedIds.has(draggingEntity.id) && currentSelectedIds.size > 1) {
            const currentDragStartPositions = dragStartPositionsRef.current;
            const startPos = currentDragStartPositions[draggingEntity.id] || dragPositionRef.current[draggingEntity.id] || { x: 0, y: 0 };
            const deltaX = newX - startPos.x;
            const deltaY = newY - startPos.y;

            currentSelectedIds.forEach((id) => {
              const element = draggedElementsRef.current.get(id);
              if (element) {
                const startPosForCard = currentDragStartPositions[id] || dragPositionRef.current[id] || { x: 0, y: 0 };
                const cardX = Math.max(0, startPosForCard.x + deltaX);
                const cardY = Math.max(0, startPosForCard.y + deltaY);
                element.style.transform = `translate3d(${cardX}px, ${cardY}px, 0)`;
                dragPositionRef.current[id] = { x: cardX, y: cardY };
                affectedIds.add(id);
              }
            });
          } else {
            const element = draggedElementsRef.current.get(draggingEntity.id);
            if (element) {
              element.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
              dragPositionRef.current[draggingEntity.id] = { x: newX, y: newY };
              affectedIds.add(draggingEntity.id);
            }
          }
          ensureBoardBounds(newX, newY);
          if (affectedIds.size > 0) updateConnectionPaths(affectedIds);
        }

        pixelLayerRef.current?.redraw();
        rafIdRef.current = null;
      });
    };

    const handleUp = (event?: PointerEvent) => {
      if (event?.target) {
        try { (event.target as HTMLElement).releasePointerCapture?.(event.pointerId); } catch { /* ignore */ }
      }
      if (!draggingEntity || !boardRef.current) return;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (draggingEntity.type === 'block') {
        const finalPos = dragPositionRef.current[draggingEntity.id];
        if (finalPos) {
          const block = blocks.find((b) => b.id === draggingEntity.id);
          if (block) {
            // 드래그 중에 설정된 인라인 transform 스타일 제거
            const element = draggedElementsRef.current.get(draggingEntity.id);
            if (element) {
              element.style.transform = '';
            }
            
            setBlocks((prev) => {
              const updated = [...prev];
              const index = updated.findIndex((b) => b.id === draggingEntity.id);
              if (index !== -1) updated[index] = { ...block, x: finalPos.x, y: finalPos.y };
              return updated;
            });
            handleBlockUpdate(draggingEntity.id, { x: finalPos.x, y: finalPos.y });
          }
        }
      } else if (draggingEntity.type === 'project') {
        const finalPos = dragPositionRef.current[draggingEntity.id];
        if (finalPos) {
          setLocalProjects((prev) => {
            const updated = [...prev];
            const index = updated.findIndex((p) => p.id === draggingEntity.id);
            if (index !== -1) {
              updated[index] = { ...updated[index], x: finalPos.x, y: finalPos.y };
              fetch('/api/projects', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: draggingEntity.id, x: finalPos.x, y: finalPos.y }),
              }).catch(err => console.error(err));
            }
            return updated;
          });
        }
      } else {
        const currentSelectedIds = selectedMemoryIdsRef.current;
        const idsToCommit = currentSelectedIds.has(draggingEntity.id) && currentSelectedIds.size > 1
          ? Array.from(currentSelectedIds)
          : [draggingEntity.id];

        const finalPositionsMap = { ...dragPositionRef.current };
        setPositions((prev) => {
          const next = { ...prev };
          idsToCommit.forEach((id) => {
            const finalPos = finalPositionsMap[id];
            if (finalPos) next[id] = finalPos;
          });
          return next;
        });
      }

      draggedElementsRef.current.clear();
      dragPositionRef.current = {};
      setDraggingEntity(null);
      if (isSelecting) { setIsSelecting(false); setSelectionBox(null); }
      pixelLayerRef.current?.redraw();
      updateConnectionPaths();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [draggingEntity, dragOffset, blocks, localMemories, localProjects, updateConnectionPaths, pixelLayerRef]);
}
