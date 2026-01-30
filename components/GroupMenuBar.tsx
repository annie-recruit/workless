import React from 'react';
import PixelIcon from './PixelIcon';
import { Group } from '@/types';

interface GroupMenuBarProps {
  groups: Group[];
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null) => void;
  totalMemoriesCount: number;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  dropTargetGroupId: string | null;
}

export default function GroupMenuBar({
  groups,
  selectedGroupId,
  onSelectGroup,
  totalMemoriesCount,
  onDragOver,
  onDragLeave,
  onDrop,
  dropTargetGroupId,
}: GroupMenuBarProps) {
  const folderColorMap: Record<string, string> = {
    orange: '#fb923c',
    indigo: '#6366f1',
  };

  return (
    <div className="shrink-0 sticky top-[41px] z-20 flex items-center gap-2 px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-200 shadow-sm overflow-x-auto no-scrollbar flex-nowrap">
      {/* 전체 버튼 */}
      <button
        onClick={() => onSelectGroup(null)}
        className={`px-3 py-1 text-xs rounded border flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
          selectedGroupId === null
            ? 'bg-gray-900 text-white border-transparent'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        }`}
      >
        <div className="relative flex items-center">
          <PixelIcon
            name="folder"
            size={16}
            style={{ color: selectedGroupId === null ? '#FFFFFF' : '#6B7280' }}
          />
          <span className={`ml-1 px-1 rounded-full text-[9px] font-bold ${
            selectedGroupId === null ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-500'
          }`}>
            {totalMemoriesCount}
          </span>
        </div>
        <span className="font-medium">전체</span>
      </button>

      {/* 그룹 폴더들 */}
      {groups.map((group, index) => {
        const palette = Object.values(folderColorMap);
        const fallbackColor = palette[index % palette.length] || '#6366f1';
        const folderColor = folderColorMap[group.color || ''] || fallbackColor;
        const isSelected = selectedGroupId === group.id;
        const isDropTarget = dropTargetGroupId === group.id;

        return (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            onDragOver={(e) => onDragOver(e, group.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, group.id)}
            className={`px-3 py-1 text-xs rounded border flex items-center gap-1.5 transition-all whitespace-nowrap relative shrink-0 ${
              isSelected
                ? 'bg-gray-900 text-white border-transparent'
                : isDropTarget
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 scale-105'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="relative flex items-center">
              <PixelIcon
                name="folder"
                size={16}
                style={{ color: isSelected ? '#FFFFFF' : folderColor }}
              />
              <span className={`ml-1 px-1 rounded-full text-[9px] font-bold ${
                isSelected ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-500'
              }`}>
                {group.memoryIds.length}
              </span>
            </div>
            <span className="font-medium max-w-[120px] truncate">
              {group.name}
            </span>
            
            {isDropTarget && (
              <div className="absolute -top-1 -right-1">
                <PixelIcon name="download" size={12} className="text-indigo-500" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
