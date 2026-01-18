'use client';

import { useState, useEffect } from 'react';
import { Memory, Group } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MemoryViewProps {
  memories: Memory[];
  clusters: Map<string, Memory[]>;
  onMemoryDeleted?: () => void;
  onOpenGroups?: () => void;
  onOpenQuery?: () => void;
  onOpenTimeline?: () => void;
}

export default function MemoryView({ memories, clusters, onMemoryDeleted, onOpenGroups, onOpenQuery, onOpenTimeline }: MemoryViewProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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
      {/* 필터 & 액션 바 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* 그룹 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-600">그룹:</span>
            <button
              onClick={() => setSelectedGroupId(null)}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                selectedGroupId === null
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체 ({memories.length})
            </button>
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`px-3 py-1 rounded-full text-sm transition-all border ${
                  selectedGroupId === group.id
                    ? getGroupColor(group.color)
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {group.name} ({group.memoryIds.length})
              </button>
            ))}
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenGroups}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              그룹 관리
            </button>
            <button
              onClick={onOpenQuery}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              물어보기
            </button>
            <button
              onClick={onOpenTimeline}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              타임라인
            </button>
          </div>
        </div>
      </div>

      {/* 맥락별 묶음 보기 */}
      <div className="space-y-8">
        {filteredClusters.size === 0 ? (
          <div className="text-center py-12 text-gray-400">
            해당 그룹에 기억이 없습니다
          </div>
        ) : (
          Array.from(filteredClusters.entries()).map(([tag, clusterMemories]) => (
            <div key={tag} className="space-y-3">
              <h3 className="text-lg font-bold text-gray-700 px-2">
                {tag} <span className="text-sm font-normal text-gray-400">({clusterMemories.length})</span>
              </h3>
              
              <div className="space-y-2">
                {clusterMemories.map((memory) => (
                  <MemoryCard 
                    key={memory.id} 
                    memory={memory} 
                    onDelete={onMemoryDeleted} 
                    allMemories={memories}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MemoryCard({ memory, onDelete, allMemories }: { memory: Memory; onDelete?: () => void; allMemories: Memory[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const timeAgo = formatDistanceToNow(memory.createdAt, { 
    addSuffix: true,
    locale: ko 
  });

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

  // 텍스트가 200자 이상이면 접기 기능 활성화
  const MAX_LENGTH = 200;
  const isLong = memory.content.length > MAX_LENGTH;
  const displayContent = isExpanded || !isLong 
    ? memory.content 
    : memory.content.slice(0, MAX_LENGTH);

  return (
    <div 
      id={`memory-${memory.id}`}
      className="group relative p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all scroll-mt-4"
    >
      {/* 삭제 버튼 */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50"
        title="삭제"
      >
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      <p className="text-gray-800 leading-relaxed mb-2 whitespace-pre-wrap pr-8">
        {displayContent}
        {isLong && !isExpanded && (
          <>
            ...
            <button
              onClick={() => setIsExpanded(true)}
              className="ml-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
            >
              더보기
            </button>
          </>
        )}
        {isLong && isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="ml-2 text-gray-500 hover:text-gray-600 text-sm font-medium"
          >
            접기
          </button>
        )}
      </p>

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
      
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{timeAgo}</span>
        
        {memory.topic && (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
            {memory.topic}
          </span>
        )}
        
        {memory.nature && (
          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded">
            {memory.nature}
          </span>
        )}
        
        {memory.repeatCount !== undefined && memory.repeatCount > 1 && (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded">
            🔁 {memory.repeatCount}회
          </span>
        )}
      </div>

      {/* 관련 기록 링크 */}
      {memory.relatedMemoryIds && memory.relatedMemoryIds.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1.5">연결된 기록</div>
              <div className="flex flex-wrap gap-1.5">
                {memory.relatedMemoryIds.slice(0, 3).map(relatedId => {
                  const relatedMemory = allMemories.find(m => m.id === relatedId);
                  if (!relatedMemory) return null;
                  
                  return (
                    <button
                      key={relatedId}
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
                  );
                })}
                {memory.relatedMemoryIds.length > 3 && (
                  <span className="text-xs text-gray-400 self-center">
                    +{memory.relatedMemoryIds.length - 3}개 더
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
