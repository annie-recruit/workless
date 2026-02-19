'use client';

import { useState, useEffect } from 'react';
import { Group, Memory } from '@/types';
import PixelIcon from './PixelIcon';
import { useLanguage } from './LanguageContext';
import { PixelButton } from './ui/PixelButton';
import { PixelModal } from './ui/PixelModal';
import { apiGet, apiPost, apiDelete, ApiError } from '@/lib/apiClient';
import { formatTimeAgo } from '@/lib/dateUtils';
import { API, GROUP_COLOR_OPTIONS } from '@/lib/constants';

interface GroupManagerProps {
  onGroupsChanged?: () => void;
  personaId: string | null;
}

export default function GroupManager({ onGroupsChanged, personaId }: GroupManagerProps) {
  const { t, language } = useLanguage();
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
      const data = await apiGet<{ groups: Group[] }>(API.GROUPS);
      setGroups(data.groups);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const fetchMemories = async () => {
    try {
      const data = await apiGet<{ memories: Memory[] }>(API.MEMORIES);
      setMemories(data.memories);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    }
  };

  const fetchAISuggestions = async () => {
    setLoading(true);
    try {
      const url = personaId
        ? `${API.GROUPS_SUGGEST}?personaId=${personaId}`
        : API.GROUPS_SUGGEST;
      const data = await apiGet<{ groups: any[] }>(url);
      setAiSuggestions(data.groups || []);
      setShowSuggestions(true);
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
      await apiPost(API.GROUPS, {
        name: newGroupName,
        memoryIds: selectedMemories,
        color: newGroupColor,
        isAIGenerated: false,
      });
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupColor('blue');
      setSelectedMemories([]);
      fetchGroups();
      onGroupsChanged?.();
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('그룹 생성에 실패했습니다');
    }
  };

  const handleAcceptSuggestion = async (suggestion: any) => {
    try {
      await apiPost(API.GROUPS, {
        name: suggestion.name,
        memoryIds: suggestion.memoryIds,
        color: suggestion.color,
        isAIGenerated: true,
      });
      fetchGroups();
      onGroupsChanged?.();
      setAiSuggestions(prev => prev.filter(s => s !== suggestion));
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      alert('그룹 생성에 실패했습니다');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('이 그룹을 삭제하시겠습니까?')) return;

    try {
      await apiDelete(`${API.GROUPS}?id=${groupId}`);
      fetchGroups();
      onGroupsChanged?.();
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('그룹 삭제에 실패했습니다');
    }
  };

  const getColorClass = (color?: string) => {
    return GROUP_COLOR_OPTIONS.find(c => c.value === color)?.class || GROUP_COLOR_OPTIONS[0].class;
  };

  const toggleMemorySelection = (memoryId: string) => {
    setSelectedMemories(prev =>
      prev.includes(memoryId)
        ? prev.filter(id => id !== memoryId)
        : [...prev, memoryId]
    );
  };

  return (
    <div className="w-full space-y-3 font-galmuri11">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-500 font-medium">{t('group.manage.desc')}</p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={fetchAISuggestions}
            disabled={loading}
            className="px-2.5 py-1.5 bg-indigo-500 text-white border-[2px] border-gray-900 hover:bg-indigo-600 disabled:opacity-50 disabled:grayscale flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)] disabled:transform-none"
          >
            <PixelIcon name="lightbulb" size={12} />
            {t('group.manage.button.ai')}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-2.5 py-1.5 bg-indigo-500 text-white border-[2px] border-gray-900 hover:bg-indigo-600 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
          >
            <PixelIcon name="plus" size={12} />
            {t('group.manage.button.create')}
          </button>
        </div>
      </div>

      {/* AI 제안 패널 */}
      {showSuggestions && aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-indigo-50 p-3 border-[2px] border-indigo-400 relative">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-tight">
              <PixelIcon name="lightbulb" size={14} />
              {t('group.manage.ai.title')}
            </h3>
            <button
              onClick={() => setShowSuggestions(false)}
              className="p-0.5 hover:bg-indigo-100 border-[2px] border-transparent hover:border-indigo-300 transition-all"
            >
              <PixelIcon name="close" size={12} className="text-indigo-600" />
            </button>
          </div>
          <div className="space-y-2">
            {aiSuggestions.map((suggestion, idx) => (
              <div key={idx} className="bg-white p-2.5 border-[2px] border-purple-300">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold border-[2px] border-gray-900 ${getColorClass(suggestion.color)}`}>
                        {suggestion.name}
                      </span>
                      <span className="text-[10px] text-gray-600 font-bold">{t('group.manage.memoriesCount').replace('{count}', suggestion.memoryIds.length.toString())}</span>
                    </div>
                    <p className="text-[10px] text-gray-700 font-medium line-clamp-2">{suggestion.description}</p>
                  </div>
                  <button
                    onClick={() => handleAcceptSuggestion(suggestion)}
                    className="shrink-0 px-2 py-1 bg-indigo-500 text-white text-[10px] font-bold border-[2px] border-gray-900 hover:bg-indigo-600 transition-all uppercase tracking-tight"
                  >
                    {t('group.manage.ai.accept')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 그룹 목록 */}
      <div className="space-y-2">
        {groups.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-[11px] font-medium">
            {t('group.manage.noGroups')}
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} className="bg-white p-3 border-[2px] border-black hover:border-indigo-500 transition-all group/item flex items-start gap-3"
              style={{
                clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 font-bold border-[2px] border-gray-900 ${getColorClass(group.color)} uppercase tracking-tight text-[10px]`}>
                    {group.name}
                  </span>
                  {group.isAIGenerated && (
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold border-[2px] border-indigo-300 uppercase tracking-tight">
                      {t('group.manage.aiTag')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600 font-bold">
                    {t('group.manage.memoriesCount').replace('{count}', group.memoryIds.length.toString())}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {formatTimeAgo(group.createdAt, language)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDeleteGroup(group.id)}
                className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover/item:opacity-100 border-[2px] border-transparent hover:border-red-500"
              >
                <PixelIcon name="delete" size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 직접 만들기 모달 */}
      <PixelModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('group.manage.modal.create.title')}
      >
        {/* 그룹 이름 */}
        <div className="mb-5">
          <label className="block text-xs font-black text-gray-700 mb-2 uppercase tracking-wider">
            {t('group.manage.modal.create.name')}
          </label>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder={t('group.manage.modal.create.name.placeholder')}
            className="w-full px-4 py-2 border-2 border-gray-900 text-sm font-medium focus:ring-0 focus:border-indigo-500 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
          />
        </div>

        {/* 색상 선택 */}
        <div className="mb-5">
          <label className="block text-xs font-black text-gray-700 mb-2 uppercase tracking-wider">
            {t('group.manage.modal.create.color')}
          </label>
          <div className="flex gap-2 flex-wrap">
            {GROUP_COLOR_OPTIONS.map(color => (
              <button
                key={color.value}
                onClick={() => setNewGroupColor(color.value)}
                className={`px-3 py-1.5 text-xs font-bold border-2 transition-all ${getColorClass(color.value)} ${
                  newGroupColor === color.value
                    ? 'border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
                    : 'border-gray-300 hover:border-gray-900'
                } uppercase tracking-tight`}
              >
                {t(`group.manage.color.${color.value}`)}
              </button>
            ))}
          </div>
        </div>

        {/* 기억 선택 */}
        <div className="mb-6">
          <label className="block text-xs font-black text-gray-700 mb-2 uppercase tracking-wider">
            {t('group.manage.modal.create.memories').replace('{count}', selectedMemories.length.toString())}
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
                    {memory.topic} · {formatTimeAgo(memory.createdAt, language)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 justify-end">
          <PixelButton variant="secondary" onClick={() => setShowCreateModal(false)}>
            {t('common.cancel')}
          </PixelButton>
          <PixelButton variant="primary" className="font-black" onClick={handleCreateGroup}>
            {t('group.manage.modal.create.button.create')}
          </PixelButton>
        </div>
      </PixelModal>
    </div>
  );
}
