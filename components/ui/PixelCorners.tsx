/**
 * PixelCorners — 픽셀 아트 카드의 모서리 장식
 *
 * 15+ 곳에서 반복되던 4개의 절대 위치 div를
 * 하나의 컴포넌트로 추상화합니다.
 */

import React from 'react';

interface PixelCornersProps {
  /** 장식 크기 (기본 2 = w-2 h-2) */
  size?: 1 | 1.5 | 2 | 3;
  /** 장식 색상 (기본 bg-gray-800) */
  color?: string;
}

const OFFSET_MAP: Record<number, string> = {
  1: '-top-0.5 -left-0.5',
  1.5: '-top-1 -left-1',
  2: '-top-1 -left-1',
  3: '-top-1.5 -left-1.5',
};

const SIZE_MAP: Record<number, string> = {
  1: 'w-1 h-1',
  1.5: 'w-1.5 h-1.5',
  2: 'w-2 h-2',
  3: 'w-3 h-3',
};

export function PixelCorners({ size = 2, color = 'bg-gray-800' }: PixelCornersProps) {
  const sizeClass = SIZE_MAP[size];
  const offset = size === 3 ? '1.5' : size === 2 ? '1' : size === 1.5 ? '1' : '0.5';

  return (
    <>
      <div className={`absolute -top-${offset} -left-${offset} ${sizeClass} ${color}`} />
      <div className={`absolute -top-${offset} -right-${offset} ${sizeClass} ${color}`} />
      <div className={`absolute -bottom-${offset} -left-${offset} ${sizeClass} ${color}`} />
      <div className={`absolute -bottom-${offset} -right-${offset} ${sizeClass} ${color}`} />
    </>
  );
}

export default PixelCorners;
