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
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
          <div className="bg-white border-4 border-gray-900 p-5 min-w-[300px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
            {/* 픽셀 코너 장식 */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            
            <div className="flex items-center gap-3">
              <ProcessingLoader size={20} variant="inline" tone="indigo" />
              <div>
                <p className="text-sm font-black text-gray-800 uppercase tracking-tight">AI가 관련 기록을 찾고 있어요</p>
                <p className="text-xs text-gray-600">잠시만 기다려주세요...</p>
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

