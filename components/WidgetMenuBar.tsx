import React from 'react';
import PixelIcon from './PixelIcon';
import { CanvasBlock } from '@/types';
import { useLanguage } from './LanguageContext';

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
  const { t } = useLanguage();

  return (
    <div className="shrink-0 sticky top-0 z-20 flex items-center gap-2 px-3 py-2.5 text-xs text-gray-500 bg-indigo-50/30 backdrop-blur-xl border-b border-indigo-100/30 shadow-none overflow-x-auto no-scrollbar flex-nowrap flex-row">
      <div className="flex items-center gap-2 min-w-max">
        <button
          onClick={onCreateCalendar}
          className="px-2.5 py-1.5 text-xs rounded-md border border-indigo-200/50 bg-white/40 backdrop-blur-sm hover:bg-white/60 text-indigo-700 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-none active:scale-95 transition-all"
          title={t('onboarding.calendar')}
        >
          <PixelIcon name="calendar" size={16} />
          <span className="font-bold">{t('onboarding.calendar')}</span>
        </button>
        <button
          onClick={onCreateMinimap}
          disabled={blocks.some(b => b.type === 'minimap')}
          className="px-2.5 py-1.5 text-xs rounded-md border border-indigo-200/50 bg-white/40 backdrop-blur-sm hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-700 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-none active:scale-95 transition-all"
          title={blocks.some(b => b.type === 'minimap') ? t('memory.view.board.widget.minimap.limit') : t('memory.view.board.widget.minimap')}
        >
          <PixelIcon name="minimap" size={16} />
          <span className="font-bold">{t('memory.view.board.widget.minimap')}</span>
        </button>
        <button
          onClick={onCreateViewer}
          className="px-2.5 py-1.5 text-xs rounded-md border border-indigo-200/50 bg-white/40 backdrop-blur-sm hover:bg-white/60 text-indigo-700 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-none active:scale-95 transition-all"
          title={t('memory.view.board.widget.viewer')}
        >
          <PixelIcon name="viewer" size={16} />
          <span className="font-bold">{t('memory.view.board.widget.viewer')}</span>
        </button>
        <button
          onClick={onCreateMeetingRecorder}
          className="px-2.5 py-1.5 text-xs rounded-md border border-indigo-200/50 bg-white/40 backdrop-blur-sm hover:bg-white/60 text-indigo-700 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-none active:scale-95 transition-all"
          title={t('memory.view.board.widget.recorder')}
        >
          <PixelIcon name="meeting-recorder" size={16} />
          <span className="font-bold">{t('memory.view.board.widget.recorder')}</span>
        </button>
        <button
          onClick={onCreateDatabase}
          className="px-2.5 py-1.5 text-xs rounded-md border border-indigo-200/50 bg-white/40 backdrop-blur-sm hover:bg-white/60 text-indigo-700 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-none active:scale-95 transition-all"
          title={t('memory.view.board.widget.db')}
        >
          <PixelIcon name="database" size={16} />
          <span className="font-bold">{t('memory.view.board.widget.db')}</span>
        </button>
        <div className="w-px h-4 bg-indigo-200 mx-1 shrink-0" />
        <button
          onClick={onCreateProject}
          disabled={selectedMemoryIds.size === 0}
          className="px-2.5 py-1.5 text-xs rounded-md border-2 border-indigo-500 bg-indigo-500 text-white font-black hover:bg-indigo-600 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 shadow-md active:scale-95"
          title={selectedMemoryIds.size === 0 ? t('memory.view.board.widget.actionPlan.select') : t('memory.view.board.widget.actionPlan')}
        >
          <PixelIcon name="success" size={16} className="text-white" />
          <span>{t('memory.view.board.widget.actionPlan')}</span>
        </button>
        <button
          onClick={onToggleBlob}
          className={`px-2.5 py-1.5 text-xs rounded-md border border-indigo-200/50 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-none active:scale-95 transition-all ${isBlobEnabled ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/40 backdrop-blur-sm text-indigo-700'}`}
          title="Toggle Blob"
        >
          <PixelIcon name="group" size={16} className={isBlobEnabled ? 'text-white' : 'text-indigo-500'} />
          <span className="font-bold">{isBlobEnabled ? t('memory.view.board.widget.blob.on') : t('memory.view.board.widget.blob')}</span>
        </button>
      </div>
    </div>
  );
}
