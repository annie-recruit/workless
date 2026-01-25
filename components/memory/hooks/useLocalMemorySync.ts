import { useEffect, useRef, useState } from 'react';
import type { Memory } from '@/types';

function normalizeIds(ids: string[] | undefined) {
  return (ids || []).slice().sort().join(',');
}

export function useLocalMemorySync(memory: Memory) {
  const [localMemory, setLocalMemory] = useState<Memory>(memory);
  const localRef = useRef<Memory>(localMemory);

  useEffect(() => {
    localRef.current = localMemory;
  }, [localMemory]);

  useEffect(() => {
    const prev = localRef.current;
    const prevIds = normalizeIds(prev.relatedMemoryIds);
    const nextIds = normalizeIds(memory.relatedMemoryIds);

    if (prev.id === memory.id && prevIds === nextIds) return;

    const t = window.setTimeout(() => setLocalMemory(memory), 0);
    return () => window.clearTimeout(t);
  }, [memory]);

  return [localMemory, setLocalMemory] as const;
}
