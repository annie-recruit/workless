import { useEffect, useRef, useState } from 'react';
import type { Memory } from '@/types';

function normalizeIds(ids: string[] | undefined) {
  return (ids || []).slice().sort().join(',');
}

export function useLocalMemorySync(memory: Memory) {
  const [localMemory, setLocalMemory] = useState<Memory>(memory);
  const prevMemoryRef = useRef<Memory>(memory);

  useEffect(() => {
    const prev = prevMemoryRef.current;
    const prevIds = normalizeIds(prev.relatedMemoryIds);
    const nextIds = normalizeIds(memory.relatedMemoryIds);
    const prevTitle = prev.title;
    const nextTitle = memory.title;
    const prevContent = prev.content;
    const nextContent = memory.content;

    // ID는 같은데 내용이나 연결이 변경된 경우에만 업데이트
    const hasChanged = 
      prevIds !== nextIds || 
      prevTitle !== nextTitle || 
      prevContent !== nextContent;

    if (prev.id === memory.id && !hasChanged) {
      return;
    }

    setLocalMemory(memory);
    prevMemoryRef.current = memory;
  }, [memory, memory.relatedMemoryIds, memory.title, memory.content]);

  return [localMemory, setLocalMemory] as const;
}
