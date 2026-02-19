/**
 * PixelButton — 픽셀 아트 스타일 버튼
 *
 * 프로젝트 전체에서 20+ 곳에서 반복되는 버튼 스타일을
 * variant 기반의 재사용 가능한 컴포넌트로 추상화합니다.
 */

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: [
    'bg-indigo-500 text-white border-2 border-gray-900',
    'hover:bg-indigo-600',
    'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]',
    'hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]',
    'active:shadow-none active:translate-x-[2px] active:translate-y-[2px]',
  ].join(' '),
  secondary: [
    'bg-white text-gray-700 border-2 border-gray-900',
    'hover:bg-gray-100',
    'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]',
    'hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]',
    'active:shadow-none active:translate-x-[2px] active:translate-y-[2px]',
  ].join(' '),
  danger: [
    'bg-red-500 text-white border-2 border-gray-900',
    'hover:bg-red-600',
    'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]',
    'hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]',
    'active:shadow-none active:translate-x-[2px] active:translate-y-[2px]',
  ].join(' '),
  ghost: [
    'bg-transparent text-gray-600 border-2 border-transparent',
    'hover:bg-gray-100 hover:border-gray-300',
  ].join(' '),
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-[10px]',
  md: 'px-4 py-2 text-xs',
  lg: 'px-5 py-2.5 text-sm',
};

export function PixelButton({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: PixelButtonProps) {
  return (
    <button
      className={[
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        'font-bold uppercase tracking-tight transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}

export default PixelButton;
