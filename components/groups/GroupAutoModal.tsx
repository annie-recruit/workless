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
    <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
      <div className="bg-white border-3 border-gray-900 p-5 min-w-[400px] max-w-[500px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
        {/* 픽셀 코너 장식 */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />

        <div className="flex items-start gap-3 mb-4">
          <PixelIcon name="folder" size={24} />
          <div className="flex-1">
            <h3 className="text-base font-black text-gray-900 mb-2 uppercase tracking-tight">이렇게 묶을까요?</h3>
            <div className="text-sm text-gray-600 mb-3">
              <input
                type="text"
                value={editableGroupName}
                onChange={(e) => setEditableGroupName(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold border-2 border-gray-900 focus:outline-none focus:border-indigo-500 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                placeholder="그룹 이름"
              />
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-indigo-50 border-2 border-indigo-400 p-3 mb-4 max-h-64 overflow-y-auto"
              style={{
                clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
              }}
            >
              <p className="text-xs font-black text-gray-700 mb-2 uppercase tracking-tight">
                묶일 기록들 ({(editableRelatedMemories?.length || 0) + 1}개):
              </p>
              <ul className="space-y-2">
                {/* 현재 기록 */}
                <li className="text-xs text-gray-700 flex items-center gap-2 p-2 bg-white border-2 border-gray-300"
                  style={{
                    clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
                  }}
                >
                  <PixelIcon name="card" size={12} className="text-indigo-500" />
                  <span className="flex-1 line-clamp-1 font-medium">{groupModalMemory ? stripHtmlClient(groupModalMemory.content) : ''}</span>
                </li>
                {/* 관련 기록들 */}
                {editableRelatedMemories.map((m, idx: number) => {
                  const relatedMemory = localMemories.find((mem) => mem.id === m.id);
                  return (
                    <li key={m.id || idx} className="text-xs text-gray-700 flex items-center gap-2 p-2 bg-white border-2 border-gray-300 group"
                      style={{
                        clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
                      }}
                    >
                      <PixelIcon name="card" size={12} className="text-indigo-500" />
                      <span className="flex-1 line-clamp-1 font-medium">
                        {relatedMemory ? stripHtmlClient(relatedMemory.content) : m.content ? stripHtmlClient(m.content) : ''}
                      </span>
                      <button
                        onClick={() => {
                          setEditableRelatedMemories((prev) => prev.filter((item) => item.id !== m.id));
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 border-2 border-transparent hover:border-red-300 transition-all"
                        title="제거"
                      >
                        <PixelIcon name="close" size={12} className="text-red-500" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 text-xs font-bold border-2 border-gray-900 text-gray-700 bg-white hover:bg-gray-100 transition-all uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                취소
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2 text-xs font-black bg-indigo-500 text-white border-2 border-gray-900 hover:bg-indigo-600 transition-all uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                확인
              </button>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-all">
            <PixelIcon name="close" size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

