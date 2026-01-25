'use client';

import { useState } from 'react';
import { SummaryResponse, Memory } from '@/types';
import PixelIcon from './PixelIcon';

const stripHtmlClient = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// 관련 기억 카드 컴포넌트
function RelatedMemoryItem({ memory }: { memory: Memory }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 150;
  const plainContent = stripHtmlClient(memory.content);
  const isLong = plainContent.length > MAX_LENGTH;
  const displayContent = isExpanded || !isLong 
    ? plainContent 
    : plainContent.slice(0, MAX_LENGTH);

  return (
    <div className="text-sm text-gray-600 pl-3 border-l-2 border-green-300 whitespace-pre-wrap">
      {displayContent}
      {isLong && !isExpanded && (
        <>
          ...
          <button
            onClick={() => setIsExpanded(true)}
            className="ml-2 text-green-600 hover:text-green-700 font-medium"
          >
            더보기
          </button>
        </>
      )}
      {isLong && isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="ml-2 text-gray-500 hover:text-gray-600 font-medium"
        >
          접기
        </button>
      )}
    </div>
  );
}

interface QueryPanelProps {
  personaId: string | null;
}

export default function QueryPanel({ personaId }: QueryPanelProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummaryResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, personaId }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (error) {
      console.error('Failed to get summary:', error);
      alert('요약 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const quickQueries = [
    '요즘 내가 무슨 생각 많이 했어?',
    '아이디어 관련해서 뭐 쌓여 있어?',
    '업무 관련 기록 보여줘',
    '최근 회의록 요약해줘',
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 요즘 내가 무슨 생각 많이 했어?"
          className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:border-green-400 focus:outline-none"
          disabled={loading}
        />

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '생각 중...' : '물어보기'}
          </button>

          {/* 빠른 질문 */}
          <div className="flex gap-2 ml-2">
            {quickQueries.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuery(q)}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* 결과 표시 */}
      {result && (
        <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-green-900 mb-2">요약</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
          </div>

          {result.relatedMemories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-900 mb-2">
                관련 기억 ({result.relatedMemories.length}개)
              </h3>
              <div className="space-y-2">
                {result.relatedMemories.slice(0, 5).map((memory) => (
                  <RelatedMemoryItem key={memory.id} memory={memory} />
                ))}
              </div>
            </div>
          )}

          {result.suggestions && result.suggestions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-1">
                <PixelIcon name="lightbulb" size={16} />
                제안
              </h3>
              <ul className="space-y-1">
                {result.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-gray-700">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
