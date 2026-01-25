'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Memory } from '@/types';
import PixelIcon from '../PixelIcon';
import { stripHtmlClient } from '@/board/boardUtils';
import type { MemorySummary } from '@/hooks/groups/useGroupsPanel';

type Props = {
  editableGroupName: string;
  setEditableGroupName: Dispatch<SetStateAction<string>>;
  editableRelatedMemories: MemorySummary[];
  setEditableRelatedMemories: Dispatch<SetStateAction<MemorySummary[]>>;
  groupModalMemory: Memory | null;
  localMemories: Memory[];
  onCancel: () => void;
  onConfirm: () => void;
};

export default function GroupAutoModal({
  editableGroupName,
  setEditableGroupName,
  editableRelatedMemories,
  setEditableRelatedMemories,
  groupModalMemory,
  localMemories,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
      <div className="bg-white border border-gray-300 p-5 min-w-[400px] max-w-[500px]">
        <div className="flex items-start gap-3 mb-4">
          <PixelIcon name="folder" size={24} />
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-800 mb-1">이렇게 묶을까요?</h3>
            <div className="text-sm text-gray-600 mb-3">
              <input
                type="text"
                value={editableGroupName}
                onChange={(e) => setEditableGroupName(e.target.value)}
                className="w-full px-2 py-1 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="그룹 이름"
              />
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-indigo-50 border border-indigo-300 p-3 mb-4 max-h-64 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                묶일 기록들 ({(editableRelatedMemories?.length || 0) + 1}개):
              </p>
              <ul className="space-y-1.5">
                {/* 현재 기록 */}
                <li className="text-xs text-gray-700 flex items-center gap-2 p-1.5 bg-white/60 rounded">
                  <span className="text-indigo-500">📄</span>
                  <span className="flex-1 line-clamp-1">{groupModalMemory ? stripHtmlClient(groupModalMemory.content) : ''}</span>
                </li>
                {/* 관련 기록들 */}
                {editableRelatedMemories.map((m, idx: number) => {
                  const relatedMemory = localMemories.find((mem) => mem.id === m.id);
                  return (
                    <li key={m.id || idx} className="text-xs text-gray-700 flex items-center gap-2 p-1.5 bg-white/60 rounded group">
                      <span className="text-indigo-500">📄</span>
                      <span className="flex-1 line-clamp-1">
                        {relatedMemory ? stripHtmlClient(relatedMemory.content) : m.content ? stripHtmlClient(m.content) : ''}
                      </span>
                      <button
                        onClick={() => {
                          setEditableRelatedMemories((prev) => prev.filter((item) => item.id !== m.id));
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                        title="제거"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-3 py-2 text-sm bg-indigo-500 text-white border border-indigo-600 hover:bg-indigo-600 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

