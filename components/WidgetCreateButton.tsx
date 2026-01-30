import React from 'react';
import PixelIcon from './PixelIcon';
import { useLanguage } from './LanguageContext';

interface WidgetCreateButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function WidgetCreateButton({ isOpen, onClick }: WidgetCreateButtonProps) {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded border border-white/30 bg-white/40 backdrop-blur-sm hover:bg-white/60 flex items-center gap-1 whitespace-nowrap transition-all ${isOpen ? 'bg-indigo-50/80 text-indigo-700 border-indigo-300' : 'text-gray-700'}`}
      title={t('memory.view.board.widget.menu')}
    >
      <PixelIcon name="menu" size={16} />
      <span className="whitespace-nowrap">{t('memory.view.board.widget.menu')}</span>
    </button>
  );
}
