'use client';

import { useState, useEffect, useRef } from 'react';
import { Memory } from '@/types';

interface GlobalSearchProps {
  memories: Memory[];
  onMemoryClick?: (memory: Memory) => void;
}

const stripHtmlClient = (html: string) => {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function GlobalSearch({ memories, onMemoryClick }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 검색 결과 필터링
  const searchResults = memories.filter(memory => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase();
    const content = stripHtmlClient(memory.content || '').toLowerCase();
    const title = (memory.title || '').toLowerCase();
    const topic = (memory.topic || '').toLowerCase();
    const nature = (memory.nature || '').toLowerCase();
    
    return (
      content.includes(query) ||
      title.includes(query) ||
      topic.includes(query) ||
      nature.includes(query)
    );
  }).slice(0, 10); // 최대 10개만 표시

  // / 키 입력 감지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 검색창이 이미 포커스되어 있으면 무시 (일반 입력으로 처리)
      if (document.activeElement === inputRef.current) {
        // 검색창이 포커스되어 있을 때 화살표 키로 이동
        if (searchQuery.trim() && searchResults.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
          } else if (e.key === 'Enter' && searchResults.length > 0) {
            e.preventDefault();
            const selectedMemory = searchResults[selectedIndex];
            if (selectedMemory && onMemoryClick) {
              onMemoryClick(selectedMemory);
              setSearchQuery('');
              setSelectedIndex(0);
              inputRef.current?.blur();
              setIsFocused(false);
            }
          }
        }
        return;
      }

      // 다른 입력 필드에 포커스가 있으면 무시
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      // / 키 입력 시 검색창 포커스 및 열기
      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      }

      // ESC 키로 닫기
      if (e.key === 'Escape' && isFocused) {
        setSearchQuery('');
        setSelectedIndex(0);
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, searchQuery, searchResults, selectedIndex, onMemoryClick]);

  // 선택된 항목으로 스크롤
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // 외부 클릭 시 결과 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    if (isFocused) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFocused]);

  const showResults = isFocused && searchQuery.trim() && searchResults.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto mt-2">
      {/* 검색 입력 필드 */}
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setSelectedIndex(0);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          // 결과 클릭을 위해 약간의 지연
          setTimeout(() => setIsFocused(false), 200);
        }}
        placeholder="기억 검색... (제목, 내용, 주제, 성격)"
        className="w-full px-3 py-1.5 text-sm font-medium border-b border-gray-200 focus:outline-none focus:border-blue-400 transition-colors"
      />

      {/* 검색 결과 드롭다운 */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto" ref={resultsRef}>
          {searchResults.map((memory, index) => {
            const plainContent = stripHtmlClient(memory.content || '');
            const isSelected = index === selectedIndex;
            
            return (
              <button
                key={memory.id}
                onClick={() => {
                  if (onMemoryClick) {
                    onMemoryClick(memory);
                  }
                  setSearchQuery('');
                  setSelectedIndex(0);
                  inputRef.current?.blur();
                  setIsFocused(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {memory.title && (
                      <div className="font-semibold text-gray-900 mb-1 truncate">
                        {memory.title}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {plainContent.substring(0, 100)}
                      {plainContent.length > 100 ? '...' : ''}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {memory.topic && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {memory.topic}
                        </span>
                      )}
                      {memory.nature && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                          {memory.nature}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(memory.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 검색어는 있지만 결과가 없을 때 */}
      {isFocused && searchQuery.trim() && searchResults.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 text-center text-gray-400 text-sm">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
}
