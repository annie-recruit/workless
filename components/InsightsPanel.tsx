'use client';

import { useState, useEffect } from 'react';

interface Insights {
  summary: string;
  topTopics: { topic: string; count: number }[];
  trends: string[];
  suggestions: string[];
}

export default function InsightsPanel() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/insights');
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">분석 중...</div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">인사이트를 불러올 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* 상단 배너 - 메인 헤더와 단차 맞추기 */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-6 py-12 text-white">
        <div className="mb-3">
          <div className="text-sm opacity-90 mb-1">
            {new Date().toLocaleDateString('ko-KR', { 
              month: 'long', 
              day: 'numeric',
              weekday: 'short'
            })}
          </div>
          <h2 className="text-2xl font-bold">데일리 정리 시간</h2>
        </div>
        <p className="text-sm opacity-90">
          오늘 하루를 돌아보고<br />
          내일을 준비해요
        </p>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="space-y-6 p-6">
        {/* 새로고침 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={fetchInsights}
            className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
        </div>

        {/* 전체 요약 */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">💭 요약</h3>
          <p className="text-gray-700 leading-relaxed text-sm">
            {insights.summary}
          </p>
        </div>

        {/* 주요 주제 */}
        {insights.topTopics.length > 0 && (
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🏷️ 주요 주제</h3>
            <div className="space-y-2">
              {insights.topTopics.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.topic}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ 
                          width: `${(item.count / insights.topTopics[0].count) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">
                      {item.count}개
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 트렌드 */}
        {insights.trends.length > 0 && (
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📈 트렌드</h3>
            <ul className="space-y-2">
              {insights.trends.map((trend, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{trend}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 제안 */}
        {insights.suggestions.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
            <h3 className="text-sm font-semibold text-green-900 mb-3">💡 제안</h3>
            <ul className="space-y-2">
              {insights.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                  <span className="mt-0.5">✓</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
