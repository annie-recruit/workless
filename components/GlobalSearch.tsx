'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Memory } from '@/types';
import { useLanguage } from './LanguageContext';

interface GlobalSearchProps {
  memories: Memory[];
  onMemoryClick?: (memory: Memory) => void;
  isOpen: boolean;
  onClose: () => void;
}

const stripHtmlClient = (html: string) => {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function GlobalSearch({ memories, onMemoryClick, isOpen, onClose }: GlobalSearchProps) {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 검색 결과 필터링
  const searchResults = useMemo(() => {
    return memories
      .filter((memory) => {
        if (!searchQuery.trim()) return false;
        const query = searchQuery.toLowerCase();
        const content = stripHtmlClient(memory.content || '').toLowerCase();
        const title = (memory.title || '').toLowerCase();
        const topic = (memory.topic || '').toLowerCase();
        const nature = (memory.nature || '').toLowerCase();

        return content.includes(query) || title.includes(query) || topic.includes(query) || nature.includes(query);
      })
      .slice(0, 10);
  }, [memories, searchQuery]);

  const closeAndReset = () => {
    setSearchQuery('');
    setSelectedIndex(0);
    setIsFocused(false);
    onClose();
  };

  // 닫힐 때: 상태 초기화
  useEffect(() => {
    if (isOpen) return;
    setSearchQuery('');
    setSelectedIndex(0);
    setIsFocused(false);
  }, [isOpen]);

  // 검색바 열릴 때: focus
  useEffect(() => {
    if (!isOpen) return;

    setIsFocused(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  // 선택된 항목으로 스크롤
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0 && searchResults.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, searchResults.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[10000] pointer-events-none flex justify-center px-4 pt-12">
      <div
        ref={containerRef}
        className="w-full max-w-2xl bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden pointer-events-auto"
      >
        <div className="px-3 py-2 border-b border-gray-100/50">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                closeAndReset();
                return;
              }

              if (!searchQuery.trim() || searchResults.length === 0) return;

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const selectedMemory = searchResults[selectedIndex];
                if (selectedMemory && onMemoryClick) onMemoryClick(selectedMemory);
                closeAndReset();
              }
            }}
            placeholder={t('search.placeholder')}
            className="w-full px-4 py-2 text-sm font-medium text-gray-900 border-0 focus:ring-0 bg-transparent transition-colors"
          />
          <div className="px-4 pb-1 text-[10px] text-gray-400 flex items-center gap-2">
            <span className="px-1 border border-gray-200 rounded">↑↓</span> {t('search.guide.move')}
            <span className="px-1 border border-gray-200 rounded">Enter</span> {t('search.guide.select')}
            <span className="px-1 border border-gray-200 rounded">ESC</span> {t('search.guide.close')}
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto" ref={resultsRef}>
          {searchQuery.trim().length === 0 ? (
            null
          ) : searchResults.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">{t('search.noResult')}</div>
          ) : (
            searchResults.map((memory, index) => {
              const plainContent = stripHtmlClient(memory.content || '');
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={memory.id}
                  onClick={() => {
                    if (onMemoryClick) onMemoryClick(memory);
                    closeAndReset();
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {memory.title && <div className="font-semibold text-gray-900 mb-1 truncate">{memory.title}</div>}
                      <div className="text-sm text-gray-600 line-clamp-2">
                        {plainContent.substring(0, 100)}
                        {plainContent.length > 100 ? '...' : ''}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {memory.topic && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{memory.topic}</span>
                        )}
                        {memory.nature && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                            {memory.nature}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(memory.createdAt).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US')}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
