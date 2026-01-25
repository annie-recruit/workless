import { useEffect, type RefObject } from 'react';
import type { CanvasBlock, Memory } from '@/types';

export type DraggableEntity = { type: 'memory'; id: string } | { type: 'block'; id: string };

export function useDragEngine(params: {
  draggingEntity: DraggableEntity | null;
  boardRef: RefObject<HTMLDivElement | null>;
  boardContainerRef: RefObject<HTMLDivElement | null>;
  zoomRef: RefObject<number>;
  dragOffset: { x: number; y: number };
  blocks: CanvasBlock[];
  localMemories: Memory[];
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
  setDraggingEntity: React.Dispatch<React.SetStateAction<DraggableEntity | null>>;
  isSelecting: boolean;
  setIsSelecting: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectionBox: React.Dispatch<
    React.SetStateAction<{ startX: number; startY: number; endX: number; endY: number } | null>
  >;
  updateConnectionPaths: (affectedIds?: Set<string>) => void;
}) {
  const {
    draggingEntity,
    boardRef,
    boardContainerRef,
    zoomRef,
    dragOffset,
    blocks,
    localMemories,
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
    setDraggingEntity,
    isSelecting,
    setIsSelecting,
    setSelectionBox,
    updateConnectionPaths,
  } = params;

  // 고성능 드래그 엔진: DOM 직접 조작으로 React 리렌더링 제거
  useEffect(() => {
    if (!draggingEntity || !boardRef.current) {
      return;
    }

    // 드래그 시작 시 DOM 요소들 수집
    const collectDraggedElements = () => {
      draggedElementsRef.current.clear();
      dragPositionRef.current = {};

      if (draggingEntity.type === 'block') {
        // 블록 요소 찾기: data-block-id가 있는 요소 또는 그 내부의 transform을 사용하는 요소
        const wrapperElement = document.querySelector(
          `[data-block-id="${draggingEntity.id}"]`
        ) as HTMLElement;
        if (wrapperElement) {
          // 블록 컴포넌트 내부의 실제 transform 요소 찾기 (직계 자식 중 transform이 있는 요소 우선)
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
      } else {
        // 메모리 카드 요소들 찾기
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

    let lastFrameTime = performance.now();
    const handleMove = (event: PointerEvent) => {
      if (!boardRef.current || !draggingEntity) return;

      // 스크롤 방지
      event.preventDefault();

      // RAF로 부드러운 업데이트 (Display Refresh Rate에 동기화 - 120Hz 지원)
      // const now = performance.now();
      // if (now - lastFrameTime < 16) return; // 60fps 제한 제거
      // lastFrameTime = now;

      // 기존 RAF 취소
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        const rect = boardRef.current!.getBoundingClientRect();
        const scale = zoomRef.current;
        const mouseX = (event.clientX - rect.left) / scale;
        const mouseY = (event.clientY - rect.top) / scale;

        if (draggingEntity.type === 'block') {
          // 블록 드래그: DOM 직접 업데이트
          const newX = Math.max(0, mouseX - dragOffset.x);
          const newY = Math.max(0, mouseY - dragOffset.y);

          const element = draggedElementsRef.current.get(draggingEntity.id);
          if (element) {
            element.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
            dragPositionRef.current[draggingEntity.id] = { x: newX, y: newY };
          }
        } else {
          // 메모리 카드 드래그: DOM 직접 업데이트
          const newX = Math.max(0, mouseX - dragOffset.x);
          const newY = Math.max(0, mouseY - dragOffset.y);
          const currentSelectedIds = selectedMemoryIdsRef.current;
          const affectedIds = new Set<string>();

          if (currentSelectedIds.has(draggingEntity.id) && currentSelectedIds.size > 1) {
            // 다중 선택: 델타 계산 후 모든 카드 이동
            const currentDragStartPositions = dragStartPositionsRef.current;
            const startPos =
              currentDragStartPositions[draggingEntity.id] ||
              dragPositionRef.current[draggingEntity.id] ||
              { x: 0, y: 0 };
            const deltaX = newX - startPos.x;
            const deltaY = newY - startPos.y;

            currentSelectedIds.forEach((id) => {
              const element = draggedElementsRef.current.get(id);
              if (element) {
                const startPosForCard =
                  currentDragStartPositions[id] || dragPositionRef.current[id] || { x: 0, y: 0 };
                const cardX = Math.max(0, startPosForCard.x + deltaX);
                const cardY = Math.max(0, startPosForCard.y + deltaY);
                element.style.transform = `translate3d(${cardX}px, ${cardY}px, 0)`;
                dragPositionRef.current[id] = { x: cardX, y: cardY };
                affectedIds.add(id);
              }
            });
          } else {
            // 단일 카드: DOM 직접 업데이트
            const element = draggedElementsRef.current.get(draggingEntity.id);
            if (element) {
              element.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
              dragPositionRef.current[draggingEntity.id] = { x: newX, y: newY };
              affectedIds.add(draggingEntity.id);
            }
          }

          // 메모리 카드 드래그의 경우 보드 경계 확인
          ensureBoardBounds(newX, newY);

          // 연결선은 React 리렌더 없이 SVG path를 직접 업데이트
          if (affectedIds.size > 0) {
            updateConnectionPaths(affectedIds);
          }
        }

        rafIdRef.current = null;
      });
    };

    const handleUp = (event?: PointerEvent) => {
      // Pointer capture 해제
      if (event && event.target) {
        try {
          (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
        } catch {
          // ignore
        }
      }

      if (!draggingEntity || !boardRef.current) {
        return;
      }

      // RAF 완료 대기 (마지막 업데이트가 반영되도록)
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // 드래그 종료 시: dragPositionRef에서 최종 위치 읽기 (DOM에 실제로 적용된 위치)
      if (draggingEntity.type === 'block') {
        const finalPos = dragPositionRef.current[draggingEntity.id];
        if (finalPos) {
          const block = blocks.find((b) => b.id === draggingEntity.id);
          if (block) {
            // 미니맵 블록은 화면 밖으로 튀지 않도록 추가 보정
            if (block.type === 'minimap') {
              const containerRect = boardContainerRef.current?.getBoundingClientRect();
              const boardRect = boardRef.current?.getBoundingClientRect();
              const minimapWidth = block.width || 240;
              const minimapHeight = block.height || 180;
              const scale = zoomRef.current || 1;

              const clampRange = (value: number, min: number, max: number) =>
                min <= max ? Math.max(min, Math.min(max, value)) : value;

              if (containerRect && boardRect) {
                const margin = 10 / scale;
                const viewportMinX = (containerRect.left - boardRect.left) / scale + margin;
                const viewportMinY = (containerRect.top - boardRect.top) / scale + margin;
                const viewportMaxX = (containerRect.right - boardRect.left) / scale - minimapWidth - margin;
                const viewportMaxY = (containerRect.bottom - boardRect.top) / scale - minimapHeight - margin;

                finalPos.x = clampRange(finalPos.x, viewportMinX, viewportMaxX);
                finalPos.y = clampRange(finalPos.y, viewportMinY, viewportMaxY);
              } else {
                finalPos.x = Math.max(0, finalPos.x);
                finalPos.y = Math.max(0, finalPos.y);
              }
            }

            // 위치가 실제로 변경되었을 때만 업데이트
            if (Math.abs(block.x - finalPos.x) > 0.01 || Math.abs(block.y - finalPos.y) > 0.01) {
              setBlocks((prev) => {
                const updated = [...prev];
                const index = updated.findIndex((b) => b.id === draggingEntity.id);
                if (index !== -1) {
                  updated[index] = { ...block, x: finalPos.x, y: finalPos.y };
                }
                return updated;
              });
              // 즉시 저장
              handleBlockUpdate(draggingEntity.id, { x: finalPos.x, y: finalPos.y });
            }
          }
        }
      } else {
        // 메모리 카드: 드래그된 모든 카드의 최종 위치를 React state에 커밋
        const currentSelectedIds = selectedMemoryIdsRef.current;
        const idsToCommit =
          currentSelectedIds.has(draggingEntity.id) && currentSelectedIds.size > 1
            ? Array.from(currentSelectedIds)
            : [draggingEntity.id];

        // dragPositionRef에서 최종 위치 읽기
        setPositions((prev) => {
          const next = { ...prev };
          idsToCommit.forEach((id) => {
            const finalPos = dragPositionRef.current[id];
            if (finalPos) {
              next[id] = finalPos;
            }
          });
          return next;
        });
      }

      // 정리
      draggedElementsRef.current.clear();
      dragPositionRef.current = {};

      // 드래그 상태 해제
      setDraggingEntity(null);

      if (isSelecting) {
        setIsSelecting(false);
        setSelectionBox(null);
      }
    };

    const handlePointerCancel = (event?: PointerEvent) => {
      // Pointer capture 해제
      if (event && event.target) {
        try {
          (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
        } catch {
          // ignore
        }
      }
      handleUp(event);
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp, { passive: false });
    window.addEventListener('pointercancel', handlePointerCancel, { passive: false });

    return () => {
      // RAF 정리
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handlePointerCancel);

      // 드래그 종료 시 DOM 스타일 복원 (React state와 동기화)
      draggedElementsRef.current.forEach((element, id) => {
        if (draggingEntity?.type === 'block') {
          const block = blocks.find((b) => b.id === id);
          if (block) {
            element.style.transform = `translate3d(${block.x}px, ${block.y}px, 0)`;
          }
        } else {
          const pos = positionsRef.current[id];
          if (pos) {
            element.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
          }
        }
      });

      draggedElementsRef.current.clear();
      dragPositionRef.current = {};
      // 연결선 path ref는 유지 (컴포넌트 언마운트 시에만 정리)
    };
  }, [draggingEntity, dragOffset, blocks, localMemories, updateConnectionPaths]);
}
