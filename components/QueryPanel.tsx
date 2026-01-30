'use client';

import { useState } from 'react';
import { SummaryResponse, Memory } from '@/types';
import PixelIcon from './PixelIcon';
import { useLanguage } from './LanguageContext';

const stripHtmlClient = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// 관련 기억 카드 컴포넌트
function RelatedMemoryItem({ memory }: { memory: Memory }) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 150;
  const plainContent = stripHtmlClient(memory.content);
  const isLong = plainContent.length > MAX_LENGTH;
  const displayContent = isExpanded || !isLong 
    ? plainContent 
    : plainContent.slice(0, MAX_LENGTH);

  return (
    <div className="text-sm text-gray-600 pl-3 border-l-2 border-green-300 whitespace-pre-wrap font-galmuri11">
      {displayContent}
      {isLong && !isExpanded && (
        <>
          ...
          <button
            onClick={() => setIsExpanded(true)}
            className="ml-2 text-green-600 hover:text-green-700 font-medium"
          >
            {t('memory.card.action.more')}
          </button>
        </>
      )}
      {isLong && isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="ml-2 text-gray-500 hover:text-gray-600 font-medium"
        >
          {t('memory.card.action.fold')}
        </button>
      )}
    </div>
  );
}

interface QueryPanelProps {
  personaId: string | null;
}

export default function QueryPanel({ personaId }: QueryPanelProps) {
  const { t } = useLanguage();
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
      alert(t('query.error.failed'));
    } finally {
      setLoading(false);
    }
  };

  const quickQueries = [
    t('query.quick.1'),
    t('query.quick.2'),
    t('query.quick.3'),
    t('query.quick.4'),
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 font-galmuri11">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('query.placeholder')}
          className="w-full px-4 py-3 text-base text-gray-900 border border-gray-200 rounded-xl focus:border-green-400 focus:outline-none"
          disabled={loading}
        />

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('query.button.thinking') : t('query.button.ask')}
          </button>

          {/* 빠른 질문 */}
          <div className="flex gap-2 ml-2 flex-wrap">
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
            <h3 className="text-sm font-semibold text-green-900 mb-2">{t('query.result.summary')}</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
          </div>

          {result.relatedMemories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-900 mb-2">
                {t('query.result.related').replace('{count}', result.relatedMemories.length.toString())}
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
                {t('query.result.suggestions')}
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
