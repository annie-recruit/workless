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
  { value: 'blue', label: '파랑', class: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'purple', label: '보라', class: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'green', label: '초록', class: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'orange', label: '주황', class: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'pink', label: '핑크', class: 'bg-pink-100 text-pink-800 border-pink-300' },
  { value: 'red', label: '빨강', class: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'yellow', label: '노랑', class: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
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
  const [newGroupColor, setNewGroupColor] = useState('blue');

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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">그룹 관리</h2>
          <p className="text-sm text-gray-500 mt-1">비슷한 기억들을 묶어서 관리하세요</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAISuggestions}
            disabled={loading}
            className="px-4 py-2 bg-indigo-500 text-white border border-indigo-600 hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI로 묶기
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-500 text-white border border-indigo-600 hover:bg-indigo-600 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            직접 만들기
          </button>
        </div>
      </div>

      {/* AI 제안 패널 */}
      {showSuggestions && aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-indigo-50 p-6 border border-indigo-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-1">
              <PixelIcon name="lightbulb" size={20} />
              AI 그룹 제안
            </h3>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-indigo-600 hover:text-indigo-800"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-purple-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getColorClass(suggestion.color)}`}>
                        {suggestion.name}
                      </span>
                      <span className="text-xs text-gray-500">{suggestion.memoryIds.length}개</span>
                    </div>
                    <p className="text-sm text-gray-600">{suggestion.description}</p>
                  </div>
                  <button
                    onClick={() => handleAcceptSuggestion(suggestion)}
                    className="px-3 py-1 bg-indigo-500 text-white text-sm border border-indigo-600 hover:bg-indigo-600"
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
          <div className="text-center py-12 text-gray-400">
            아직 그룹이 없습니다
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} className="bg-white p-5 border border-gray-200 hover:border-gray-400 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-full font-semibold ${getColorClass(group.color)}`}>
                    {group.name}
                  </span>
                  {group.isAIGenerated && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-600 text-xs border border-indigo-300">
                      AI 생성
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    {group.memoryIds.length}개 기억
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  className="text-red-500 hover:text-red-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="text-xs text-gray-400">
                {formatDistanceToNow(group.createdAt, { addSuffix: true, locale: ko })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 직접 만들기 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-300 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">새 그룹 만들기</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* 그룹 이름 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                그룹 이름
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="예: 프로젝트 아이디어"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 색상 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                색상
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setNewGroupColor(color.value)}
                    className={`px-3 py-1 rounded-full text-sm transition-all ${getColorClass(color.value)} ${
                      newGroupColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                    }`}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 기억 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기억 선택 ({selectedMemories.length}개)
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {memories.map(memory => (
                  <label
                    key={memory.id}
                    className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemories.includes(memory.id)}
                      onChange={() => toggleMemorySelection(memory.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 line-clamp-2">{memory.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {memory.topic} · {formatDistanceToNow(memory.createdAt, { addSuffix: true, locale: ko })}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 bg-indigo-500 text-white border border-indigo-600 hover:bg-indigo-600"
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
