import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasBlock } from '@/types';
import type { ViewportBounds } from '@/hooks/board/useBoardCamera';

type BoardSize = { width: number; height: number };

type BlockUpdate = Partial<{ x: number; y: number; width?: number; height?: number; config: any }>;

type UseBoardBlocksArgs = {
  boardSize: BoardSize;
  viewportBounds: ViewportBounds;
};

export function useBoardBlocks({ boardSize, viewportBounds }: UseBoardBlocksArgs) {
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);

  const fetchBlocks = useCallback(async () => {
    try {
      const res = await fetch('/api/board/blocks');
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks || []);
      }
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
    }
  }, []);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const updateBlock = useCallback(async (blockId: string, updates: BlockUpdate) => {
    try {
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId) return b;
          return {
            ...b,
            ...(updates.x !== undefined ? { x: updates.x } : null),
            ...(updates.y !== undefined ? { y: updates.y } : null),
            ...(updates.width !== undefined ? { width: updates.width } : null),
            ...(updates.height !== undefined ? { height: updates.height } : null),
            ...(updates.config !== undefined ? { config: updates.config } : null),
          };
        }),
      );

      const res = await fetch(`/api/board/blocks?id=${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        console.error('Failed to update block:', res.statusText);
      }
    } catch (error) {
      console.error('Failed to update block:', error);
    }
  }, []);

  const deleteBlock = useCallback(async (blockId: string) => {
    try {
      const res = await fetch(`/api/board/blocks?id=${blockId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      }
    } catch (error) {
      console.error('Failed to delete block:', error);
    }
  }, []);

  const createBlock = useCallback(
    async (type: CanvasBlock['type']) => {
      try {
        if (type === 'calendar') {
          const res = await fetch('/api/board/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'calendar',
              x: 100,
              y: 100,
              width: 350,
              height: 400,
              config: {
                view: 'month',
                selectedDate: Date.now(),
                linkedMemoryIds: [],
              },
            }),
          });
          if (res.ok) await fetchBlocks();
          return;
        }

        if (type === 'minimap') {
          const minimapWidth = 240;
          const minimapHeight = 180;
          const x = boardSize.width - minimapWidth - 20;
          const y = 20;

          const res = await fetch('/api/board/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'minimap',
              x,
              y,
              width: minimapWidth,
              height: minimapHeight,
              config: {},
            }),
          });
          if (res.ok) await fetchBlocks();
          return;
        }

        if (type === 'viewer') {
          const res = await fetch('/api/board/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'viewer',
              x: 100,
              y: 100,
              width: 600,
              height: 400,
              config: {
                currentSource: null,
                history: [],
                historyIndex: -1,
                pinned: false,
              },
            }),
          });
          if (res.ok) await fetchBlocks();
          return;
        }

        if (type === 'meeting-recorder') {
          const res = await fetch('/api/board/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'meeting-recorder',
              x: 100,
              y: 100,
              width: 600,
              height: 400,
              config: {
                script: '',
                summary: '',
                isRecording: false,
                isPaused: false,
                recordingTime: 0,
              },
            }),
          });
          if (res.ok) await fetchBlocks();
          return;
        }

        if (type === 'database') {
          const res = await fetch('/api/board/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'database',
              x: 100,
              y: 100,
              width: 480,
              height: 200,
              config: {
                name: '데이터베이스',
                properties: [],
                rows: [],
                sortBy: undefined,
                sortOrder: 'asc',
                filters: [],
                viewType: 'table',
                linkedMemoryIds: [],
              },
            }),
          });
          if (res.ok) await fetchBlocks();
          return;
        }
      } catch (error) {

        if (type === 'calendar') console.error('Failed to create calendar block:', error);
        else if (type === 'minimap') console.error('Failed to create minimap block:', error);
        else if (type === 'viewer') console.error('Failed to create viewer block:', error);
        else if (type === 'meeting-recorder') console.error('Failed to create meeting recorder block:', error);
        else if (type === 'database') console.error('Failed to create database block:', error);
      }
    },
    [boardSize.height, boardSize.width, fetchBlocks],
  );

  const visibleBlocks = useMemo(() => {
    if (blocks.length === 0) return [];

    const padding = 200;
    const viewLeft = viewportBounds.left - padding;
    const viewTop = viewportBounds.top - padding;
    const viewRight = viewportBounds.left + viewportBounds.width + padding;
    const viewBottom = viewportBounds.top + viewportBounds.height + padding;

    return blocks.filter((block) => {
      if (block.type === 'minimap') return true;

      const blockLeft = block.x;
      const blockRight = block.x + (block.width || 400);
      const blockTop = block.y;
      const blockBottom = block.y + (block.height || 300);

      return !(blockRight < viewLeft || blockLeft > viewRight || blockBottom < viewTop || blockTop > viewBottom);
    });
  }, [blocks, viewportBounds.height, viewportBounds.left, viewportBounds.top, viewportBounds.width]);

  const minimapSizeFixedRef = useRef(false);
  useEffect(() => {
    if (minimapSizeFixedRef.current) return;
    const minimapBlock = blocks.find((b) => b.type === 'minimap');
    if (
      minimapBlock &&
      minimapBlock.width !== undefined &&
      minimapBlock.height !== undefined &&
      (minimapBlock.width > 250 || minimapBlock.height > 190)
    ) {
      minimapSizeFixedRef.current = true;
      updateBlock(minimapBlock.id, { width: 240, height: 180 });
    }
  }, [blocks, updateBlock]);

  const saveBlocksTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (blocks.length === 0) return;
    if (saveBlocksTimeoutRef.current != null) {
      window.clearTimeout(saveBlocksTimeoutRef.current);
    }

    saveBlocksTimeoutRef.current = window.setTimeout(async () => {
      // 위치나 크기가 변경된 블록들을 찾아 업데이트 (여기서는 단순하게 모든 블록의 기본 위치 정보만 주기적으로 동기화)
      // 실제로는 특정 조건에서만 저장하는 것이 좋으나, 우선 useBoardPersistence와 유사하게 구현
      for (const block of blocks) {
        try {
          // fetch를 루프에서 돌리는 건 비효율적이나, 현재 API가 단일 업데이트만 지원함
          // 추후 벌크 업데이트 API 개발 필요
          await fetch(`/api/board/blocks?id=${block.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: block.x, y: block.y, width: block.width, height: block.height }),
          });
        } catch (error) {
          console.error('Failed to auto-save block position:', error);
        }
      }
    }, 1000);

    return () => {
      if (saveBlocksTimeoutRef.current != null) {
        window.clearTimeout(saveBlocksTimeoutRef.current);
      }
    };
  }, [blocks]);

  return {
    blocks,
    setBlocks,
    visibleBlocks,
    fetchBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
  };
}

