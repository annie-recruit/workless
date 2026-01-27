import React from 'react';
import PixelIcon from './PixelIcon';

interface WidgetCreateButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function WidgetCreateButton({ isOpen, onClick }: WidgetCreateButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-1 ${isOpen ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'text-gray-700'}`}
      title="위젯 모음"
    >
      <PixelIcon name="menu" size={16} />
      <span>위젯 모음</span>
    </button>
  );
}
