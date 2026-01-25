import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Memory } from '@/types';

export type MemoryPositions = Record<string, { x: number; y: number }>;
export type CardSize = 's' | 'm' | 'l';
export type CardColor = 'green' | 'pink' | 'purple';
export type CardColorMap = Record<string, CardColor>;

type UseBoardPersistenceArgs = {
  storageKey: string;
  filteredMemories: Memory[];
  positions: MemoryPositions;
  setPositions: Dispatch<SetStateAction<MemoryPositions>>;
  cardSize: CardSize;
  setCardSize: Dispatch<SetStateAction<CardSize>>;
  cardColor: CardColor;
  setCardColor: Dispatch<SetStateAction<CardColor>>;
  cardColorMap: CardColorMap;
  setCardColorMap: Dispatch<SetStateAction<CardColorMap>>;
};

export function useBoardPersistence({
  storageKey,
  filteredMemories,
  positions,
  setPositions,
  cardSize,
  setCardSize,
  cardColor,
  setCardColor,
  cardColorMap,
  setCardColorMap,
}: UseBoardPersistenceArgs) {
  const [positionsLoaded, setPositionsLoaded] = useState(false);

  const saveTimeoutRef = useRef<number | null>(null);
  const settingsTimeoutRef = useRef<number | null>(null);
  const colorsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchBoardState = async () => {
      try {
        const [positionsRes, settingsRes, colorsRes] = await Promise.all([
          fetch(`/api/board/positions?groupId=all`),
          fetch(`/api/board/settings?groupId=${storageKey}`),
          fetch(`/api/board/colors?groupId=${storageKey}`),
        ]);

        if (positionsRes.ok) {
          const data = await positionsRes.json();
          const next: MemoryPositions = {};
          (data.positions || []).forEach((row: any) => {
            if (row.memoryId && row.x !== null && row.y !== null) {
              next[row.memoryId] = { x: row.x, y: row.y };
            }
          });
          setPositions(next);
          setPositionsLoaded(true);
        } else {
          setPositions({});
          setPositionsLoaded(true);
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          const settings = data.settings;
          if (settings?.cardSize === 's' || settings?.cardSize === 'm' || settings?.cardSize === 'l') {
            setCardSize(settings.cardSize);
          }
          if (settings?.cardColor === 'green' || settings?.cardColor === 'pink' || settings?.cardColor === 'purple') {
            setCardColor(settings.cardColor);
          }
        }

        if (colorsRes.ok) {
          const data = await colorsRes.json();
          const next: CardColorMap = {};
          (data.colors || []).forEach((row: any) => {
            if (row.color) {
              next[row.memoryId] = row.color;
            }
          });
          setCardColorMap(next);
        }
      } catch (error) {
        console.error('Failed to fetch board state:', error);
        setPositions({});
        setPositionsLoaded(true);
      }
    };

    fetchBoardState();
  }, [setCardColor, setCardColorMap, setCardSize, setPositions, storageKey]);

  useEffect(() => {
    if (!positions || Object.keys(positions).length === 0) return;
    if (saveTimeoutRef.current != null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      const payload = filteredMemories
        .map((memory) => {
          const pos = positions[memory.id];
          return pos ? { memoryId: memory.id, x: pos.x, y: pos.y } : null;
        })
        .filter(Boolean);

      try {
        await fetch('/api/board/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: 'all',
            positions: payload,
          }),
        });
      } catch (error) {
        console.error('Failed to save board positions:', error);
      }
    }, 400);

    return () => {
      if (saveTimeoutRef.current != null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [filteredMemories, positions, storageKey]);

  useEffect(() => {
    if (settingsTimeoutRef.current != null) {
      window.clearTimeout(settingsTimeoutRef.current);
    }

    settingsTimeoutRef.current = window.setTimeout(async () => {
      try {
        await fetch('/api/board/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: storageKey,
            cardSize,
            cardColor,
          }),
        });
      } catch (error) {
        console.error('Failed to save board settings:', error);
      }
    }, 300);

    return () => {
      if (settingsTimeoutRef.current != null) {
        window.clearTimeout(settingsTimeoutRef.current);
      }
    };
  }, [cardColor, cardSize, storageKey]);

  useEffect(() => {
    if (colorsTimeoutRef.current != null) {
      window.clearTimeout(colorsTimeoutRef.current);
    }

    colorsTimeoutRef.current = window.setTimeout(async () => {
      const payload = Object.entries(cardColorMap).map(([memoryId, color]) => ({
        memoryId,
        color,
      }));

      try {
        await fetch('/api/board/colors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: storageKey,
            colors: payload,
          }),
        });
      } catch (error) {
        console.error('Failed to save board colors:', error);
      }
    }, 400);

    return () => {
      if (colorsTimeoutRef.current != null) {
        window.clearTimeout(colorsTimeoutRef.current);
      }
    };
  }, [cardColorMap, storageKey]);

  return { positionsLoaded };
}

