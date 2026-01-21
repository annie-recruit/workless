'use client';

import { useState } from 'react';
import { Memory } from '@/types';
import { formatDistanceToNow, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TimelineViewProps {
  memories: Memory[];
  onMemoryClick?: (memory: Memory) => void;
}

const stripHtmlClient = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export default function TimelineView({ memories, onMemoryClick }: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('timeline');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 타임라인 뷰: 시간순 정렬
  const sortedMemories = [...memories].sort((a, b) => b.createdAt - a.createdAt);

  // 날짜별 그룹화
  const memoriesByDate = sortedMemories.reduce((acc, memory) => {
    const dateKey = format(memory.createdAt, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(memory);
    return acc;
  }, {} as Record<string, Memory[]>);

  // 캘린더 뷰: 월별 날짜 계산
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getMemoriesForDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return memoriesByDate[dateKey] || [];
  };

  const getNatureColor = (nature?: string) => {
    switch (nature) {
      case '아이디어': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case '요청': return 'bg-blue-100 text-blue-800 border-blue-300';
      case '고민': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">📅 타임라인</h2>
            
            {/* 뷰 모드 토글 */}
            <div className="flex bg-white/20 rounded-lg p-1 backdrop-blur-sm">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'timeline' 
                    ? 'bg-white text-blue-600' 
                    : 'text-white hover:text-white/80'
                }`}
              >
                타임라인
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'calendar' 
                    ? 'bg-white text-blue-600' 
                    : 'text-white hover:text-white/80'
                }`}
              >
                캘린더
              </button>
            </div>
          </div>

          {/* 캘린더 네비게이션 */}
          {viewMode === 'calendar' && (
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="text-white hover:bg-white/20 p-1 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToToday}
                className="text-white hover:bg-white/20 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                오늘
              </button>
              <span className="text-white font-semibold min-w-[120px] text-center">
                {format(currentMonth, 'yyyy년 M월', { locale: ko })}
              </span>
              <button
                onClick={goToNextMonth}
                className="text-white hover:bg-white/20 p-1 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="p-6">
        {viewMode === 'timeline' ? (
          // 타임라인 뷰
          <div className="space-y-8">
            {Object.entries(memoriesByDate).length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                기록이 없습니다
              </div>
            ) : (
              Object.entries(memoriesByDate).map(([dateKey, dayMemories]) => (
                <div key={dateKey} className="relative">
                  {/* 날짜 헤더 */}
                  <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white/80 backdrop-blur-sm py-2 z-10">
                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex flex-col items-center justify-center text-white shadow-md">
                      <div className="text-2xl font-bold">
                        {format(new Date(dateKey), 'd')}
                      </div>
                      <div className="text-xs opacity-90">
                        {format(new Date(dateKey), 'MMM', { locale: ko })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(dateKey), 'yyyy년 M월 d일 EEEE', { locale: ko })}
                      </div>
                      <div className="text-xs text-gray-400">
                        {dayMemories.length}개의 기록
                      </div>
                    </div>
                  </div>

                  {/* 기록 카드들 */}
                  <div className="ml-20 space-y-3">
                    {dayMemories.map((memory, idx) => (
                      <div
                        key={memory.id}
                        onClick={() => onMemoryClick?.(memory)}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          {/* 시간 */}
                          <div className="flex-shrink-0 text-xs text-gray-400 font-mono mt-1">
                            {format(memory.createdAt, 'HH:mm')}
                          </div>

                          {/* 내용 */}
                          <div className="flex-1">
                            <p className="text-gray-800 text-sm leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                              {memory.content}
                            </p>

                            {/* 태그들 */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {memory.nature && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getNatureColor(memory.nature)}`}>
                                  {memory.nature}
                                </span>
                              )}
                              {memory.clusterTag && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  {memory.clusterTag}
                                </span>
                              )}
                              {memory.attachments && memory.attachments.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                                  📎 {memory.attachments.length}개
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // 캘린더 뷰
          <div>
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div
                  key={day}
                  className={`text-center text-sm font-semibold py-2 ${
                    idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                const dayMemories = getMemoriesForDay(day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] border rounded-lg p-2 transition-all ${
                      isCurrentMonth
                        ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                        : 'bg-gray-50 border-gray-100'
                    } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday 
                        ? 'text-blue-600 font-bold' 
                        : isCurrentMonth 
                          ? 'text-gray-700' 
                          : 'text-gray-400'
                    }`}>
                      {format(day, 'd')}
                    </div>

                    {/* 기록 표시 (점으로) */}
                    {dayMemories.length > 0 && (
                      <div className="space-y-1">
                        {dayMemories.slice(0, 3).map((memory) => (
                          <div
                            key={memory.id}
                            onClick={() => onMemoryClick?.(memory)}
                            className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate ${getNatureColor(memory.nature)}`}
                            title={stripHtmlClient(memory.content)}
                          >
                            {stripHtmlClient(memory.content).substring(0, 15)}...
                          </div>
                        ))}
                        {dayMemories.length > 3 && (
                          <div className="text-xs text-gray-400 text-center">
                            +{dayMemories.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
