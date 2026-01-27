'use client';

import React from 'react';
import PixelIcon from './PixelIcon';

interface ViewerFrameProps {
  children?: React.ReactNode;
  title?: string;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 심플한 픽셀 맥 윈도우 스타일의 뷰어 프레임
 */
export default function ViewerFrame({ 
  children, 
  title = 'Viewer',
  onClose,
  className = '',
  style = {}
}: ViewerFrameProps) {
  return (
    <div 
      className={`flex flex-col bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] overflow-hidden font-galmuri11 ${className}`}
      style={{
        ...style,
        imageRendering: 'pixelated',
      }}
    >
      {/* 타이틀 바 */}
      <div className="h-10 bg-[#EEEEEE] border-b-[4px] border-black flex items-center justify-between px-3 select-none">
        <div className="flex items-center gap-2">
          {/* 맥 스타일 픽셀 버튼들 */}
          <div className="flex gap-1.5">
            <div className="w-3.5 h-3.5 border-2 border-black bg-[#FF5F56] shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]" />
            <div className="w-3.5 h-3.5 border-2 border-black bg-[#FFBD2E] shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]" />
            <div className="w-3.5 h-3.5 border-2 border-black bg-[#27C93F] shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]" />
          </div>
          <span className="ml-2 text-xs font-bold text-black uppercase tracking-tight truncate max-w-[200px]">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-6 h-6 border-2 border-black bg-white hover:bg-red-50 flex items-center justify-center transition-colors active:translate-y-[1px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
            >
              <PixelIcon name="close" size={14} className="text-black" />
            </button>
          )}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 relative overflow-auto bg-white">
        {children}
      </div>

      {/* 하단 데코레이션 (상태바 느낌) */}
      <div className="h-6 bg-[#F5F5F5] border-t-[2px] border-gray-200 flex items-center px-3 justify-end">
        <div className="w-3 h-3 border-r-2 border-b-2 border-gray-400 opacity-50" />
      </div>
    </div>
  );
}
