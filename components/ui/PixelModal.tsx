/**
 * PixelModal — 픽셀 아트 스타일 모달 래퍼
 *
 * 모달 오버레이 + 카드 + 픽셀 코너 패턴이
 * 여러 컴포넌트에서 반복되므로 하나로 추상화합니다.
 */

'use client';

import React from 'react';
import { PixelCorners } from './PixelCorners';
import PixelIcon from '../PixelIcon';

interface PixelModalProps {
  /** 모달 표시 여부 */
  open: boolean;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 모달 타이틀 */
  title: string;
  /** 최대 너비 클래스 (기본 max-w-2xl) */
  maxWidth?: string;
  children: React.ReactNode;
}

export function PixelModal({
  open,
  onClose,
  title,
  maxWidth = 'max-w-2xl',
  children,
}: PixelModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[10001] p-4 font-galmuri11">
      <div
        className={`bg-white border-3 border-gray-900 p-6 ${maxWidth} w-full max-h-[80vh] overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative`}
      >
        <PixelCorners size={3} color="bg-gray-900" />

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-all"
          >
            <PixelIcon name="close" size={20} className="text-gray-600" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export default PixelModal;
