import React from 'react';
import PixelIcon from './PixelIcon';
import { CanvasBlock } from '@/types';

interface WidgetMenuBarProps {
  blocks: CanvasBlock[];
  selectedMemoryIds: Set<string>;
  isBlobEnabled: boolean;
  onCreateCalendar: () => void;
  onCreateMinimap: () => void;
  onCreateViewer: () => void;
  onCreateMeetingRecorder: () => void;
  onCreateDatabase: () => void;
  onCreateProject: () => void;
  onToggleBlob: () => void;
}

export default function WidgetMenuBar({
  blocks,
  selectedMemoryIds,
  isBlobEnabled,
  onCreateCalendar,
  onCreateMinimap,
  onCreateViewer,
  onCreateMeetingRecorder,
  onCreateDatabase,
  onCreateProject,
  onToggleBlob,
}: WidgetMenuBarProps) {
  return (
    <div className="shrink-0 sticky top-[44px] md:top-[41px] z-20 flex items-center gap-2 px-3 py-2.5 text-xs text-gray-500 bg-indigo-50/80 backdrop-blur-sm border-b border-indigo-100 shadow-sm overflow-x-auto no-scrollbar flex-nowrap flex-row">
      <div className="flex items-center gap-2 min-w-max">
        <button
          onClick={onCreateCalendar}
          className="px-2.5 py-1.5 text-xs rounded-md border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm active:scale-95 transition-all"
          title="캘린더 블록"
        >
          <PixelIcon name="calendar" size={16} />
          <span className="font-bold">캘린더</span>
        </button>
        <button
          onClick={onCreateMinimap}
          disabled={blocks.some(b => b.type === 'minimap')}
          className="px-2.5 py-1.5 text-xs rounded-md border border-indigo-200 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-700 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm active:scale-95 transition-all"
          title={blocks.some(b => b.type === 'minimap') ? '미니맵은 보드당 하나만 추가할 수 있습니다' : '미니맵 블록 추가'}
        >
          <PixelIcon name="minimap" size={16} />
          <span className="font-bold">미니맵</span>
        </button>
        <button
          onClick={onCreateViewer}
          className="px-2.5 py-1.5 text-xs rounded-md border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm active:scale-95 transition-all"
          title="Viewer 위젯"
        >
          <PixelIcon name="viewer" size={16} />
          <span className="font-bold">Viewer</span>
        </button>
        <button
          onClick={onCreateMeetingRecorder}
          className="px-2.5 py-1.5 text-xs rounded-md border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm active:scale-95 transition-all"
          title="미팅 레코더"
        >
          <PixelIcon name="meeting-recorder" size={16} />
          <span className="font-bold">레코더</span>
        </button>
        <button
          onClick={onCreateDatabase}
          className="px-2.5 py-1.5 text-xs rounded-md border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm active:scale-95 transition-all"
          title="데이터베이스"
        >
          <PixelIcon name="database" size={16} />
          <span className="font-bold">DB</span>
        </button>
        <div className="w-px h-4 bg-indigo-200 mx-1 shrink-0" />
        <button
          onClick={onCreateProject}
          disabled={selectedMemoryIds.size === 0}
          className="px-2.5 py-1.5 text-xs rounded-md border-2 border-indigo-500 bg-indigo-500 text-white font-black hover:bg-indigo-600 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 shadow-md active:scale-95"
          title={selectedMemoryIds.size === 0 ? "기억들을 선택한 후 프로젝트를 생성하세요" : "선택한 기억들로 실천 계획 생성"}
        >
          <PixelIcon name="success" size={16} className="text-white" />
          <span>액션플랜</span>
        </button>
        <button
          onClick={onToggleBlob}
          className={`px-2.5 py-1.5 text-xs rounded-md border border-indigo-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm active:scale-95 transition-all ${isBlobEnabled ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-700'}`}
          title="Blob 시각화 토글"
        >
          <PixelIcon name="group" size={16} className={isBlobEnabled ? 'text-white' : 'text-indigo-500'} />
          <span className="font-bold">{isBlobEnabled ? 'Blob ON' : 'Blob'}</span>
        </button>
      </div>
    </div>
  );
}
