'use client';

import { useState, useEffect } from 'react';
import { Group, Memory } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import PixelIcon from './PixelIcon';

interface GroupManagerProps {
  onGroupsChanged?: () => void;
  personaId: string | null;
}

const COLOR_OPTIONS = [
  { value: 'orange', label: '주황', class: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'indigo', label: '인디고', class: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
];

export default function GroupManager({ onGroupsChanged, personaId }: GroupManagerProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('orange');

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

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    }
  };

  const fetchAISuggestions = async () => {
    setLoading(true);
    try {
      const url = personaId 
        ? `/api/groups/suggest?personaId=${personaId}` 
        : '/api/groups/suggest';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data.groups || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
      alert('AI 제안을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchMemories();
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMemories.length === 0) {
      alert('그룹 이름과 최소 1개의 기억을 선택해주세요');
      return;
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          memoryIds: selectedMemories,
          color: newGroupColor,
          isAIGenerated: false,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewGroupName('');
        setNewGroupColor('blue');
        setSelectedMemories([]);
        fetchGroups();
        onGroupsChanged?.();
      } else {
        alert('그룹 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('그룹 생성에 실패했습니다');
    }
  };

  const handleAcceptSuggestion = async (suggestion: any) => {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: suggestion.name,
          memoryIds: suggestion.memoryIds,
          color: suggestion.color,
          isAIGenerated: true,
        }),
      });

      if (res.ok) {
        fetchGroups();
        onGroupsChanged?.();
        // 제안 목록에서 제거
        setAiSuggestions(prev => prev.filter(s => s !== suggestion));
      } else {
        alert('그룹 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      alert('그룹 생성에 실패했습니다');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('이 그룹을 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/groups?id=${groupId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchGroups();
        onGroupsChanged?.();
      } else {
        alert('그룹 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('그룹 삭제에 실패했습니다');
    }
  };

  const getColorClass = (color?: string) => {
    return COLOR_OPTIONS.find(c => c.value === color)?.class || COLOR_OPTIONS[0].class;
  };

  const toggleMemorySelection = (memoryId: string) => {
    setSelectedMemories(prev =>
      prev.includes(memoryId)
        ? prev.filter(id => id !== memoryId)
        : [...prev, memoryId]
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 font-galmuri11">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">그룹 관리</h2>
          <p className="text-sm text-gray-600 mt-1 font-medium">비슷한 기억들을 묶어서 관리하세요</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAISuggestions}
            disabled={loading}
            className="px-4 py-2 bg-indigo-500 text-white border-2 border-gray-900 hover:bg-indigo-600 disabled:opacity-50 disabled:grayscale flex items-center gap-2 text-xs font-bold uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] disabled:transform-none"
          >
            <PixelIcon name="lightbulb" size={16} />
            AI로 묶기
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-500 text-white border-2 border-gray-900 hover:bg-indigo-600 flex items-center gap-2 text-xs font-bold uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            <PixelIcon name="plus" size={16} />
            직접 만들기
          </button>
        </div>
      </div>

      {/* AI 제안 패널 */}
      {showSuggestions && aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-indigo-50 p-6 border-4 border-indigo-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] relative">
          {/* 픽셀 코너 장식 */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-indigo-400" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-indigo-400" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-indigo-400" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-400" />
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-indigo-900 flex items-center gap-2 uppercase tracking-tight">
              <PixelIcon name="lightbulb" size={20} />
              AI 그룹 제안
            </h3>
            <button
              onClick={() => setShowSuggestions(false)}
              className="p-1 hover:bg-indigo-100 border-2 border-transparent hover:border-indigo-300 transition-all"
            >
              <PixelIcon name="close" size={16} className="text-indigo-600" />
            </button>
          </div>
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, idx) => (
              <div key={idx} className="bg-white p-4 border-2 border-purple-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 text-xs font-bold border-2 border-gray-900 ${getColorClass(suggestion.color)} shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]`}>
                        {suggestion.name}
                      </span>
                      <span className="text-xs text-gray-600 font-bold">{suggestion.memoryIds.length}개</span>
                    </div>
                    <p className="text-xs text-gray-700 font-medium">{suggestion.description}</p>
                  </div>
                  <button
                    onClick={() => handleAcceptSuggestion(suggestion)}
                    className="ml-3 px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold border-2 border-gray-900 hover:bg-indigo-600 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] uppercase tracking-tight"
                  >
                    생성
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 그룹 목록 */}
      <div className="space-y-4">
        {groups.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-medium">
            아직 그룹이 없습니다
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} className="bg-white p-5 border-4 border-gray-300 hover:border-gray-900 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 font-black border-2 border-gray-900 ${getColorClass(group.color)} shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] uppercase tracking-tight text-xs`}>
                    {group.name}
                  </span>
                  {group.isAIGenerated && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-600 text-xs font-bold border-2 border-indigo-300 uppercase tracking-tight">
                      AI 생성
                    </span>
                  )}
                  <span className="text-xs text-gray-600 font-bold">
                    {group.memoryIds.length}개 기억
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 border-2 border-transparent hover:border-red-300 transition-all"
                >
                  <PixelIcon name="delete" size={20} />
                </button>
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {formatDistanceToNow(group.createdAt, { addSuffix: true, locale: ko })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 직접 만들기 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 font-galmuri11">
          <div className="bg-white border-4 border-gray-900 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
            {/* 픽셀 코너 장식 */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">새 그룹 만들기</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-all"
              >
                <PixelIcon name="close" size={20} className="text-gray-600" />
              </button>
            </div>

            {/* 그룹 이름 */}
            <div className="mb-5">
              <label className="block text-xs font-black text-gray-700 mb-2 uppercase tracking-wider">
                그룹 이름
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="예: 프로젝트 아이디어"
                className="w-full px-4 py-2 border-2 border-gray-900 text-sm font-medium focus:ring-0 focus:border-indigo-500 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
              />
            </div>

            {/* 색상 선택 */}
            <div className="mb-5">
              <label className="block text-xs font-black text-gray-700 mb-2 uppercase tracking-wider">
                색상
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setNewGroupColor(color.value)}
                    className={`px-3 py-1.5 text-xs font-bold border-2 transition-all ${getColorClass(color.value)} ${
                      newGroupColor === color.value 
                        ? 'border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]' 
                        : 'border-gray-300 hover:border-gray-900'
                    } uppercase tracking-tight`}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 기억 선택 */}
            <div className="mb-6">
              <label className="block text-xs font-black text-gray-700 mb-2 uppercase tracking-wider">
                기억 선택 ({selectedMemories.length}개)
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-gray-900 p-3 bg-gray-50">
                {memories.map(memory => (
                  <label
                    key={memory.id}
                    className="flex items-start gap-3 p-2 hover:bg-white cursor-pointer border-2 border-transparent hover:border-gray-300 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemories.includes(memory.id)}
                      onChange={() => toggleMemorySelection(memory.id)}
                      className="mt-1 w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-gray-800 line-clamp-2 font-medium">{memory.content}</p>
                      <p className="text-[10px] text-gray-500 mt-1 font-medium">
                        {memory.topic} · {formatDistanceToNow(memory.createdAt, { addSuffix: true, locale: ko })}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2 text-xs font-bold border-2 border-gray-900 text-gray-700 bg-white hover:bg-gray-100 transition-all uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                취소
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-5 py-2 bg-indigo-500 text-white border-2 border-gray-900 hover:bg-indigo-600 text-xs font-black uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
