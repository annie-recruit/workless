import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Group, Memory } from '@/types';

export type MemorySummary = { id: string; content: string };

export type BoardToastState = {
  type:
  | 'loading'
  | 'confirm'
  | 'success'
  | 'delete-link'
  | 'delete-memory'
  | 'error'
  | null;
  data?: any;
};

type UseGroupsPanelArgs = {
  selectedGroupId: string | null;
  setSelectedGroupId: Dispatch<SetStateAction<string | null>>;
  setToast: Dispatch<SetStateAction<BoardToastState>>;
};

export function useGroupsPanel({ selectedGroupId, setSelectedGroupId, setToast }: UseGroupsPanelArgs) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupDescription, setGroupDescription] = useState<string | null>(null);
  const [isLoadingGroupDescription, setIsLoadingGroupDescription] = useState(false);

  const [groupModalMemory, setGroupModalMemory] = useState<Memory | null>(null);
  const [groupResult, setGroupResult] = useState<any>(null);
  const [groupStep, setGroupStep] = useState<'loading' | 'confirm' | 'animating'>('loading');
  const [editableGroupName, setEditableGroupName] = useState<string>('');
  const [editableRelatedMemories, setEditableRelatedMemories] = useState<MemorySummary[]>([]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupDescription(null);
      return;
    }

    const fetchGroupDescription = async () => {
      setIsLoadingGroupDescription(true);
      setGroupDescription(null);
      try {
        const res = await fetch(`/api/groups/${selectedGroupId}/description`);
        if (res.ok) {
          const data = await res.json();
          if (data.description && data.description.trim()) {
            setGroupDescription(data.description);
          } else {
            setGroupDescription('이 그룹에 대한 설명을 생성할 수 없습니다.');
          }
        } else {
          const errorData = await res.json().catch(() => ({ error: '그룹 설명을 가져올 수 없습니다' }));
          setGroupDescription(`오류: ${errorData.error || '그룹 설명을 가져올 수 없습니다'}`);
        }
      } catch (error) {
        console.error('Failed to fetch group description:', error);
        setGroupDescription('그룹 설명을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoadingGroupDescription(false);
      }
    };

    fetchGroupDescription();
  }, [selectedGroupId]);

  useEffect(() => {
    if (!groupModalMemory) return;

    const fetchGroup = async () => {
      try {
        setToast({ type: 'loading', data: { message: 'AI가 관련 기록을 찾고 있어요...' } });

        const res = await fetch(`/api/memories/${groupModalMemory.id}/auto-group`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: groupModalMemory.content,
            title: groupModalMemory.title,
            attachments: groupModalMemory.attachments,
            createdAt: groupModalMemory.createdAt
          })
        });

        if (res.ok) {
          const data = await res.json();
          setGroupResult(data);
          setGroupStep('confirm');
          setEditableGroupName(data.group?.name || '');
          setEditableRelatedMemories(data.relatedMemories || []);
          setToast({ type: 'confirm', data });
        } else {
          const errorData = await res.json().catch(() => ({ error: '자동 묶기 실패' }));
          setToast({ type: 'error', data: { message: errorData.error || '자동 묶기 실패' } });
          setGroupModalMemory(null);
          setGroupResult(null);
        }
      } catch (error) {
        console.error('Auto group error:', error);
        setToast({ type: 'error', data: { message: '자동 묶기 중 오류 발생' } });
        setGroupModalMemory(null);
        setGroupResult(null);
      }
    };

    fetchGroup();
  }, [groupModalMemory, setToast]);

  const handleCancelGroup = useCallback(async () => {
    if (groupResult?.group?.id) {
      try {
        await fetch(`/api/groups?id=${groupResult.group.id}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to delete group:', error);
      }
    }
    setToast({ type: null });
    setGroupModalMemory(null);
    setGroupResult(null);
    setGroupStep('loading');
    setEditableGroupName('');
    setEditableRelatedMemories([]);
  }, [groupResult, setToast]);

  const handleConfirmGroup = useCallback(async () => {
    if (!groupResult?.group) return;

    try {
      const finalGroupName = editableGroupName.trim() || groupResult.group.name;
      const finalMemoryIds = [groupModalMemory?.id, ...editableRelatedMemories.map((m) => m.id)].filter(Boolean) as string[];

      if (finalGroupName !== groupResult.group.name || finalMemoryIds.length !== groupResult.group.memoryIds.length) {
        const updateRes = await fetch('/api/groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: groupResult.group.id,
            name: finalGroupName,
            memoryIds: finalMemoryIds,
          }),
        });

        if (!updateRes.ok) {
          throw new Error('그룹 업데이트 실패');
        }
      }

      setToast({ type: 'success', data: { message: `그룹 "${finalGroupName}"이 생성되었습니다!` } });

      await fetchGroups();
      setSelectedGroupId(groupResult.group.id);

      setTimeout(() => {
        setToast({ type: null });
        setGroupModalMemory(null);
        setGroupResult(null);
        setGroupStep('loading');
        setEditableGroupName('');
        setEditableRelatedMemories([]);
      }, 2000);
    } catch (error) {
      console.error('Failed to confirm group:', error);
      setToast({ type: null });
      alert('그룹 생성 중 오류 발생');
    }
  }, [editableGroupName, editableRelatedMemories, fetchGroups, groupModalMemory?.id, groupResult, setSelectedGroupId, setToast]);

  return {
    groups,
    fetchGroups,
    groupDescription,
    isLoadingGroupDescription,
    groupModalMemory,
    setGroupModalMemory,
    groupResult,
    groupStep,
    editableGroupName,
    setEditableGroupName,
    editableRelatedMemories,
    setEditableRelatedMemories,
    handleCancelGroup,
    handleConfirmGroup,
  };
}
