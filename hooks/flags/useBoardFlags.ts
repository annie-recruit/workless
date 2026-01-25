import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ViewportBounds } from '@/hooks/board/useBoardCamera';
import { useFlagsStore } from '@/components/FlagContext';

type FlagsStore = ReturnType<typeof useFlagsStore>;

type BoardSize = { width: number; height: number };
type ZoomRef = RefObject<number>;

type CameraTarget = { x: number; y: number; zoom: number };

type UseBoardFlagsArgs = {
  storageKey: string;
  flagsStore: FlagsStore;
  boardRef: RefObject<HTMLDivElement | null>;
  zoomRef: ZoomRef;
  boardSize: BoardSize;
  viewportBounds: ViewportBounds;
  animateCameraTo: (target: CameraTarget) => void;
  onStartPlacingFlag?: () => void;
};

export function useBoardFlags({
  storageKey,
  flagsStore,
  boardRef,
  zoomRef,
  boardSize,
  viewportBounds,
  animateCameraTo,
  onStartPlacingFlag,
}: UseBoardFlagsArgs) {
  const flags = flagsStore.getFlags(storageKey);
  const selectedFlagId = flagsStore.getSelectedFlagId(storageKey);
  const hoveredFlagId = flagsStore.getHoveredFlagId(storageKey);

  const [isPlacingFlag, setIsPlacingFlag] = useState(false);
  const [placingFlagDraft, setPlacingFlagDraft] = useState<{ x: number; y: number } | null>(null);

  const viewportCenter = useMemo(() => {
    return {
      x: viewportBounds.left + viewportBounds.width / 2,
      y: viewportBounds.top + viewportBounds.height / 2,
    };
  }, [viewportBounds.left, viewportBounds.top, viewportBounds.width, viewportBounds.height]);

  const activeNearestFlagId = useMemo(() => {
    if (flags.length === 0) return null;

    let best: { id: string; dist: number } | null = null;
    for (const flag of flags) {
      const dx = flag.x - viewportCenter.x;
      const dy = flag.y - viewportCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (!best || dist < best.dist) best = { id: flag.id, dist };
    }

    return best?.id || null;
  }, [flags, viewportCenter]);

  const cancelPlacingFlag = useCallback(() => {
    setIsPlacingFlag(false);
    setPlacingFlagDraft(null);
  }, []);

  const startPlacingFlag = useCallback(() => {
    setIsPlacingFlag(true);
    setPlacingFlagDraft(null);
    flagsStore.hoverFlag(storageKey, null);
    onStartPlacingFlag?.();
  }, [flagsStore, onStartPlacingFlag, storageKey]);

  const commitFlagAt = useCallback(
    (x: number, y: number) => {
      flagsStore.addFlag(storageKey, { x, y, zoom: zoomRef.current || 1 });
      cancelPlacingFlag();
    },
    [cancelPlacingFlag, flagsStore, storageKey, zoomRef],
  );

  const goToFlag = useCallback(
    (flagId: string) => {
      const flag = flags.find((f) => f.id === flagId);
      if (!flag) return;
      flagsStore.selectFlag(storageKey, flag.id);
      flagsStore.touchFlag(storageKey, flag.id);
      animateCameraTo({ x: flag.x, y: flag.y, zoom: flag.zoom });
    },
    [animateCameraTo, flags, flagsStore, storageKey],
  );

  const onBoardPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const scale = zoomRef.current || 1;
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      if (x < 0 || y < 0 || x > boardSize.width || y > boardSize.height) return;
      if (isPlacingFlag) setPlacingFlagDraft({ x, y });
    },
    [boardRef, boardSize.height, boardSize.width, isPlacingFlag, zoomRef],
  );

  useEffect(() => {
    if (!isPlacingFlag) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelPlacingFlag();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const boardEl = boardRef.current;
      if (!boardEl) return;
      const target = e.target as Node | null;
      if (target && !boardEl.contains(target)) {
        cancelPlacingFlag();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      cancelPlacingFlag();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('contextmenu', onContextMenu, true);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
    };
  }, [boardRef, cancelPlacingFlag, isPlacingFlag]);

  return {
    flags,
    selectedFlagId,
    hoveredFlagId,
    activeNearestFlagId,
    isPlacingFlag,
    placingFlagDraft,
    startPlacingFlag,
    cancelPlacingFlag,
    commitFlagAt,
    goToFlag,
    onBoardPointerMove,
  };
}
