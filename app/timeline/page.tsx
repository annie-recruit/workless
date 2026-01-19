'use client';

import { useState, useEffect } from 'react';
import { Memory } from '@/types';
import { format, startOfDay, endOfDay, subDays, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

export default function TimelinePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(7); // 기본 7일

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  // 날짜 범위 생성
  const days = eachDayOfInterval({
    start: subDays(new Date(), dateRange - 1),
    end: new Date()
  });

  // 일별 데이터 분석
  const getDayData = (day: Date) => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();
    
    const dayMemories = memories.filter(m => 
      m.createdAt >= dayStart && m.createdAt <= dayEnd
    );

    // 시간대별 분포 (24시간)
    const hourlyActivity = new Array(24).fill(0);
    dayMemories.forEach(m => {
      const hour = new Date(m.createdAt).getHours();
      hourlyActivity[hour]++;
    });

    // 주제별 분포
    const topicCounts: Record<string, number> = {};
    dayMemories.forEach(m => {
      if (m.topic) {
        topicCounts[m.topic] = (topicCounts[m.topic] || 0) + 1;
      }
    });

    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // 가장 활발한 시간대 찾기
    const maxActivity = Math.max(...hourlyActivity);
    const peakHours = hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      memories: dayMemories,
      count: dayMemories.length,
      hourlyActivity,
      topTopics,
      peakHours,
      maxActivity
    };
  };

  // 온도 색상 계산 (활동량 기반)
  const getTemperatureColor = (count: number, max: number) => {
    if (count === 0) return 'bg-gray-100';
    const ratio = count / max;
    if (ratio < 0.2) return 'bg-blue-200';
    if (ratio < 0.4) return 'bg-green-300';
    if (ratio < 0.6) return 'bg-yellow-400';
    if (ratio < 0.8) return 'bg-orange-500';
    return 'bg-red-600';
  };

  const maxDayCount = Math.max(...days.map(day => getDayData(day).count), 1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 헤더 */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link href="/" className="text-sm text-blue-500 hover:text-blue-600 mb-2 inline-block">
              ← 돌아가기
            </Link>
            <h1 className="text-3xl font-black text-gray-900">📊 타임라인</h1>
            <p className="text-sm text-gray-500 mt-1">당신의 기록 활동을 시간대별로 분석해요</p>
          </div>
          
          {/* 기간 선택 */}
          <div className="flex gap-2">
            {[7, 14, 30].map(days => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === days
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {days}일
              </button>
            ))}
          </div>
        </div>

        {/* 전체 통계 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{memories.length}</div>
            <div className="text-xs text-gray-500">총 기록</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {(memories.length / dateRange).toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">일평균 기록</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {days.filter(d => getDayData(d).count > 0).length}
            </div>
            <div className="text-xs text-gray-500">활동한 날</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {Math.max(...days.map(d => getDayData(d).count))}
            </div>
            <div className="text-xs text-gray-500">최대 기록/일</div>
          </div>
        </div>
      </div>

      {/* 일별 타임라인 */}
      <div className="max-w-6xl mx-auto space-y-4">
        {days.reverse().map(day => {
          const data = getDayData(day);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          
          return (
            <div key={day.toISOString()} className="bg-white rounded-xl shadow-sm p-6">
              {/* 날짜 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                    {format(day, 'M월 d일 EEEE', { locale: ko })}
                    {isToday && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">오늘</span>}
                  </div>
                  <div className="text-sm text-gray-500">
                    기록 {data.count}개
                  </div>
                </div>

                {/* 주요 주제 */}
                {data.topTopics.length > 0 && (
                  <div className="flex items-center gap-2">
                    {data.topTopics.map(([topic, count], idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                        {topic} ({count})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 온도 바 (가로 온도계) */}
              {data.count > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 w-16">활동량</span>
                    <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full transition-all ${getTemperatureColor(data.count, maxDayCount)}`}
                        style={{ width: `${(data.count / maxDayCount) * 100}%` }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {data.count}개
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 시간대별 활동 (24시간) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-16">시간대</span>
                    <div className="flex-1 flex gap-0.5">
                      {data.hourlyActivity.map((count, hour) => (
                        <div
                          key={hour}
                          className={`flex-1 rounded-sm transition-all ${
                            count > 0 ? getTemperatureColor(count, data.maxActivity) : 'bg-gray-50'
                          }`}
                          style={{ height: count > 0 ? '24px' : '12px' }}
                          title={`${hour}시: ${count}개`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 피크 시간대 */}
                  {data.peakHours.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                      <span className="text-gray-500">🔥 활발한 시간:</span>
                      {data.peakHours.map((h, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                          {h.hour}시 ({h.count}개)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  이 날은 기록이 없어요
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
