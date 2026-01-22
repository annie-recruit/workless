'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Memory, CalendarBlockConfig } from '@/types';

interface CalendarBlockProps {
  blockId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  config: CalendarBlockConfig;
  memories: Memory[];
  onUpdate: (blockId: string, updates: Partial<{ x: number; y: number; config: CalendarBlockConfig }>) => void;
  onDelete: (blockId: string) => void;
  onMemoryClick: (memoryId: string) => void;
  onDateClick: (date: Date, memoryIds: string[]) => void;
  onLinkMemory: (memoryId: string) => void;
  isDragging: boolean;
  isClicked: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick?: () => void;
}

export default function CalendarBlock({
  blockId,
  x,
  y,
  width = 350,
  height = 400,
  config,
  memories,
  onUpdate,
  onDelete,
  onMemoryClick,
  onDateClick,
  isDragging,
  isClicked,
  onPointerDown,
  onClick,
}: CalendarBlockProps) {
  const [currentDate, setCurrentDate] = useState(config.selectedDate ? new Date(config.selectedDate) : new Date());
  const [isEditing, setIsEditing] = useState(false);
  const view = config.view || 'month';
  
  // config.view가 변경되면 currentDate도 업데이트
  useEffect(() => {
    if (config.selectedDate) {
      setCurrentDate(new Date(config.selectedDate));
    }
  }, [config.selectedDate]);

  // 날짜별 메모리 그룹화
  const memoriesByDate = memories.reduce((acc, memory) => {
    const date = format(new Date(memory.createdAt), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(memory);
    return acc;
  }, {} as Record<string, Memory[]>);

  // 연결된 메모리들
  const linkedMemories = config.linkedMemoryIds
    ? memories.filter(m => config.linkedMemoryIds!.includes(m.id))
    : [];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleDateClick = (date: Date, e?: React.MouseEvent) => {
    // 버튼 클릭 이벤트 전파 방지
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // 일 뷰로 전환
    const newConfig = {
      ...config,
      view: 'day' as const,
      selectedDate: date.getTime(),
    };
    
    onUpdate(blockId, {
      config: newConfig
    });
  };

  const handleViewChange = (newView: 'month' | 'week' | 'day') => {
    onUpdate(blockId, {
      config: { ...config, view: newView }
    });
  };

  return (
    <div
      data-calendar-block={blockId}
      className="absolute bg-white rounded-lg shadow-lg border border-gray-200 p-4 cursor-move"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: isDragging ? 30 : (isClicked ? 20 : 10),
        opacity: isDragging ? 0.85 : 1,
        transition: 'none',
        willChange: isDragging ? 'transform' : 'auto',
        pointerEvents: isDragging ? 'none' : 'auto',
        contain: 'layout style paint',
      }}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        // 버튼이나 링크 클릭이 아닐 때만 클릭 이벤트 처리
        const target = e.target as HTMLElement;
        if (!target.closest('button') && !target.closest('a') && !target.closest('input')) {
          onClick?.();
        }
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="text-sm font-semibold text-gray-800">캘린더</h3>
        </div>
        <div className="flex items-center gap-1">
          {view === 'month' && (
            <>
              <button
                onClick={() => handleViewChange('week')}
                className="px-2 py-1 text-xs rounded text-gray-600 hover:bg-gray-100"
              >
                주
              </button>
              <button
                onClick={() => onDelete(blockId)}
                className="ml-2 text-gray-400 hover:text-red-500 text-xs"
                title="삭제"
              >
                ×
              </button>
            </>
          )}
          {view === 'day' && (
            <button
              onClick={() => onDelete(blockId)}
              className="text-gray-400 hover:text-red-500 text-xs"
              title="삭제"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 월 뷰 */}
      {view === 'month' && (
        <div className="flex flex-col h-[calc(100%-60px)]">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {format(currentDate, 'yyyy년 M월', { locale: ko })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* 캘린더 그리드 */}
          <div className="grid grid-cols-7 gap-1 flex-1 overflow-y-auto">
            {days.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayMemories = memoriesByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isLinked = config.linkedMemoryIds?.some(id => 
                dayMemories.some(m => m.id === id)
              );

              return (
                <button
                  key={idx}
                  onClick={(e) => handleDateClick(day, e)}
                  onPointerDown={(e) => {
                    // 드래그 방지를 위해 포인터 이벤트는 전파
                    e.stopPropagation();
                  }}
                  className={`
                    relative p-1 text-xs rounded transition-colors cursor-pointer
                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                    ${isToday ? 'bg-blue-100 font-bold' : 'hover:bg-gray-100'}
                    ${isLinked ? 'ring-2 ring-blue-400' : ''}
                  `}
                  title={dayMemories.length > 0 ? `${dayMemories.length}개의 기록` : ''}
                >
                  <div className="text-center">{format(day, 'd')}</div>
                  {dayMemories.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5">
                      {dayMemories.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 h-1 bg-blue-500 rounded-full"
                        />
                      ))}
                      {dayMemories.length > 3 && (
                        <div className="w-1 h-1 bg-blue-300 rounded-full" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 주 뷰 */}
      {view === 'week' && (
        <div className="flex flex-col h-[calc(100%-60px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onUpdate(blockId, {
                    config: { ...config, view: 'month' }
                  });
                }}
                className="p-1 hover:bg-gray-100 rounded"
                title="월 뷰로 돌아가기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-sm font-semibold text-gray-800">주 뷰</h3>
            </div>
            <button
              onClick={() => onDelete(blockId)}
              className="text-gray-400 hover:text-red-500 text-xs"
              title="삭제"
            >
              ×
            </button>
          </div>
          <div className="text-center text-gray-500 text-sm py-8">
            주 뷰는 곧 추가될 예정입니다
          </div>
        </div>
      )}

      {/* 일 뷰 */}
      {view === 'day' && config.selectedDate && (
        <DayView
          date={new Date(config.selectedDate)}
          memories={memoriesByDate[format(new Date(config.selectedDate), 'yyyy-MM-dd')] || []}
          allMemories={memories}
          todos={config.todos || []}
          onBack={() => {
            onUpdate(blockId, {
              config: { ...config, view: 'month' }
            });
          }}
          onAddTodo={(text, time, linkedMemoryIds) => {
            const selectedDate = config.selectedDate || Date.now();
            const newTodo = {
              id: `todo-${Date.now()}`,
              text,
              completed: false,
              date: selectedDate,
              time: time,
              linkedMemoryIds: linkedMemoryIds || [],
              createdAt: Date.now(),
            };
            onUpdate(blockId, {
              config: {
                ...config,
                todos: [...(config.todos || []), newTodo]
              }
            });
          }}
          onToggleTodo={(todoId) => {
            onUpdate(blockId, {
              config: {
                ...config,
                todos: (config.todos || []).map(todo =>
                  todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
                )
              }
            });
          }}
          onDeleteTodo={(todoId) => {
            onUpdate(blockId, {
              config: {
                ...config,
                todos: (config.todos || []).filter(todo => todo.id !== todoId)
              }
            });
          }}
          onMemoryClick={onMemoryClick}
        />
      )}

    </div>
  );
}

// 일 뷰 컴포넌트
interface DayViewProps {
  date: Date;
  memories: Memory[];
  allMemories: Memory[];  // 모든 기록 (태그용)
  todos: Array<{ id: string; text: string; completed: boolean; date: number; time?: string; linkedMemoryIds?: string[]; createdAt: number }>;
  onBack: () => void;
  onAddTodo: (text: string, time?: string, linkedMemoryIds?: string[]) => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onMemoryClick: (memoryId: string) => void;
}

function DayView({ date, memories, allMemories, todos, onBack, onAddTodo, onToggleTodo, onDeleteTodo, onMemoryClick }: DayViewProps) {
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoTime, setNewTodoTime] = useState('');
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);

  const stripHtml = (html: string) => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      // 공백이나 줄바꿈이 없으면 멘션 모드
      if (!query.includes(' ') && !query.includes('\n')) {
        setMentionQuery(query);
        setMentionPosition(lastAtIndex);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
    
    setNewTodoText(value);
  };

  const filteredMemoriesForMention = allMemories.filter(m => {
    if (!mentionQuery) return true;
    const title = m.title || '';
    const content = stripHtml(m.content || '');
    const searchText = (title + ' ' + content).toLowerCase();
    return searchText.includes(mentionQuery.toLowerCase());
  }).slice(0, 5);

  const handleSelectMemory = (memoryId: string) => {
    const beforeMention = newTodoText.substring(0, mentionPosition);
    const afterMention = newTodoText.substring(mentionPosition + mentionQuery.length + 1);
    const memory = allMemories.find(m => m.id === memoryId);
    const memoryTitle = memory?.title || format(new Date(memory?.createdAt || Date.now()), 'M월 d일');
    const newText = `${beforeMention}@${memoryTitle}${afterMention}`;
    setNewTodoText(newText);
    setShowMentions(false);
    setMentionQuery('');
    if (!selectedMemoryIds.includes(memoryId)) {
      setSelectedMemoryIds([...selectedMemoryIds, memoryId]);
    }
  };

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      onAddTodo(newTodoText.trim(), newTodoTime || undefined, selectedMemoryIds.length > 0 ? selectedMemoryIds : undefined);
      setNewTodoText('');
      setNewTodoTime('');
      setSelectedMemoryIds([]);
      setShowAddTodo(false);
      setShowMentions(false);
    }
  };

  // 시간순 정렬
  const sortedMemories = [...memories].sort((a, b) => a.createdAt - b.createdAt);
  const dateKey = format(date, 'yyyy-MM-dd');
  const dateTodos = todos.filter(todo => {
    const todoDateKey = format(new Date(todo.date), 'yyyy-MM-dd');
    return todoDateKey === dateKey;
  }).sort((a, b) => {
    // 시간이 있으면 시간 기준 정렬, 없으면 생성 시간 기준
    if (a.time && b.time) {
      return a.time.localeCompare(b.time);
    }
    if (a.time) return -1;
    if (b.time) return 1;
    return a.createdAt - b.createdAt;
  });

  return (
    <div className="flex flex-col h-[calc(100%-60px)] overflow-y-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 hover:bg-gray-100 rounded"
            title="월 뷰로 돌아가기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              {format(date, 'yyyy년 M월 d일 (E)', { locale: ko })}
            </h3>
            <p className="text-xs text-gray-500">
              {memories.length}개의 기록
            </p>
          </div>
        </div>
      </div>

      {/* 일정(투두) 섹션 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-700">일정</h4>
          {!showAddTodo && (
            <button
              onClick={() => setShowAddTodo(true)}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              + 추가
            </button>
          )}
        </div>
        
        {showAddTodo && (
          <div className="mb-2 space-y-1.5 relative">
            <div className="flex items-center gap-1">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newTodoText}
                  onChange={handleTextChange}
                  onKeyDown={(e) => {
                    if (showMentions && filteredMemoriesForMention.length > 0) {
                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                        e.preventDefault();
                        // 간단하게 첫 번째 항목 선택
                        if (e.key === 'Enter' && filteredMemoriesForMention[0]) {
                          handleSelectMemory(filteredMemoriesForMention[0].id);
                        }
                        return;
                      }
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddTodo();
                    } else if (e.key === 'Escape') {
                      setShowAddTodo(false);
                      setNewTodoText('');
                      setNewTodoTime('');
                      setSelectedMemoryIds([]);
                      setShowMentions(false);
                    }
                  }}
                  placeholder="일정 입력... (@로 기록 태그)"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                {showMentions && filteredMemoriesForMention.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
                    {filteredMemoriesForMention.map(memory => (
                      <button
                        key={memory.id}
                        onClick={() => handleSelectMemory(memory.id)}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2"
                      >
                        <span className="flex-1 truncate">
                          {memory.title || format(new Date(memory.createdAt), 'M월 d일')}
                        </span>
                        {selectedMemoryIds.includes(memory.id) && (
                          <span className="text-blue-500">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="time"
                value={newTodoTime}
                onChange={(e) => setNewTodoTime(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="시간 (선택)"
              />
              <button
                onClick={handleAddTodo}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                추가
              </button>
              <button
                onClick={() => {
                  setShowAddTodo(false);
                  setNewTodoText('');
                  setNewTodoTime('');
                  setSelectedMemoryIds([]);
                  setShowMentions(false);
                }}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {dateTodos.length > 0 ? (
            dateTodos.map(todo => (
              <div key={todo.id} className="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => onToggleTodo(todo.id)}
                  className="w-3 h-3"
                />
                {todo.time && (
                  <span className="text-xs text-gray-500 font-medium min-w-[45px]">
                    {todo.time}
                  </span>
                )}
                <div className="flex-1">
                  <div
                    className={`text-xs flex flex-wrap items-center gap-1 ${
                      todo.completed ? 'line-through text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {(() => {
                      // 텍스트에서 @ 태그를 찾아서 인라인 태그로 렌더링
                      const text = todo.text;
                      const parts: Array<{ type: 'text' | 'tag'; content: string; memoryId?: string; displayText?: string }> = [];
                      let lastIndex = 0;
                      // @ 뒤에 공백이 있을 수도 있고 없을 수도 있음: @기록제목 또는 @ 기록제목
                      const mentionRegex = /@\s*([^\s@]+)/g;
                      let match;
                      
                      while ((match = mentionRegex.exec(text)) !== null) {
                        // @ 이전 텍스트 추가
                        if (match.index > lastIndex) {
                          parts.push({
                            type: 'text',
                            content: text.substring(lastIndex, match.index)
                          });
                        }
                        
                        // @ 태그 부분 처리 (공백 제거)
                        const mentionText = match[1].trim();
                        const fullMatch = match[0]; // @ 기호 포함 전체 매칭 (공백 포함 가능)
                        
                        // linkedMemoryIds에서 매칭되는 기록 찾기
                        let matchedMemory = null;
                        if (todo.linkedMemoryIds && todo.linkedMemoryIds.length > 0) {
                          // linkedMemoryIds에 있는 기록들 중에서 제목이나 날짜가 일치하는 것 찾기
                          matchedMemory = todo.linkedMemoryIds
                            .map(id => allMemories.find(m => m.id === id))
                            .find(m => {
                              if (!m) return false;
                              const memoryTitle = m.title || '';
                              const memoryDate = format(new Date(m.createdAt), 'M월 d일');
                              // 제목이 정확히 일치하거나, 날짜 형식이 일치하거나, 부분 일치
                              return memoryTitle === mentionText || 
                                     memoryDate === mentionText ||
                                     memoryTitle.includes(mentionText) ||
                                     mentionText.includes(memoryTitle);
                            });
                        }
                        
                        // linkedMemoryIds가 없거나 매칭이 안 되면, 모든 기록에서 찾기
                        if (!matchedMemory) {
                          matchedMemory = allMemories.find(m => {
                            const memoryTitle = m.title || '';
                            const memoryDate = format(new Date(m.createdAt), 'M월 d일');
                            return memoryTitle === mentionText || 
                                   memoryDate === mentionText ||
                                   memoryTitle.includes(mentionText) ||
                                   mentionText.includes(memoryTitle);
                          });
                        }
                        
                        if (matchedMemory) {
                          parts.push({
                            type: 'tag',
                            content: mentionText,
                            memoryId: matchedMemory.id,
                            displayText: matchedMemory.title || format(new Date(matchedMemory.createdAt), 'M월 d일')
                          });
                        } else {
                          // 매칭되지 않으면 일반 텍스트로 표시
                          parts.push({
                            type: 'text',
                            content: fullMatch
                          });
                        }
                        
                        lastIndex = match.index + fullMatch.length;
                      }
                      
                      // 마지막 남은 텍스트 추가
                      if (lastIndex < text.length) {
                        parts.push({
                          type: 'text',
                          content: text.substring(lastIndex)
                        });
                      }
                      
                      // @ 태그가 없으면 원본 텍스트 그대로 표시
                      if (parts.length === 0) {
                        parts.push({
                          type: 'text',
                          content: text
                        });
                      }
                      
                      return parts.map((part, index) => {
                        if (part.type === 'tag' && part.memoryId) {
                          return (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onMemoryClick(part.memoryId!);
                              }}
                              className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                              title={part.displayText || part.content}
                            >
                              @{part.displayText || part.content}
                            </button>
                          );
                        }
                        return <span key={index}>{part.content}</span>;
                      });
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 text-xs"
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400">일정이 없습니다</p>
          )}
        </div>
      </div>

      {/* 기록 섹션 */}
      <div className="flex-1">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">기록</h4>
        <div className="space-y-2">
          {sortedMemories.length > 0 ? (
            sortedMemories.map(memory => {
              const content = stripHtml(memory.content);
              const isLong = content.length > 100;
              const displayContent = isLong ? content.substring(0, 100) + '...' : content;
              
              return (
                <button
                  key={memory.id}
                  onClick={() => onMemoryClick(memory.id)}
                  className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(memory.createdAt), 'HH:mm')}
                    </span>
                    <div className="flex-1 min-w-0">
                      {memory.title && (
                        <div className="text-xs font-semibold text-gray-800 mb-0.5 truncate">
                          {memory.title}
                        </div>
                      )}
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {displayContent}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">이 날 기록이 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
