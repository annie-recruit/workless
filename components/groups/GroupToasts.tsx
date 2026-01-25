'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Memory } from '@/types';
import ProcessingLoader from '../ProcessingLoader';
import GroupAutoModal from './GroupAutoModal';
import type { BoardToastState, MemorySummary } from '@/hooks/groups/useGroupsPanel';

type Props = {
  toast: BoardToastState;
  editableGroupName: string;
  setEditableGroupName: Dispatch<SetStateAction<string>>;
  editableRelatedMemories: MemorySummary[];
  setEditableRelatedMemories: Dispatch<SetStateAction<MemorySummary[]>>;
  groupModalMemory: Memory | null;
  localMemories: Memory[];
  onCancelGroup: () => void;
  onConfirmGroup: () => void;
};

export default function GroupToasts({
  toast,
  editableGroupName,
  setEditableGroupName,
  editableRelatedMemories,
  setEditableRelatedMemories,
  groupModalMemory,
  localMemories,
  onCancelGroup,
  onConfirmGroup,
}: Props) {
  return (
    <>
      {toast.type === 'loading' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-white border border-gray-300 p-4 min-w-[300px]">
            <div className="flex items-center gap-3">
              <ProcessingLoader size={20} variant="inline" tone="indigo" />
              <div>
                <p className="text-sm font-semibold text-gray-800">AI가 관련 기록을 찾고 있어요</p>
                <p className="text-xs text-gray-500">잠시만 기다려주세요...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.type === 'confirm' && toast.data && (
        <GroupAutoModal
          editableGroupName={editableGroupName}
          setEditableGroupName={setEditableGroupName}
          editableRelatedMemories={editableRelatedMemories}
          setEditableRelatedMemories={setEditableRelatedMemories}
          groupModalMemory={groupModalMemory}
          localMemories={localMemories}
          onCancel={onCancelGroup}
          onConfirm={onConfirmGroup}
        />
      )}
    </>
  );
}

