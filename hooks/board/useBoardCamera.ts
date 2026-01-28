import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type BoardSize = { width: number; height: number };

export type ViewportBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CameraTarget = { x: number; y: number; zoom: number };

type UseBoardCameraArgs = {
  storageKey: string;
  initialBoardSize?: BoardSize;
};

export function useBoardCamera({ storageKey, initialBoardSize = { width: 1600, height: 3600 } }: UseBoardCameraArgs) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const [boardSize, setBoardSize] = useState<BoardSize>(initialBoardSize);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const cameraAnimationFrameRef = useRef<number | null>(null);

  const clampZoom = useCallback((value: number) => Math.min(Math.max(value, 0.5), 1.6), []);

  const updatePan = useCallback(() => {
    if (!boardContainerRef.current) return;
    const container = boardContainerRef.current;
    setPan({
      x: -container.scrollLeft,
      y: -container.scrollTop,
    });
    setContainerSize({
      width: container.clientWidth,
      height: container.clientHeight,
    });
  }, []);

  const viewportBounds: ViewportBounds = useMemo(() => {
    const scrollLeft = -pan.x;
    const scrollTop = -pan.y;
    const { width: containerWidth, height: containerHeight } = containerSize;

    const left = scrollLeft / zoom;
    const top = scrollTop / zoom;
    const width = containerWidth / zoom;
    const height = containerHeight / zoom;

    if (process.env.NODE_ENV === 'development' && width > 0) {
      console.log('[viewportBounds] 계산(심플):', {
        scrollLeft,
        scrollTop,
        zoom,
        containerWidth,
        containerHeight,
        boardWidth: boardSize.width,
        boardHeight: boardSize.height,
        viewportBounds: { left, top, width, height },
      });
    }

    return { left, top, width, height };
  }, [pan, containerSize, zoom, boardSize]);

  const changeZoom = useCallback(
    (delta: number) => {
      setZoom((prev) => clampZoom(prev + delta));
    },
    [clampZoom],
  );

  const resetZoom = useCallback(() => setZoom(1), []);

  const animateCameraTo = useCallback(
    (target: CameraTarget) => {
      const container = boardContainerRef.current;
      if (!container) return;

      if (cameraAnimationFrameRef.current !== null) {
        cancelAnimationFrame(cameraAnimationFrameRef.current);
        cameraAnimationFrameRef.current = null;
      }

      const startZoom = zoomRef.current;
      const targetZoom = clampZoom(target.zoom);
      const startCenterX = (container.scrollLeft + container.clientWidth / 2) / startZoom;
      const startCenterY = (container.scrollTop + container.clientHeight / 2) / startZoom;

      const dx = target.x - startCenterX;
      const dy = target.y - startCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const zoomDelta = Math.abs(targetZoom - startZoom);
      const durationMs = Math.max(280, Math.min(700, 280 + dist * 0.15 + zoomDelta * 220));

      const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

      const startTime = performance.now();

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / durationMs);
        const eased = easeInOutCubic(t);

        const nextZoom = startZoom + (targetZoom - startZoom) * eased;
        const nextCenterX = startCenterX + (target.x - startCenterX) * eased;
        const nextCenterY = startCenterY + (target.y - startCenterY) * eased;

        zoomRef.current = nextZoom;
        setZoom(nextZoom);

        container.scrollLeft = nextCenterX * nextZoom - container.clientWidth / 2;
        container.scrollTop = nextCenterY * nextZoom - container.clientHeight / 2;

        if (t < 1) {
          cameraAnimationFrameRef.current = requestAnimationFrame(step);
        } else {
          cameraAnimationFrameRef.current = null;
        }
      };

      cameraAnimationFrameRef.current = requestAnimationFrame(step);
    },
    [clampZoom],
  );

  useEffect(() => {
    updatePan();
  }, [updatePan]);

  useEffect(() => {
    const container = boardContainerRef.current;
    if (!container) return;

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          updatePan();
          rafId = null;
        });
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    updatePan();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [updatePan]);

  useEffect(() => {
    const container = boardContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updatePan();
    });

    resizeObserver.observe(container);
    updatePan();

    return () => {
      resizeObserver.disconnect();
    };
  }, [updatePan]);

  useEffect(() => {
    const handleResize = () => {
      updatePan();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePan]);

  const zoomStorageKey = `workless.board.zoom.${storageKey}`;

  useEffect(() => {
    try {
      const storedZoom = localStorage.getItem(zoomStorageKey);
      setZoom(storedZoom ? Number(storedZoom) : 1);
    } catch (error) {
      console.error('Failed to load zoom level:', error);
      setZoom(1);
    }
  }, [zoomStorageKey]);

  useEffect(() => {
    zoomRef.current = zoom;
    try {
      const t = window.setTimeout(() => {
        try {
          localStorage.setItem(zoomStorageKey, zoom.toString());
        } catch (error) {
          console.error('Failed to save zoom level:', error);
        }
      }, 150);
      return () => window.clearTimeout(t);
    } catch (error) {
      console.error('Failed to save zoom level:', error);
    }
  }, [zoom, zoomStorageKey]);

  return {
    boardRef,
    boardContainerRef,
    boardSize,
    setBoardSize,
    zoom,
    setZoom,
    zoomRef,
    viewportBounds,
    animateCameraTo,
    changeZoom,
    resetZoom,
    updatePan,
  };
}

