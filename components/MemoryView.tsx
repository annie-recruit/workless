'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Memory, Group } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import LinkManager from './LinkManager';

interface MemoryViewProps {
  memories: Memory[];
  onMemoryDeleted?: () => void;
  personaId?: string | null;
}

const stripHtmlClient = (html: string) => {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const sanitizeHtml = (html: string) => {
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const allowedTags = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'SPAN', 'A', 'UL', 'OL', 'LI', 'FONT'
  ]);
  const allowedAttrs: Record<string, string[]> = {
    A: ['href', 'data-memory-id', 'class', 'target', 'rel'],
    SPAN: ['style', 'class', 'data-memory-id'],
    DIV: ['style', 'class'],
    P: ['style', 'class'],
    FONT: ['face', 'size', 'color'],
  };
  const allowedStyles = new Set([
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'text-decoration',
    'color',
  ]);

  doc.body.querySelectorAll('*').forEach((node) => {
    const tagName = node.tagName.toUpperCase();
    if (!allowedTags.has(tagName)) {
      const text = doc.createTextNode(node.textContent || '');
      node.replaceWith(text);
      return;
    }

    const allowed = (allowedAttrs[tagName] || []).map(a => a.toLowerCase());
    Array.from(node.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
        return;
      }
      if (allowed.length > 0 && !allowed.includes(name)) {
        if (!name.startsWith('data-')) {
          node.removeAttribute(attr.name);
        }
      }
      if (name === 'href' && attr.value.toLowerCase().startsWith('javascript:')) {
        node.removeAttribute(attr.name);
      }
      if (name === 'style') {
        const safeStyles = attr.value
          .split(';')
          .map(rule => rule.trim())
          .filter(Boolean)
          .map(rule => {
            const [prop, value] = rule.split(':').map(v => v.trim());
            if (!prop || !value) return null;
            return allowedStyles.has(prop.toLowerCase()) ? `${prop}: ${value}` : null;
          })
          .filter(Boolean)
          .join('; ');
        if (safeStyles) {
          node.setAttribute('style', safeStyles);
        } else {
          node.removeAttribute('style');
        }
      }
    });
  });

  return doc.body.innerHTML;
};

const CARD_DIMENSIONS = {
  s: { width: 260, height: 220, centerX: 130, centerY: 110 },
  m: { width: 320, height: 240, centerX: 160, centerY: 120 },
  l: { width: 360, height: 260, centerX: 180, centerY: 130 },
} as const;

const BOARD_PADDING = 220;

export default function MemoryView({ memories, onMemoryDeleted, personaId }: MemoryViewProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [draggedMemoryId, setDraggedMemoryId] = useState<string | null>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(null);
  const [linkManagerMemory, setLinkManagerMemory] = useState<Memory | null>(null);
  // 로컬 메모리 상태 (연결 추가 시 즉시 반영)
  const [localMemories, setLocalMemories] = useState<Memory[]>(memories);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [previousPositions, setPreviousPositions] = useState<Record<string, { x: number; y: number }> | null>(null);
  const [positionsLoaded, setPositionsLoaded] = useState(false); // 위치 로드 완료 플래그
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isAutoArranging, setIsAutoArranging] = useState(false);
  const [cardSize, setCardSize] = useState<'s' | 'm' | 'l'>('m');
  const [cardColor, setCardColor] = useState<'amber' | 'blue' | 'green' | 'pink' | 'purple'>('amber');
  const [cardColorMap, setCardColorMap] = useState<Record<string, 'amber' | 'blue' | 'green' | 'pink' | 'purple'>>({});
  const [linkNotes, setLinkNotes] = useState<Record<string, string>>({});
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 1600, height: 1200 });
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const settingsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const colorsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  // memories prop이 변경되면 로컬 상태도 업데이트
  useEffect(() => {
    setLocalMemories(memories);
  }, [memories]);

  useEffect(() => {
    const storedSize = localStorage.getItem('workless.board.cardSize');
    const storedColor = localStorage.getItem('workless.board.cardColor');
    if (storedSize === 's' || storedSize === 'm' || storedSize === 'l') {
      setCardSize(storedSize);
    }
    if (storedColor === 'amber' || storedColor === 'blue' || storedColor === 'green' || storedColor === 'pink' || storedColor === 'purple') {
      setCardColor(storedColor);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('workless.board.cardSize', cardSize);
  }, [cardSize]);

  useEffect(() => {
    localStorage.setItem('workless.board.cardColor', cardColor);
  }, [cardColor]);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (memoryId: string) => {
    setDraggedMemoryId(memoryId);
  };

  const handleDragEnd = () => {
    setDraggedMemoryId(null);
    setDropTargetGroupId(null);
  };

  const handleDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    setDropTargetGroupId(groupId);
  };

  const clampZoom = (value: number) => Math.min(Math.max(value, 0.5), 1.6);
  const changeZoom = (delta: number) => {
    setZoom(prev => clampZoom(prev + delta));
  };
  const resetZoom = () => setZoom(1);

  const ensureBoardBounds = (x: number, y: number) => {
    const { width: cardWidth, height: cardHeight } = CARD_DIMENSIONS[cardSize];
    setBoardSize(prev => {
      const requiredWidth = Math.max(prev.width, x + cardWidth + BOARD_PADDING / 2);
      const requiredHeight = Math.max(prev.height, y + cardHeight + BOARD_PADDING / 2);
      if (requiredWidth === prev.width && requiredHeight === prev.height) {
        return prev;
      }
      return {
        width: requiredWidth,
        height: requiredHeight,
      };
    });
  };

  const handleDragLeave = () => {
    setDropTargetGroupId(null);
  };

  const handleDrop = async (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    setDropTargetGroupId(null);
    
    if (!draggedMemoryId) return;

    try {
      const targetGroup = groups.find(g => g.id === groupId);
      if (!targetGroup) return;

      // 이미 그룹에 포함되어 있는지 확인
      if (targetGroup.memoryIds.includes(draggedMemoryId)) {
        alert('이미 이 그룹에 포함된 기록입니다');
        return;
      }

      // 그룹에 기록 추가
      const updatedMemoryIds = [...targetGroup.memoryIds, draggedMemoryId];
      const res = await fetch('/api/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: groupId,
          memoryIds: updatedMemoryIds,
        }),
      });

      if (res.ok) {
        await fetchGroups();
        alert('그룹에 추가되었습니다!');
        // 햅틱 피드백 (성공)
        if ('vibrate' in navigator) {
          navigator.vibrate([10, 50, 10]);
        }
      } else {
        alert('그룹 추가 실패');
        // 햅틱 피드백 (에러)
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 50, 30]);
        }
      }
    } catch (error) {
      console.error('Failed to add memory to group:', error);
      alert('그룹 추가 중 오류 발생');
      // 햅틱 피드백 (에러)
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 50, 30]);
      }
    } finally {
      setDraggedMemoryId(null);
    }
  };

  const storageKey = selectedGroupId || 'all';
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
      localStorage.setItem(zoomStorageKey, zoom.toString());
    } catch (error) {
      console.error('Failed to save zoom level:', error);
    }
  }, [zoom, zoomStorageKey]);

  useEffect(() => {
    const fetchBoardState = async () => {
      try {
        const [positionsRes, settingsRes, colorsRes] = await Promise.all([
          fetch(`/api/board/positions?groupId=${storageKey}`),
          fetch(`/api/board/settings?groupId=${storageKey}`),
          fetch(`/api/board/colors?groupId=${storageKey}`),
        ]);

        if (positionsRes.ok) {
          const data = await positionsRes.json();
          const next: Record<string, { x: number; y: number }> = {};
          (data.positions || []).forEach((row: any) => {
            if (row.memoryId && row.x !== null && row.y !== null) {
              next[row.memoryId] = { x: row.x, y: row.y };
            }
          });
          setPositions(next);
          setPositionsLoaded(true); // 위치 로드 완료 표시
        } else {
          setPositions({});
          setPositionsLoaded(true); // 실패해도 로드 완료로 표시
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          const settings = data.settings;
          if (settings?.cardSize === 's' || settings?.cardSize === 'm' || settings?.cardSize === 'l') {
            setCardSize(settings.cardSize);
          }
          if (settings?.cardColor === 'amber' || settings?.cardColor === 'blue' || settings?.cardColor === 'green' || settings?.cardColor === 'pink' || settings?.cardColor === 'purple') {
            setCardColor(settings.cardColor);
          }
        }

        if (colorsRes.ok) {
          const data = await colorsRes.json();
          const next: Record<string, 'amber' | 'blue' | 'green' | 'pink' | 'purple'> = {};
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
        setPositionsLoaded(true); // 에러 발생해도 로드 완료로 표시
      }
    };
    fetchBoardState();
  }, [storageKey]);

  const getLinkKey = (id1: string, id2: string) => {
    return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
  };

  // 그룹별 필터링
  const filteredMemories = useMemo(() => {
    if (!selectedGroupId) return localMemories;
        const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return [];
    return localMemories.filter(m => group.memoryIds.includes(m.id));
  }, [localMemories, selectedGroupId, groups]);

  useEffect(() => {
    // 위치가 로드되기 전에는 기본 위치 설정 안 함
    if (!positionsLoaded || !boardRef.current || filteredMemories.length === 0) return;
    
    setPositions(prev => {
      const next = { ...prev };
      const spacingX = 260;
      const spacingY = 220;
      filteredMemories.forEach((memory, idx) => {
        // 저장된 위치가 없을 때만 기본 위치 설정
        if (!next[memory.id]) {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          next[memory.id] = {
            x: 24 + col * spacingX,
            y: 24 + row * spacingY,
          };
        }
      });
      return next;
    });
  }, [filteredMemories, positionsLoaded]);

  useEffect(() => {
    const { width: cardWidth, height: cardHeight } = CARD_DIMENSIONS[cardSize];
    let maxX = 0;
    let maxY = 0;
    Object.values(positions).forEach(pos => {
      maxX = Math.max(maxX, pos.x + cardWidth);
      maxY = Math.max(maxY, pos.y + cardHeight);
    });
    const width = Math.max(1400, maxX + BOARD_PADDING);
    const height = Math.max(900, maxY + BOARD_PADDING);
    setBoardSize({ width, height });
  }, [positions, cardSize]);

  useEffect(() => {
    const fetchLinkNotes = async () => {
      try {
        const res = await fetch('/api/memories/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memoryIds: filteredMemories.map(m => m.id),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const next: Record<string, string> = {};
          (data.links || []).forEach((link: any) => {
            if (link.note) {
              next[getLinkKey(link.memoryId1, link.memoryId2)] = link.note;
            }
          });
          setLinkNotes(next);
        }
      } catch (error) {
        console.error('Failed to fetch link notes:', error);
      }
    };
    if (filteredMemories.length > 0) {
      fetchLinkNotes();
    } else {
      setLinkNotes({});
    }
  }, [filteredMemories]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!draggingId || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const scale = zoomRef.current;
      const x = (event.clientX - rect.left) / scale - dragOffset.x;
      const y = (event.clientY - rect.top) / scale - dragOffset.y;
      setPositions(prev => ({
        ...prev,
        [draggingId]: {
          x: Math.max(0, x),
          y: Math.max(0, y),
        },
      }));
      ensureBoardBounds(x, y);
    };

    const handleUp = () => {
      setDraggingId(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [draggingId, dragOffset]);

  useEffect(() => {
    if (!positions || Object.keys(positions).length === 0) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      const payload = filteredMemories
        .map(memory => {
          const pos = positions[memory.id];
          return pos ? { memoryId: memory.id, x: pos.x, y: pos.y } : null;
        })
        .filter(Boolean);

      try {
        await fetch('/api/board/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: storageKey,
            positions: payload,
          }),
        });
      } catch (error) {
        console.error('Failed to save board positions:', error);
      }
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [positions, filteredMemories, storageKey]);

  useEffect(() => {
    if (settingsTimeoutRef.current) {
      clearTimeout(settingsTimeoutRef.current);
    }
    settingsTimeoutRef.current = setTimeout(async () => {
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
      if (settingsTimeoutRef.current) {
        clearTimeout(settingsTimeoutRef.current);
      }
    };
  }, [cardSize, cardColor, storageKey]);

  useEffect(() => {
    if (colorsTimeoutRef.current) {
      clearTimeout(colorsTimeoutRef.current);
    }
    colorsTimeoutRef.current = setTimeout(async () => {
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
      if (colorsTimeoutRef.current) {
        clearTimeout(colorsTimeoutRef.current);
      }
    };
  }, [cardColorMap, storageKey]);

  const handleAutoArrange = async () => {
    if (filteredMemories.length === 0) return;
    
    setIsAutoArranging(true);
    
    try {
      // 현재 위치 백업
      setPreviousPositions({ ...positions });
      
      // 연결 정보 준비
      const connections = connectionPairsWithColor.map(pair => ({
        from: pair.from,
        to: pair.to,
      }));
      
      // 메모리 정보 준비 (제목, 내용만)
      const memoryData = filteredMemories.map(m => ({
        id: m.id,
        title: m.title || undefined,
        content: m.content,
      }));
      
      // AI 레이아웃 생성 API 호출
      const res = await fetch('/api/board/arrange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memories: memoryData,
          connections,
          currentPositions: positions,
          cardSize,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const newLayout: Record<string, { x: number; y: number }> = data.layout || {};
        
        // 새 레이아웃 적용
        setPositions(newLayout);
        
        // 보드 크기 조정
        const { width: cardWidth, height: cardHeight } = CARD_DIMENSIONS[cardSize];
        let maxX = 0;
        let maxY = 0;
        (Object.values(newLayout) as { x: number; y: number }[]).forEach((pos) => {
          maxX = Math.max(maxX, pos.x + cardWidth);
          maxY = Math.max(maxY, pos.y + cardHeight);
        });
        setBoardSize({
          width: Math.max(1400, maxX + BOARD_PADDING),
          height: Math.max(900, maxY + BOARD_PADDING),
        });
      } else {
        alert('자동 배열에 실패했습니다');
      }
    } catch (error) {
      console.error('Auto arrange error:', error);
      alert('자동 배열 중 오류가 발생했습니다');
    } finally {
      setIsAutoArranging(false);
    }
  };

  const handleRestoreLayout = () => {
    if (previousPositions) {
      setPositions(previousPositions);
      setPreviousPositions(null);
      
      // 보드 크기 조정
      const { width: cardWidth, height: cardHeight } = CARD_DIMENSIONS[cardSize];
      let maxX = 0;
      let maxY = 0;
      Object.values(previousPositions).forEach(pos => {
        maxX = Math.max(maxX, pos.x + cardWidth);
        maxY = Math.max(maxY, pos.y + cardHeight);
      });
      setBoardSize({
        width: Math.max(1400, maxX + BOARD_PADDING),
        height: Math.max(900, maxY + BOARD_PADDING),
      });
    }
  };

  const handlePointerDown = (memoryId: string, event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    setDraggingId(memoryId);
    setDragOffset({
      x: (event.clientX - rect.left) / zoomRef.current,
      y: (event.clientY - rect.top) / zoomRef.current,
    });
  };

  // 클러스터 재구성 제거 - 시간순으로만 표시
  // filteredClusters는 더 이상 사용하지 않음


  if (memories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        아직 기억이 없습니다
      </div>
    );
  }

  const cardSizeData = CARD_DIMENSIONS[cardSize];
  const cardSizeClass = cardSize === 's' ? 'w-[260px]' : cardSize === 'l' ? 'w-[360px]' : 'w-[320px]';
  const cardSizeCenter = { x: cardSizeData.centerX, y: cardSizeData.centerY };

  const cardColorClass = cardColor === 'blue'
    ? 'bg-blue-50 border-blue-200'
    : cardColor === 'green'
    ? 'bg-green-50 border-green-200'
    : cardColor === 'pink'
    ? 'bg-pink-50 border-pink-200'
    : cardColor === 'purple'
    ? 'bg-purple-50 border-purple-200'
    : 'bg-amber-50 border-amber-200';

  // 연결 그룹을 찾아서 색상 할당
  const connectionPairsWithColor = useMemo(() => {
    const set = new Set<string>();
    const pairs: Array<{ from: string; to: string }> = [];
    const visibleIds = new Set(filteredMemories.map(m => m.id));
    
    // 연결 쌍 수집
    filteredMemories.forEach(memory => {
      const related = memory.relatedMemoryIds || [];
      related.forEach(relatedId => {
        if (!visibleIds.has(relatedId)) return;
        const key = [memory.id, relatedId].sort().join(':');
        if (set.has(key)) return;
        set.add(key);
        pairs.push({ from: memory.id, to: relatedId });
      });
    });

    // 연결 그룹 찾기 (같은 네트워크에 속한 연결들은 같은 색상)
    const connectionGroups: Array<Set<string>> = [];
    const nodeToGroup = new Map<string, number>();
    
    pairs.forEach(pair => {
      const fromGroup = nodeToGroup.get(pair.from);
      const toGroup = nodeToGroup.get(pair.to);
      
      if (fromGroup === undefined && toGroup === undefined) {
        // 새 그룹 생성
        const newGroup = new Set<string>([pair.from, pair.to]);
        connectionGroups.push(newGroup);
        const groupIndex = connectionGroups.length - 1;
        nodeToGroup.set(pair.from, groupIndex);
        nodeToGroup.set(pair.to, groupIndex);
      } else if (fromGroup !== undefined && toGroup === undefined) {
        // from 그룹에 to 추가
        connectionGroups[fromGroup].add(pair.to);
        nodeToGroup.set(pair.to, fromGroup);
      } else if (fromGroup === undefined && toGroup !== undefined) {
        // to 그룹에 from 추가
        connectionGroups[toGroup].add(pair.from);
        nodeToGroup.set(pair.from, toGroup);
      } else if (fromGroup !== undefined && toGroup !== undefined && fromGroup !== toGroup) {
        // 두 그룹 병합
        const merged = new Set([...connectionGroups[fromGroup], ...connectionGroups[toGroup]]);
        connectionGroups[fromGroup] = merged;
        connectionGroups[toGroup].forEach(node => nodeToGroup.set(node, fromGroup));
        connectionGroups[toGroup] = new Set(); // 빈 그룹으로 표시
      }
    });

    // 색상 팔레트
    const colors = [
      '#6366F1', // indigo (기본)
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#06B6D4', // cyan
      '#EC4899', // pink
      '#14B8A6', // teal
    ];

    // 각 연결 쌍에 색상 할당
    const pairsWithColor = pairs.map(pair => {
      const fromGroup = nodeToGroup.get(pair.from);
      const colorIndex = fromGroup !== undefined ? fromGroup % colors.length : 0;
      return {
        ...pair,
        color: colors[colorIndex],
        groupIndex: fromGroup !== undefined ? fromGroup : -1,
      };
    });

    // 각 카드에서 나가는 연결 개수 계산 (여러 줄 표시용)
    const outgoingCount = new Map<string, number>();
    pairsWithColor.forEach(pair => {
      outgoingCount.set(pair.from, (outgoingCount.get(pair.from) || 0) + 1);
    });

    // 각 연결에 오프셋 인덱스 할당
    const connectionIndex = new Map<string, number>();
    pairsWithColor.forEach(pair => {
      const key = `${pair.from}-${pair.to}`;
      const count = outgoingCount.get(pair.from) || 1;
      const currentIndex = connectionIndex.get(pair.from) || 0;
      connectionIndex.set(pair.from, currentIndex + 1);
      (pair as any).offsetIndex = currentIndex;
      (pair as any).totalOutgoing = count;
    });

    if (pairsWithColor.length > 0) {
      console.log('🔗 연결선 개수:', pairsWithColor.length, '그룹 수:', connectionGroups.filter(g => g.size > 0).length);
    }
    
    return pairsWithColor;
  }, [filteredMemories]);

  return (
    <div className="w-full mx-auto space-y-6">
      {/* 필터 바 - 폴더 스타일 */}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
        {/* 전체 */}
        <button
          onClick={() => setSelectedGroupId(null)}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
            selectedGroupId === null
              ? 'bg-gray-900 shadow-lg scale-105'
              : 'hover:bg-gray-50'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className={`w-10 h-10 transition-all ${
            selectedGroupId === null ? '' : 'drop-shadow-md hover:drop-shadow-lg'
          }`}>
            <path d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" 
                  fill={selectedGroupId === null ? 'white' : '#6B7280'}
                  stroke="none"/>
          </svg>
          <span className={`text-xs font-medium ${selectedGroupId === null ? 'text-white' : 'text-gray-600'}`}>
            전체 {memories.length}
          </span>
        </button>

        {/* 그룹 폴더들 */}
        {groups.map(group => {
          const colorMap: Record<string, string> = {
            blue: selectedGroupId === group.id ? '#3B82F6' : '#93C5FD',
            purple: selectedGroupId === group.id ? '#A855F7' : '#D8B4FE',
            green: selectedGroupId === group.id ? '#10B981' : '#86EFAC',
            orange: selectedGroupId === group.id ? '#F97316' : '#FDBA74',
            pink: selectedGroupId === group.id ? '#EC4899' : '#F9A8D4',
            red: selectedGroupId === group.id ? '#EF4444' : '#FCA5A5',
            yellow: selectedGroupId === group.id ? '#EAB308' : '#FDE047',
          };
          const folderColor = colorMap[group.color || 'blue'];
          
          return (
            <button
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              onDragOver={(e) => handleDragOver(e, group.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, group.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all relative ${
                selectedGroupId === group.id
                  ? 'bg-gray-900 shadow-lg scale-105'
                  : dropTargetGroupId === group.id
                  ? 'bg-blue-50 scale-105'
                  : 'hover:bg-gray-50'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" className={`w-10 h-10 transition-all ${
                selectedGroupId === group.id 
                  ? '' 
                  : 'drop-shadow-md hover:drop-shadow-lg'
              }`}>
                <path d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" 
                      fill={selectedGroupId === group.id ? 'white' : folderColor}
                      stroke="none"/>
              </svg>
              <span className={`text-xs font-medium max-w-[80px] truncate ${
                selectedGroupId === group.id ? 'text-white' : 'text-gray-600'
              }`}>
                {group.name}
              </span>
              <span className={`text-[11px] ${
                selectedGroupId === group.id ? 'text-gray-300' : 'text-gray-400'
              }`}>
                {group.memoryIds.length}개
              </span>
              {dropTargetGroupId === group.id && (
                <div className="absolute -top-1 -right-1 text-lg">📥</div>
              )}
            </button>
          );
        })}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">크기</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCardSize('s')}
                className={`px-2 py-1 text-xs rounded-lg ${cardSize === 's' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                작게
              </button>
              <button
                onClick={() => setCardSize('m')}
                className={`px-2 py-1 text-xs rounded-lg ${cardSize === 'm' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                보통
              </button>
              <button
                onClick={() => setCardSize('l')}
                className={`px-2 py-1 text-xs rounded-lg ${cardSize === 'l' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                크게
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 화이트보드 뷰 */}
      <div>
        {filteredMemories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            해당 그룹에 기억이 없습니다
          </div>
        ) : (
          <div
            ref={boardRef}
            className="relative w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-auto"
          >
            <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">화이트보드</span>
                <span className="text-[11px] text-gray-400">
                  {Math.round(boardSize.width)}×{Math.round(boardSize.height)}
                </span>
                {previousPositions && (
                  <button
                    onClick={handleRestoreLayout}
                    className="px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
                    title="이전 배열로 되돌리기"
                  >
                    이전 배열로
                  </button>
                )}
                <button
                  onClick={handleAutoArrange}
                  disabled={isAutoArranging}
                  className="px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                  title="연결선 기반으로 자동 배열"
                >
                  {isAutoArranging ? '배열 중...' : '맞춤 배열'}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => changeZoom(-0.1)}
                  className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                  disabled={zoom <= 0.5}
                >
                  -
                </button>
                <span className="text-xs font-semibold">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => changeZoom(0.1)}
                  className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                  disabled={zoom >= 1.6}
                >
                  +
                </button>
                <button
                  onClick={resetZoom}
                  className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50"
                >
                  초기화
                </button>
              </div>
            </div>

            <div
              className="relative"
              style={{ minWidth: boardSize.width, minHeight: boardSize.height }}
            >
              <div
                className="relative"
                style={{
                  width: boardSize.width,
                  height: boardSize.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                {/* 연결선 SVG - 카드 뒤에 렌더링 */}
                {connectionPairsWithColor.length > 0 && (
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    width={boardSize.width}
                    height={boardSize.height}
                    style={{ zIndex: 1 }}
                  >
                    <defs>
                      {/* 각 색상별 화살표 마커 생성 */}
                      {connectionPairsWithColor.map((pair, idx) => {
                        const markerId = `arrowhead-${pair.color.replace('#', '')}`;
                        return (
                          <marker
                            key={markerId}
                            id={markerId}
                            markerWidth="10"
                            markerHeight="10"
                            refX="8"
                            refY="3"
                            orient="auto"
                            markerUnits="strokeWidth"
                          >
                            <path d="M0,0 L0,6 L9,3 z" fill={pair.color} />
                          </marker>
                        );
                      })}
                    </defs>
                    {connectionPairsWithColor.map(pair => {
                      const from = positions[pair.from];
                      const to = positions[pair.to];
                      if (!from || !to) {
                        console.log('⚠️ 연결선 위치 없음:', pair, { from, to });
                        return null;
                      }
                      
                      // 여러 연결선이 있을 때 오프셋 계산
                      const offsetIndex = (pair as any).offsetIndex || 0;
                      const totalOutgoing = (pair as any).totalOutgoing || 1;
                      const lineOffset = totalOutgoing > 1 ? (offsetIndex - (totalOutgoing - 1) / 2) * 8 : 0;
                      
                      const fromX = from.x + CARD_DIMENSIONS[cardSize].centerX;
                      const fromY = from.y + CARD_DIMENSIONS[cardSize].centerY;
                      const toX = to.x + CARD_DIMENSIONS[cardSize].centerX;
                      const toY = to.y + CARD_DIMENSIONS[cardSize].centerY;
                      
                      // 오프셋 적용 (수직 방향으로 약간 이동)
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
                      
                      const note = linkNotes[getLinkKey(pair.from, pair.to)];
                      const markerId = `arrowhead-${pair.color.replace('#', '')}`;
                      
                      return (
                        <g key={`${pair.from}-${pair.to}`}>
                          <path
                            d={`M ${adjustedFromX} ${adjustedFromY} Q ${cx} ${cy} ${adjustedToX} ${adjustedToY}`}
                            stroke={pair.color}
                            strokeWidth="3"
                            fill="none"
                            markerEnd={`url(#${markerId})`}
                            opacity="0.9"
                          />
                          {note && (
                            <text
                              x={cx}
                              y={cy - 6}
                              textAnchor="middle"
                              fill="#475569"
                              fontSize="11"
                              fontWeight="500"
                              style={{ userSelect: 'none' }}
                            >
                              {note.length > 18 ? `${note.slice(0, 18)}...` : note}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* 메모리 카드들 */}
                {filteredMemories.map((memory) => {
                  const position = positions[memory.id] || { x: 0, y: 0 };
                  const memoryColor = cardColorMap[memory.id] || cardColor;
                  const memoryColorClass = memoryColor === 'blue'
                    ? 'bg-blue-50 border-blue-200'
                    : memoryColor === 'green'
                    ? 'bg-green-50 border-green-200'
                    : memoryColor === 'pink'
                    ? 'bg-pink-50 border-pink-200'
                    : memoryColor === 'purple'
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-amber-50 border-amber-200';
                  return (
                    <div
                key={memory.id} 
                      onPointerDown={(event) => {
                        // 편집 모드 체크: MemoryCard 내부의 data-editing 속성 확인
                        const cardElement = (event.currentTarget as HTMLElement).querySelector(`[data-editing="true"]`);
                        if (cardElement) {
                          // 편집 모드에서는 드래그 비활성화
                          return;
                        }
                        handlePointerDown(memory.id, event);
                      }}
                      style={{
                        transform: `translate(${position.x}px, ${position.y}px)`,
                        willChange: draggingId === memory.id ? 'transform' : 'auto',
                        opacity: draggingId === memory.id ? 0.8 : 1,
                        zIndex: draggingId === memory.id ? 20 : 10,
                      }}
                      className={`absolute ${cardSizeClass} select-none touch-none cursor-grab active:cursor-grabbing transition-opacity ${
                        draggingId === memory.id ? 'cursor-grabbing shadow-2xl' : ''
                      }`}
                    >
                      <MemoryCard
                        memory={memory} 
                        onDelete={onMemoryDeleted} 
                        allMemories={memories}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onOpenLinkManager={setLinkManagerMemory}
                        variant="board"
                        colorClass={memoryColorClass}
                        onCardColorChange={(color) => {
                          setCardColorMap(prev => ({ ...prev, [memory.id]: color }));
                        }}
                        linkNotes={linkNotes}
                        personaId={personaId}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 링크 관리 모달 */}
      {linkManagerMemory && (
        <LinkManager
          currentMemory={linkManagerMemory}
          allMemories={localMemories}
          onClose={() => setLinkManagerMemory(null)}
          onLinked={async (updatedMemory1, updatedMemory2) => {
            // 로컬 상태 즉시 업데이트 (페이지 리로드 없이)
            setLocalMemories(prev => {
              const updated = [...prev];
              const index1 = updated.findIndex(m => m.id === updatedMemory1.id);
              const index2 = updated.findIndex(m => m.id === updatedMemory2.id);
              
              if (index1 !== -1) {
                updated[index1] = updatedMemory1;
              }
              if (index2 !== -1) {
                updated[index2] = updatedMemory2;
              }
              
              return updated;
            });
            
            // linkManagerMemory도 업데이트
            if (linkManagerMemory.id === updatedMemory1.id) {
              setLinkManagerMemory(updatedMemory1);
            } else if (linkManagerMemory.id === updatedMemory2.id) {
              setLinkManagerMemory(updatedMemory2);
            }
          }}
        />
      )}
    </div>
  );
}

function MemoryCard({ 
  memory, 
  onDelete, 
  allMemories, 
  onDragStart, 
  onDragEnd, 
  onOpenLinkManager,
  variant = 'list',
  colorClass,
  onCardColorChange,
  linkNotes,
  personaId,
}: { 
  memory: Memory; 
  onDelete?: () => void; 
  allMemories: Memory[];
  onDragStart?: (memoryId: string) => void;
  onDragEnd?: () => void;
  onOpenLinkManager?: (memory: Memory) => void;
  variant?: 'board' | 'list';
  colorClass?: string;
  onCardColorChange?: (color: 'amber' | 'blue' | 'green' | 'pink' | 'purple') => void;
  linkNotes?: Record<string, string>;
  personaId?: string | null;
}) {
  // 로컬 memory 상태 관리 (수정 후 즉시 반영)
  const [localMemory, setLocalMemory] = useState<Memory>(memory);
  
  // memory prop이 변경되면 로컬 상태도 업데이트
  useEffect(() => {
    setLocalMemory(memory);
  }, [memory.id]); // memory.id가 변경될 때만 업데이트 (같은 메모리면 업데이트 안 함)
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(localMemory.title || '');
  const [editContent, setEditContent] = useState(localMemory.content);
  const editRef = useRef<HTMLDivElement>(null);
  const prevIsEditingRef = useRef(false);
  const [isGrouping, setIsGrouping] = useState(false);
  const [groupResult, setGroupResult] = useState<any>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupStep, setGroupStep] = useState<'loading' | 'confirm' | 'animating'>('loading');
  
  const timeAgo = formatDistanceToNow(localMemory.createdAt, { 
    addSuffix: true,
    locale: ko 
  });

  // 편집 모드로 전환할 때 초기 내용 설정
  useEffect(() => {
    if (isEditing && !prevIsEditingRef.current && editRef.current) {
      // 편집 모드로 전환하는 순간에만 초기 내용 설정
      editRef.current.innerHTML = editContent;
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, editContent]);

  const handleToggleSummary = async () => {
    if (!showSummary && !summary) {
      // 요약이 없으면 API 호출
      setIsLoadingSummary(true);
      try {
        console.log('📝 요약 요청 - personaId:', personaId);
        const url = personaId 
          ? `/api/memories/${localMemory.id}/summarize?personaId=${personaId}`
          : `/api/memories/${localMemory.id}/summarize`;
        console.log('📝 요약 API URL:', url);
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSummary(data.summary);
          setShowSummary(true);
        } else {
          alert('요약 생성 실패');
        }
      } catch (error) {
        console.error('Failed to fetch summary:', error);
        alert('요약을 가져올 수 없습니다');
      } finally {
        setIsLoadingSummary(false);
      }
    } else {
      // 이미 있으면 토글만
      setShowSummary(!showSummary);
    }
  };

  const handleToggleSuggestions = async () => {
    if (!showSuggestions && !suggestions) {
      // 제안이 없으면 API 호출
      setIsLoadingSuggestions(true);
      try {
        console.log('💡 제안 요청 - personaId:', personaId);
        const url = personaId 
          ? `/api/memories/${localMemory.id}/suggestions?personaId=${personaId}`
          : `/api/memories/${localMemory.id}/suggestions`;
        console.log('💡 제안 API URL:', url);
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } else {
          alert('제안 생성 실패');
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        alert('제안을 가져올 수 없습니다');
      } finally {
        setIsLoadingSuggestions(false);
      }
    } else {
      // 이미 있으면 토글만
      setShowSuggestions(!showSuggestions);
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 기억을 삭제하시겠습니까?')) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/memories?id=${localMemory.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        onDelete?.();
      } else {
        alert('삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = async () => {
    if (isEditing) {
      // 저장
      try {
        const updatedHtml = editRef.current?.innerHTML || editContent;
        const titleToSave = editTitle.trim() || null;
        
        const res = await fetch(`/api/memories?id=${localMemory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: titleToSave, content: updatedHtml }),
        });
        
        if (res.ok) {
          // 로컬 상태 즉시 업데이트 (새로고침 없이)
          setLocalMemory(prev => ({
            ...prev,
            title: titleToSave || undefined,
            content: updatedHtml,
          }));
          setIsEditing(false);
          // 편집 모드 종료 시 상태 초기화
          setEditTitle(titleToSave || '');
          setEditContent(updatedHtml);
        } else {
          const errorData = await res.json();
          console.error('Edit error response:', errorData);
          alert(`수정에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
        }
      } catch (error) {
        console.error('Edit error:', error);
        alert('수정에 실패했습니다');
      }
    } else {
      // 편집 모드로 전환
      setEditTitle(localMemory.title || '');
      setEditContent(localMemory.content);
      setIsEditing(true);
    }
  };

  const execEditCommand = (command: string, value?: string) => {
    if (!editRef.current) return;
    editRef.current.focus();
    document.execCommand(command, false, value);
    setEditContent(editRef.current.innerHTML);
  };

  const handleAutoGroup = async () => {
    setGroupStep('loading');
    setIsGrouping(true);
    setShowGroupModal(true);
    
    try {
      const res = await fetch(`/api/memories/${localMemory.id}/auto-group`, {
        method: 'POST',
      });
      
      if (res.ok) {
        const data = await res.json();
        setGroupResult(data);
        setIsGrouping(false);
        setGroupStep('confirm'); // 확인 단계로
      } else {
        alert('자동 묶기 실패');
        setShowGroupModal(false);
        setIsGrouping(false);
      }
    } catch (error) {
      console.error('Auto group error:', error);
      alert('자동 묶기 중 오류 발생');
      setShowGroupModal(false);
      setIsGrouping(false);
    }
  };

  const handleConfirmGroup = () => {
    setGroupStep('animating');
    // 애니메이션 후 새로고침
    setTimeout(() => {
      window.location.reload();
    }, 2500);
  };

  const handleCancelGroup = async () => {
    // 생성된 그룹 삭제
    if (groupResult?.group?.id) {
      try {
        await fetch(`/api/groups?id=${groupResult.group.id}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to delete group:', error);
      }
    }
    setShowGroupModal(false);
    setGroupResult(null);
  };

  const handleConvertToGoal = async (suggestions: any) => {
    if (!confirm('이 AI 제안을 목표로 전환하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/memories/${localMemory.id}/convert-to-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ 목표가 생성되었습니다!\n"${data.goal.title}"`);
        // 인사이트 패널 새로고침을 위해
        window.dispatchEvent(new CustomEvent('goal-updated'));
      } else {
        alert('목표 생성 실패');
      }
    } catch (error) {
      console.error('Convert to goal error:', error);
      alert('목표 생성 중 오류 발생');
    }
  };

  // 텍스트가 200자 이상이면 접기 기능 활성화
  const MAX_LENGTH = 200;
  const plainContent = stripHtmlClient(localMemory.content);
  const isLong = plainContent.length > MAX_LENGTH;
  const safeHtml = sanitizeHtml(localMemory.content);

  const cardClassName = variant === 'board'
    ? `${colorClass || 'bg-amber-50 border-amber-200'} shadow-md hover:shadow-lg`
    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md';

  return (
    <div 
      id={`memory-${localMemory.id}`}
      data-editing={isEditing ? 'true' : 'false'}
      draggable={!isEditing}
      onDragStart={(e) => {
        if (isEditing) {
          e.preventDefault();
          return;
        }
        onDragStart?.(localMemory.id);
      }}
      onDragEnd={() => {
        if (isEditing) return;
        onDragEnd?.();
      }}
      className={`group relative p-3 border rounded-lg transition-all scroll-mt-4 h-full flex flex-col ${
        isEditing ? 'cursor-default' : 'cursor-move'
      } ${cardClassName}`}
      onPointerDown={(e) => {
        if (isEditing) {
          // 편집 모드에서는 드래그 시작 방지
          e.stopPropagation();
        }
      }}
    >
      {/* 드래그 아이콘 */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      
      {/* 상단 우측 버튼들 */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* AI 자동 묶기 버튼 */}
        <button
          onClick={handleAutoGroup}
          disabled={isGrouping}
          className="p-1.5 hover:bg-purple-50 rounded-lg disabled:opacity-50 transition-colors"
          title="AI로 자동 묶기"
        >
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </button>
        
        {/* 수정 버튼 */}
        <button
          onClick={handleEdit}
          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
          title={isEditing ? '저장' : '수정'}
        >
          {isEditing ? (
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </button>
        
        {/* 삭제 버튼 */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
          title="삭제"
        >
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* 내용 (편집 모드) */}
      {isEditing ? (
        <div className="mb-2">
          {/* 제목 편집 */}
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            placeholder="제목 (선택)"
            className="w-full px-3 py-2 mb-2 text-sm font-semibold border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-1 px-2 py-1 border border-blue-200 rounded-t-lg bg-blue-50/60">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execEditCommand('bold')}
              className="px-2 py-1 text-xs rounded hover:bg-white font-semibold"
              title="굵게"
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execEditCommand('italic')}
              className="px-2 py-1 text-xs rounded hover:bg-white italic"
              title="기울임"
            >
              I
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execEditCommand('underline')}
              className="px-2 py-1 text-xs rounded hover:bg-white underline"
              title="밑줄"
            >
              U
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const url = prompt('링크 URL을 입력해주세요');
                if (url) execEditCommand('createLink', url);
              }}
              className="px-2 py-1 text-xs rounded hover:bg-white"
              title="하이퍼링크"
            >
              🔗
            </button>
          </div>
          <div
            ref={editRef}
            contentEditable
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            className="w-full p-3 border border-blue-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs whitespace-pre-wrap"
            onInput={() => setEditContent(editRef.current?.innerHTML || '')}
            suppressContentEditableWarning
          />
        </div>
      ) : (
        <div className="mb-2 pr-8">
          {/* 제목 */}
          {localMemory.title && (
            <h3 className="text-sm font-semibold text-gray-900 mb-1.5">
              {localMemory.title}
            </h3>
          )}
          {/* 내용 */}
          <div
            className={`text-xs text-gray-800 leading-relaxed whitespace-pre-wrap ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
          {isLong && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="mt-1 text-blue-500 hover:text-blue-600 text-[11px] font-medium"
            >
              더보기
            </button>
          )}
          {isLong && isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="mt-1 text-gray-500 hover:text-gray-600 text-[11px] font-medium"
            >
              접기
            </button>
          )}
        </div>
      )}

      {/* AI 버튼들 */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={handleToggleSummary}
          disabled={isLoadingSummary}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {isLoadingSummary ? '생성중' : showSummary ? '요약 끄기' : '요약하기'}
        </button>
        
        <button
          onClick={handleToggleSuggestions}
          disabled={isLoadingSuggestions}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {isLoadingSuggestions ? '생성중' : showSuggestions ? '제안 끄기' : '제안받기'}
        </button>
        {variant === 'board' && (
          <>
            <span className="ml-auto" />
            <div className="flex items-center gap-1">
              {([
                { id: 'amber', class: 'bg-amber-200' },
                { id: 'blue', class: 'bg-blue-200' },
                { id: 'green', class: 'bg-green-200' },
                { id: 'pink', class: 'bg-pink-200' },
                { id: 'purple', class: 'bg-purple-200' },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onCardColorChange?.(item.id)}
                  className={`w-4 h-4 rounded-full border ${item.class} border-white shadow`}
                  title={`${item.id} 카드`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* AI 요약 표시 */}
      {showSummary && summary && (
        <div className="mb-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded">
          <div className="flex items-start gap-1">
            <svg className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="flex-1">
              <div className="text-[11px] font-semibold text-purple-700 mb-0.5">AI 요약</div>
              <p className="text-[11px] text-gray-700 leading-relaxed">{summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI 제안 표시 */}
      {showSuggestions && suggestions && (
        <div className="mb-2 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg space-y-3">
          {/* 다음 단계 */}
          {suggestions.nextSteps && suggestions.nextSteps.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <h4 className="text-[11px] font-bold text-blue-700">다음 단계</h4>
              </div>
              <ul className="space-y-1 ml-3">
                {suggestions.nextSteps.map((step: string, idx: number) => (
                  <li key={idx} className="text-[11px] text-gray-700 flex items-start gap-1">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 관련 자료 */}
          {suggestions.resources && suggestions.resources.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h4 className="text-[11px] font-bold text-green-700">관련 자료</h4>
              </div>
              <ul className="space-y-1 ml-3">
                {suggestions.resources.map((resource: any, idx: number) => (
                  <li key={idx} className="text-[11px] text-gray-700 cursor-default">
                    {resource.url ? (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-green-700 hover:underline cursor-pointer"
                      >
                        {resource.name}
                      </a>
                    ) : (
                      <span className="font-medium text-green-700">{resource.name}</span>
                    )}
                    {resource.type && <span className="text-gray-500 ml-1">({resource.type})</span>}
                    {resource.description && <p className="text-gray-600 ml-2">{resource.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 실행 계획 */}
          {suggestions.actionPlan && suggestions.actionPlan.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h4 className="text-[11px] font-bold text-orange-700">실행 계획</h4>
                </div>
                <button
                  onClick={() => handleConvertToGoal(suggestions)}
                  className="px-2 py-0.5 text-[9px] font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-full transition-all shadow-sm"
                >
                  🎯 목표로 전환
                </button>
              </div>
              <ul className="space-y-1 ml-3">
                {suggestions.actionPlan.map((plan: any, idx: number) => (
                  <li key={idx} className="text-[11px] text-gray-700 flex items-start gap-1">
                    <span className="font-bold text-orange-600">{plan.step}.</span>
                    <div>
                      <span>{plan.action}</span>
                      {plan.timeframe && <span className="text-gray-500 ml-1">({plan.timeframe})</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 첨부 파일 표시 */}
      {localMemory.attachments && localMemory.attachments.length > 0 && (
        <div className="mb-3 space-y-2">
          {localMemory.attachments.map((attachment) => {
            const isImage = attachment.mimetype.startsWith('image/');
            
            if (isImage) {
              return (
                <div key={attachment.id} className="mt-2">
                  <img
                    src={attachment.filepath}
                    alt={attachment.filename}
                    className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(attachment.filepath, '_blank')}
                    style={{ maxHeight: '300px' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">{attachment.filename}</p>
                </div>
              );
            } else {
              return (
                <a
                  key={attachment.id}
                  href={attachment.filepath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-lg">
                    {attachment.mimetype.includes('pdf') ? '📄' : '📎'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{attachment.filename}</p>
                    <p className="text-xs text-gray-500">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <span className="text-blue-500 text-sm">열기</span>
                </a>
              );
            }
          })}
        </div>
      )}
      
      <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
        <span>{timeAgo}</span>
        
        {localMemory.topic && (
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[11px]">
            {localMemory.topic}
          </span>
        )}
        
        {localMemory.nature && (
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[11px]">
            {localMemory.nature}
          </span>
        )}
        
        {localMemory.repeatCount !== undefined && localMemory.repeatCount > 1 && (
          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[11px]">
            🔁 {localMemory.repeatCount}
          </span>
        )}
      </div>

      {/* 관련 기록 링크 */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-start gap-1">
          <svg className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <div className="flex-1">
            <div className="text-[11px] text-gray-500 mb-1 flex items-center justify-between">
              <span>연결된 기록</span>
              <button
                onClick={() => onOpenLinkManager?.(localMemory)}
                className="text-[11px] text-blue-500 hover:text-blue-600"
              >
                + 추가
              </button>
            </div>
            {localMemory.relatedMemoryIds && localMemory.relatedMemoryIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {localMemory.relatedMemoryIds.slice(0, 3).map(relatedId => {
                  const relatedMemory = allMemories.find(m => m.id === relatedId);
                  if (!relatedMemory) return null;
                  const noteKey = relatedMemory.id < localMemory.id
                    ? `${relatedMemory.id}:${localMemory.id}`
                    : `${localMemory.id}:${relatedMemory.id}`;
                  const note = linkNotes?.[noteKey];
                  
                  return (
                    <div key={relatedId} className="relative group">
                      <button
                        onClick={() => {
                          const element = document.getElementById(`memory-${relatedId}`);
                          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          element?.classList.add('ring-2', 'ring-blue-400');
                          setTimeout(() => {
                            element?.classList.remove('ring-2', 'ring-blue-400');
                          }, 2000);
                        }}
                        className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200 hover:border-blue-300 line-clamp-1 max-w-[200px] text-left"
                        title={relatedMemory.title || stripHtmlClient(relatedMemory.content)}
                      >
                        {relatedMemory.title || stripHtmlClient(relatedMemory.content).substring(0, 30)}...
                      </button>
                      {note && (
                        <div className="mt-1 text-[10px] text-gray-500 line-clamp-1">
                          메모: {note}
                        </div>
                      )}
                      {/* 링크 삭제 버튼 */}
                      <button
                        onClick={async () => {
                          if (confirm('이 연결을 삭제하시겠습니까?')) {
                            try {
                              const res = await fetch(`/api/memories/link?memoryId1=${localMemory.id}&memoryId2=${relatedId}`, {
                                method: 'DELETE',
                              });
                              if (res.ok) {
                                window.location.reload();
                              } else {
                                alert('링크 삭제 실패');
                              }
                            } catch (error) {
                              console.error('Failed to delete link:', error);
                              alert('링크 삭제 중 오류 발생');
                            }
                          }
                        }}
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600 transition-all"
                        title="연결 끊기"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                {localMemory.relatedMemoryIds.length > 3 && (
                  <span className="text-xs text-gray-400 self-center">
                    +{localMemory.relatedMemoryIds.length - 3}개 더
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">아직 연결된 기록이 없습니다</p>
            )}
          </div>
        </div>
      </div>

      {/* AI 자동 묶기 모달 */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 블러 배경 */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />
          
          {/* 모달 내용 */}
          <div className="relative z-10 bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            {groupStep === 'loading' && (
              /* 1단계: 로딩 - ✨ 하나만 */
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <div className="text-7xl animate-sparkle-single">✨</div>
                </div>
                <p className="text-lg font-semibold text-gray-800 mb-2">
                  AI가 관련 기록을 찾고 있어요
                </p>
                <p className="text-sm text-gray-500 animate-pulse">
                  잠시만 기다려주세요...
                </p>
              </div>
            )}

            {groupStep === 'confirm' && groupResult && (
              /* 2단계: 확인 */
              <div className="animate-fade-in">
                {/* 폴더 아이콘 */}
                <div className="w-20 h-20 mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <path d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" 
                          fill="url(#folder-gradient)" stroke="#3B82F6" strokeWidth="1.5"/>
                    <defs>
                      <linearGradient id="folder-gradient" x1="3" y1="4" x2="21" y2="20">
                        <stop offset="0%" stopColor="#60A5FA"/>
                        <stop offset="100%" stopColor="#3B82F6"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
                  이렇게 묶을까요?
                </h3>
                <p className="text-center text-sm text-gray-600 mb-4">
                  📁 <span className="font-semibold">{groupResult.group.name}</span>
                </p>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    묶일 기록들 ({(groupResult.relatedMemories?.length || 0) + 1}개):
                  </p>
                  <ul className="space-y-2">
                    {/* 현재 기록 */}
                    <li className="text-xs text-gray-700 flex items-start gap-2 p-2 bg-white/60 rounded">
                      <span className="text-blue-500 mt-0.5">📄</span>
                      <span className="flex-1 line-clamp-2">{stripHtmlClient(localMemory.content)}</span>
                    </li>
                    {/* 관련 기록들 */}
                    {groupResult.relatedMemories?.map((m: any, idx: number) => {
                      const relatedMemory = allMemories.find(mem => mem.id === m.id);
                      return (
                        <li key={idx} className="text-xs text-gray-700 flex items-start gap-2 p-2 bg-white/60 rounded">
                          <span className="text-blue-500 mt-0.5">📄</span>
                          <span className="flex-1 line-clamp-2">{relatedMemory?.content || m.content}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelGroup}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirmGroup}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    확인
                  </button>
                </div>
              </div>
            )}

            {groupStep === 'animating' && groupResult && (
              /* 3단계: 애니메이션 */
              <div className="text-center">
                {/* 글들이 폴더로 모이는 애니메이션 */}
                <div className="relative w-full h-48 mb-6">
                  {/* 떠다니는 문서들 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl animate-gather-1">📄</div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl animate-gather-2">📄</div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl animate-gather-3">📄</div>
                  </div>
                  
                  {/* 중앙 폴더 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl animate-folder-appear">📁</div>
                  </div>
                </div>
                
                <p className="text-lg font-semibold text-gray-800 mb-2 animate-pulse">
                  그룹을 만들고 있어요
                </p>
                <p className="text-sm text-gray-500">
                  {groupResult.group.name}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
