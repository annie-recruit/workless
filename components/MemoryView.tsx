'use client';

import { useState, useEffect } from 'react';
import { Memory, Group } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import LinkManager from './LinkManager';

interface MemoryViewProps {
  memories: Memory[];
  clusters: Map<string, Memory[]>;
  onMemoryDeleted?: () => void;
}

export default function MemoryView({ memories, clusters, onMemoryDeleted }: MemoryViewProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [draggedMemoryId, setDraggedMemoryId] = useState<string | null>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(null);
  const [linkManagerMemory, setLinkManagerMemory] = useState<Memory | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (memoryId: string) => {
    setDraggedMemoryId(memoryId);
  };

  const handleDragEnd = () => {
    setDraggedMemoryId(null);
    setDropTargetGroupId(null);
  };

  const handleDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    setDropTargetGroupId(groupId);
  };

  const handleDragLeave = () => {
    setDropTargetGroupId(null);
  };

  const handleDrop = async (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    setDropTargetGroupId(null);
    
    if (!draggedMemoryId) return;

    try {
      const targetGroup = groups.find(g => g.id === groupId);
      if (!targetGroup) return;

      // 이미 그룹에 포함되어 있는지 확인
      if (targetGroup.memoryIds.includes(draggedMemoryId)) {
        alert('이미 이 그룹에 포함된 기록입니다');
        return;
      }

      // 그룹에 기록 추가
      const updatedMemoryIds = [...targetGroup.memoryIds, draggedMemoryId];
      const res = await fetch('/api/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: groupId,
          memoryIds: updatedMemoryIds,
        }),
      });

      if (res.ok) {
        await fetchGroups();
        alert('그룹에 추가되었습니다!');
        // 햅틱 피드백 (성공)
        if ('vibrate' in navigator) {
          navigator.vibrate([10, 50, 10]);
        }
      } else {
        alert('그룹 추가 실패');
        // 햅틱 피드백 (에러)
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 50, 30]);
        }
      }
    } catch (error) {
      console.error('Failed to add memory to group:', error);
      alert('그룹 추가 중 오류 발생');
      // 햅틱 피드백 (에러)
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 50, 30]);
      }
    } finally {
      setDraggedMemoryId(null);
    }
  };

  // 그룹별 필터링
  const filteredMemories = selectedGroupId
    ? memories.filter(m => {
        const group = groups.find(g => g.id === selectedGroupId);
        console.log('🔍 필터링 중:', {
          selectedGroupId,
          group: group?.name,
          groupMemoryIds: group?.memoryIds,
          currentMemoryId: m.id,
          isIncluded: group?.memoryIds.includes(m.id)
        });
        return group?.memoryIds.includes(m.id);
      })
    : memories;

  console.log('📊 필터링 결과:', {
    selectedGroupId,
    totalMemories: memories.length,
    filteredMemories: filteredMemories.length,
    filteredMemoryIds: filteredMemories.map(m => m.id)
  });

  // 필터링된 메모리로 클러스터 재구성
  const filteredClusters = new Map<string, Memory[]>();
  filteredMemories.forEach(memory => {
    const tag = memory.clusterTag || '미분류';
    if (!filteredClusters.has(tag)) {
      filteredClusters.set(tag, []);
    }
    filteredClusters.get(tag)!.push(memory);
  });

  const getGroupColor = (color?: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      purple: 'bg-purple-100 text-purple-800 border-purple-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      pink: 'bg-pink-100 text-pink-800 border-pink-300',
      red: 'bg-red-100 text-red-800 border-red-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    return colors[color || 'blue'] || colors.blue;
  };

  if (memories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        아직 기억이 없습니다
      </div>
    );
  }

  return (
    <div className="w-full mx-auto space-y-6">
      {/* 필터 바 - 폴더 스타일 */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-500">필터:</span>
        
        {/* 전체 */}
        <button
          onClick={() => setSelectedGroupId(null)}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
            selectedGroupId === null
              ? 'bg-gray-900 shadow-lg scale-105'
              : 'hover:bg-gray-50'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className={`w-10 h-10 transition-all ${
            selectedGroupId === null ? '' : 'drop-shadow-md hover:drop-shadow-lg'
          }`}>
            <path d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" 
                  fill={selectedGroupId === null ? 'white' : '#6B7280'}
                  stroke="none"/>
          </svg>
          <span className={`text-xs font-medium ${selectedGroupId === null ? 'text-white' : 'text-gray-600'}`}>
            전체 {memories.length}
          </span>
        </button>

        {/* 그룹 폴더들 */}
        {groups.map(group => {
          const colorMap: Record<string, string> = {
            blue: selectedGroupId === group.id ? '#3B82F6' : '#93C5FD',
            purple: selectedGroupId === group.id ? '#A855F7' : '#D8B4FE',
            green: selectedGroupId === group.id ? '#10B981' : '#86EFAC',
            orange: selectedGroupId === group.id ? '#F97316' : '#FDBA74',
            pink: selectedGroupId === group.id ? '#EC4899' : '#F9A8D4',
            red: selectedGroupId === group.id ? '#EF4444' : '#FCA5A5',
            yellow: selectedGroupId === group.id ? '#EAB308' : '#FDE047',
          };
          const folderColor = colorMap[group.color || 'blue'];
          
          return (
            <button
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              onDragOver={(e) => handleDragOver(e, group.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, group.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all relative ${
                selectedGroupId === group.id
                  ? 'bg-gray-900 shadow-lg scale-105'
                  : dropTargetGroupId === group.id
                  ? 'bg-blue-50 scale-105'
                  : 'hover:bg-gray-50'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" className={`w-10 h-10 transition-all ${
                selectedGroupId === group.id 
                  ? '' 
                  : 'drop-shadow-md hover:drop-shadow-lg'
              }`}>
                <path d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" 
                      fill={selectedGroupId === group.id ? 'white' : folderColor}
                      stroke="none"/>
              </svg>
              <span className={`text-xs font-medium max-w-[80px] truncate ${
                selectedGroupId === group.id ? 'text-white' : 'text-gray-600'
              }`}>
                {group.name}
              </span>
              <span className={`text-[10px] ${
                selectedGroupId === group.id ? 'text-gray-300' : 'text-gray-400'
              }`}>
                {group.memoryIds.length}개
              </span>
              {dropTargetGroupId === group.id && (
                <div className="absolute -top-1 -right-1 text-lg">📥</div>
              )}
            </button>
          );
        })}
      </div>

      {/* 맥락별 묶음 보기 - 그리드 레이아웃 */}
      <div className="space-y-8">
        {filteredClusters.size === 0 ? (
          <div className="text-center py-12 text-gray-400">
            해당 그룹에 기억이 없습니다
          </div>
        ) : (
          Array.from(filteredClusters.entries()).map(([tag, clusterMemories]) => (
            <div key={tag} className="space-y-3">
              <h3 className="text-base font-bold text-gray-700 px-2">
                {tag} <span className="text-xs font-normal text-gray-400">({clusterMemories.length})</span>
              </h3>
              
              {/* 3열 그리드 */}
              <div className="grid grid-cols-3 gap-3">
                {clusterMemories.map((memory) => (
                  <MemoryCard 
                    key={memory.id} 
                    memory={memory} 
                    onDelete={onMemoryDeleted} 
                    allMemories={memories}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onOpenLinkManager={setLinkManagerMemory}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 링크 관리 모달 */}
      {linkManagerMemory && (
        <LinkManager
          currentMemory={linkManagerMemory}
          allMemories={memories}
          onClose={() => setLinkManagerMemory(null)}
          onLinked={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function MemoryCard({ memory, onDelete, allMemories, onDragStart, onDragEnd, onOpenLinkManager }: { 
  memory: Memory; 
  onDelete?: () => void; 
  allMemories: Memory[];
  onDragStart?: (memoryId: string) => void;
  onDragEnd?: () => void;
  onOpenLinkManager?: (memory: Memory) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(memory.content);
  const [isGrouping, setIsGrouping] = useState(false);
  const [groupResult, setGroupResult] = useState<any>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupStep, setGroupStep] = useState<'loading' | 'confirm' | 'animating'>('loading');
  
  const timeAgo = formatDistanceToNow(memory.createdAt, { 
    addSuffix: true,
    locale: ko 
  });

  const handleToggleSummary = async () => {
    if (!showSummary && !summary) {
      // 요약이 없으면 API 호출
      setIsLoadingSummary(true);
      try {
        const res = await fetch(`/api/memories/${memory.id}/summarize`);
        if (res.ok) {
          const data = await res.json();
          setSummary(data.summary);
          setShowSummary(true);
        } else {
          alert('요약 생성 실패');
        }
      } catch (error) {
        console.error('Failed to fetch summary:', error);
        alert('요약을 가져올 수 없습니다');
      } finally {
        setIsLoadingSummary(false);
      }
    } else {
      // 이미 있으면 토글만
      setShowSummary(!showSummary);
    }
  };

  const handleToggleSuggestions = async () => {
    if (!showSuggestions && !suggestions) {
      // 제안이 없으면 API 호출
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/memories/${memory.id}/suggestions`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } else {
          alert('제안 생성 실패');
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        alert('제안을 가져올 수 없습니다');
      } finally {
        setIsLoadingSuggestions(false);
      }
    } else {
      // 이미 있으면 토글만
      setShowSuggestions(!showSuggestions);
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 기억을 삭제하시겠습니까?')) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/memories?id=${memory.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        onDelete?.();
      } else {
        alert('삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = async () => {
    if (isEditing) {
      // 저장
      try {
        const res = await fetch(`/api/memories?id=${memory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editContent }),
        });
        
        if (res.ok) {
          window.location.reload();
        } else {
          alert('수정에 실패했습니다');
        }
      } catch (error) {
        console.error('Edit error:', error);
        alert('수정에 실패했습니다');
      }
    } else {
      // 편집 모드로 전환
      setIsEditing(true);
    }
  };

  const handleAutoGroup = async () => {
    setGroupStep('loading');
    setIsGrouping(true);
    setShowGroupModal(true);
    
    try {
      const res = await fetch(`/api/memories/${memory.id}/auto-group`, {
        method: 'POST',
      });
      
      if (res.ok) {
        const data = await res.json();
        setGroupResult(data);
        setIsGrouping(false);
        setGroupStep('confirm'); // 확인 단계로
      } else {
        alert('자동 묶기 실패');
        setShowGroupModal(false);
        setIsGrouping(false);
      }
    } catch (error) {
      console.error('Auto group error:', error);
      alert('자동 묶기 중 오류 발생');
      setShowGroupModal(false);
      setIsGrouping(false);
    }
  };

  const handleConfirmGroup = () => {
    setGroupStep('animating');
    // 애니메이션 후 새로고침
    setTimeout(() => {
      window.location.reload();
    }, 2500);
  };

  const handleCancelGroup = async () => {
    // 생성된 그룹 삭제
    if (groupResult?.group?.id) {
      try {
        await fetch(`/api/groups?id=${groupResult.group.id}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to delete group:', error);
      }
    }
    setShowGroupModal(false);
    setGroupResult(null);
  };

  const handleConvertToGoal = async (suggestions: any) => {
    if (!confirm('이 AI 제안을 목표로 전환하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/memories/${memory.id}/convert-to-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ 목표가 생성되었습니다!\n"${data.goal.title}"`);
        // 인사이트 패널 새로고침을 위해
        window.dispatchEvent(new CustomEvent('goal-updated'));
      } else {
        alert('목표 생성 실패');
      }
    } catch (error) {
      console.error('Convert to goal error:', error);
      alert('목표 생성 중 오류 발생');
    }
  };

  // 텍스트가 200자 이상이면 접기 기능 활성화
  const MAX_LENGTH = 200;
  const isLong = memory.content.length > MAX_LENGTH;
  const displayContent = isExpanded || !isLong 
    ? memory.content 
    : memory.content.slice(0, MAX_LENGTH);

  return (
    <div 
      id={`memory-${memory.id}`}
      draggable={true}
      onDragStart={() => onDragStart?.(memory.id)}
      onDragEnd={() => onDragEnd?.()}
      className="group relative p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all scroll-mt-4 cursor-move hover:shadow-md h-full flex flex-col"
    >
      {/* 드래그 아이콘 */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      
      {/* 상단 우측 버튼들 */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* AI 자동 묶기 버튼 */}
        <button
          onClick={handleAutoGroup}
          disabled={isGrouping}
          className="p-1.5 hover:bg-purple-50 rounded-lg disabled:opacity-50 transition-colors"
          title="AI로 자동 묶기"
        >
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </button>
        
        {/* 수정 버튼 */}
        <button
          onClick={handleEdit}
          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
          title={isEditing ? '저장' : '수정'}
        >
          {isEditing ? (
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </button>
        
        {/* 삭제 버튼 */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
          title="삭제"
        >
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* 내용 (편집 모드) */}
      {isEditing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full p-3 mb-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap"
          rows={5}
          autoFocus
        />
      ) : (
        <p className="text-xs text-gray-800 leading-relaxed mb-2 whitespace-pre-wrap pr-8 line-clamp-3">
          {displayContent}
          {isLong && !isExpanded && (
            <>
              ...
              <button
                onClick={() => setIsExpanded(true)}
                className="ml-1 text-blue-500 hover:text-blue-600 text-[10px] font-medium"
              >
                더보기
              </button>
            </>
          )}
          {isLong && isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="ml-1 text-gray-500 hover:text-gray-600 text-[10px] font-medium"
            >
              접기
            </button>
          )}
        </p>
      )}

      {/* AI 버튼들 */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={handleToggleSummary}
          disabled={isLoadingSummary}
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {isLoadingSummary ? '생성중' : showSummary ? '요약 끄기' : '요약하기'}
        </button>
        
        <button
          onClick={handleToggleSuggestions}
          disabled={isLoadingSuggestions}
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {isLoadingSuggestions ? '생성중' : showSuggestions ? '제안 끄기' : '제안받기'}
        </button>
      </div>

      {/* AI 요약 표시 */}
      {showSummary && summary && (
        <div className="mb-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded">
          <div className="flex items-start gap-1">
            <svg className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="flex-1">
              <div className="text-[10px] font-semibold text-purple-700 mb-0.5">AI 요약</div>
              <p className="text-[10px] text-gray-700 leading-relaxed">{summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI 제안 표시 */}
      {showSuggestions && suggestions && (
        <div className="mb-2 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg space-y-3">
          {/* 다음 단계 */}
          {suggestions.nextSteps && suggestions.nextSteps.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <h4 className="text-[10px] font-bold text-blue-700">다음 단계</h4>
              </div>
              <ul className="space-y-1 ml-3">
                {suggestions.nextSteps.map((step: string, idx: number) => (
                  <li key={idx} className="text-[10px] text-gray-700 flex items-start gap-1">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 관련 자료 */}
          {suggestions.resources && suggestions.resources.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h4 className="text-[10px] font-bold text-green-700">관련 자료</h4>
              </div>
              <ul className="space-y-1 ml-3">
                {suggestions.resources.map((resource: any, idx: number) => (
                  <li key={idx} className="text-[10px] text-gray-700">
                    <span className="font-medium text-green-700">{resource.name}</span>
                    {resource.type && <span className="text-gray-500 ml-1">({resource.type})</span>}
                    {resource.description && <p className="text-gray-600 ml-2">{resource.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 실행 계획 */}
          {suggestions.actionPlan && suggestions.actionPlan.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h4 className="text-[10px] font-bold text-orange-700">실행 계획</h4>
                </div>
                <button
                  onClick={() => handleConvertToGoal(suggestions)}
                  className="px-2 py-0.5 text-[9px] font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-full transition-all shadow-sm"
                >
                  🎯 목표로 전환
                </button>
              </div>
              <ul className="space-y-1 ml-3">
                {suggestions.actionPlan.map((plan: any, idx: number) => (
                  <li key={idx} className="text-[10px] text-gray-700 flex items-start gap-1">
                    <span className="font-bold text-orange-600">{plan.step}.</span>
                    <div>
                      <span>{plan.action}</span>
                      {plan.timeframe && <span className="text-gray-500 ml-1">({plan.timeframe})</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 첨부 파일 표시 */}
      {memory.attachments && memory.attachments.length > 0 && (
        <div className="mb-3 space-y-2">
          {memory.attachments.map((attachment) => {
            const isImage = attachment.mimetype.startsWith('image/');
            
            if (isImage) {
              return (
                <div key={attachment.id} className="mt-2">
                  <img
                    src={attachment.filepath}
                    alt={attachment.filename}
                    className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(attachment.filepath, '_blank')}
                    style={{ maxHeight: '300px' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">{attachment.filename}</p>
                </div>
              );
            } else {
              return (
                <a
                  key={attachment.id}
                  href={attachment.filepath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-lg">
                    {attachment.mimetype.includes('pdf') ? '📄' : '📎'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{attachment.filename}</p>
                    <p className="text-xs text-gray-500">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <span className="text-blue-500 text-sm">열기</span>
                </a>
              );
            }
          })}
        </div>
      )}
      
      <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
        <span>{timeAgo}</span>
        
        {memory.topic && (
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">
            {memory.topic}
          </span>
        )}
        
        {memory.nature && (
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px]">
            {memory.nature}
          </span>
        )}
        
        {memory.repeatCount !== undefined && memory.repeatCount > 1 && (
          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px]">
            🔁 {memory.repeatCount}
          </span>
        )}
      </div>

      {/* 관련 기록 링크 */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-start gap-1">
          <svg className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <div className="flex-1">
            <div className="text-[10px] text-gray-500 mb-1 flex items-center justify-between">
              <span>연결된 기록</span>
              <button
                onClick={() => onOpenLinkManager?.(memory)}
                className="text-[10px] text-blue-500 hover:text-blue-600"
              >
                + 추가
              </button>
            </div>
            {memory.relatedMemoryIds && memory.relatedMemoryIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {memory.relatedMemoryIds.slice(0, 3).map(relatedId => {
                  const relatedMemory = allMemories.find(m => m.id === relatedId);
                  if (!relatedMemory) return null;
                  
                  return (
                    <div key={relatedId} className="relative group">
                      <button
                        onClick={() => {
                          const element = document.getElementById(`memory-${relatedId}`);
                          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          element?.classList.add('ring-2', 'ring-blue-400');
                          setTimeout(() => {
                            element?.classList.remove('ring-2', 'ring-blue-400');
                          }, 2000);
                        }}
                        className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200 hover:border-blue-300 line-clamp-1 max-w-[200px] text-left"
                        title={relatedMemory.content}
                      >
                        {relatedMemory.content.substring(0, 30)}...
                      </button>
                      {/* 링크 삭제 버튼 */}
                      <button
                        onClick={async () => {
                          if (confirm('이 연결을 삭제하시겠습니까?')) {
                            try {
                              const res = await fetch(`/api/memories/link?memoryId1=${memory.id}&memoryId2=${relatedId}`, {
                                method: 'DELETE',
                              });
                              if (res.ok) {
                                window.location.reload();
                              } else {
                                alert('링크 삭제 실패');
                              }
                            } catch (error) {
                              console.error('Failed to delete link:', error);
                              alert('링크 삭제 중 오류 발생');
                            }
                          }
                        }}
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600 transition-all"
                        title="연결 끊기"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                {memory.relatedMemoryIds.length > 3 && (
                  <span className="text-xs text-gray-400 self-center">
                    +{memory.relatedMemoryIds.length - 3}개 더
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">아직 연결된 기록이 없습니다</p>
            )}
          </div>
        </div>
      </div>

      {/* AI 자동 묶기 모달 */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 블러 배경 */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />
          
          {/* 모달 내용 */}
          <div className="relative z-10 bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            {groupStep === 'loading' && (
              /* 1단계: 로딩 - ✨ 하나만 */
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <div className="text-7xl animate-sparkle-single">✨</div>
                </div>
                <p className="text-lg font-semibold text-gray-800 mb-2">
                  AI가 관련 기록을 찾고 있어요
                </p>
                <p className="text-sm text-gray-500 animate-pulse">
                  잠시만 기다려주세요...
                </p>
              </div>
            )}

            {groupStep === 'confirm' && groupResult && (
              /* 2단계: 확인 */
              <div className="animate-fade-in">
                {/* 폴더 아이콘 */}
                <div className="w-20 h-20 mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <path d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" 
                          fill="url(#folder-gradient)" stroke="#3B82F6" strokeWidth="1.5"/>
                    <defs>
                      <linearGradient id="folder-gradient" x1="3" y1="4" x2="21" y2="20">
                        <stop offset="0%" stopColor="#60A5FA"/>
                        <stop offset="100%" stopColor="#3B82F6"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
                  이렇게 묶을까요?
                </h3>
                <p className="text-center text-sm text-gray-600 mb-4">
                  📁 <span className="font-semibold">{groupResult.group.name}</span>
                </p>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    묶일 기록들 ({(groupResult.relatedMemories?.length || 0) + 1}개):
                  </p>
                  <ul className="space-y-2">
                    {/* 현재 기록 */}
                    <li className="text-xs text-gray-700 flex items-start gap-2 p-2 bg-white/60 rounded">
                      <span className="text-blue-500 mt-0.5">📄</span>
                      <span className="flex-1 line-clamp-2">{memory.content}</span>
                    </li>
                    {/* 관련 기록들 */}
                    {groupResult.relatedMemories?.map((m: any, idx: number) => {
                      const relatedMemory = allMemories.find(mem => mem.id === m.id);
                      return (
                        <li key={idx} className="text-xs text-gray-700 flex items-start gap-2 p-2 bg-white/60 rounded">
                          <span className="text-blue-500 mt-0.5">📄</span>
                          <span className="flex-1 line-clamp-2">{relatedMemory?.content || m.content}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelGroup}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirmGroup}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    확인
                  </button>
                </div>
              </div>
            )}

            {groupStep === 'animating' && groupResult && (
              /* 3단계: 애니메이션 */
              <div className="text-center">
                {/* 글들이 폴더로 모이는 애니메이션 */}
                <div className="relative w-full h-48 mb-6">
                  {/* 떠다니는 문서들 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl animate-gather-1">📄</div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl animate-gather-2">📄</div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl animate-gather-3">📄</div>
                  </div>
                  
                  {/* 중앙 폴더 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl animate-folder-appear">📁</div>
                  </div>
                </div>
                
                <p className="text-lg font-semibold text-gray-800 mb-2 animate-pulse">
                  그룹을 만들고 있어요
                </p>
                <p className="text-sm text-gray-500">
                  {groupResult.group.name}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
