'use client';

import type { CSSProperties } from 'react';
import LottiePlayer from './LottiePlayer';

export type ProcessingLoaderVariant = 'inline' | 'panel' | 'overlay';
export type ProcessingLoaderTone = 'black' | 'indigo' | 'orange' | 'muted';

interface ProcessingLoaderProps {
  /** 로더 크기 (픽셀) */
  size?: number;
  /** 크기 배율 (기본 2 = 200%) */
  scale?: number;
  /** 배치 방식 */
  variant?: ProcessingLoaderVariant;
  /** 색상 톤 */
  tone?: ProcessingLoaderTone;
  /** 상태 텍스트 라벨 (옵션) */
  label?: string;
  /** 추가 className */
  className?: string;
  /** 추가 style */
  style?: CSSProperties;
}

/**
 * Workless 전역 로딩/처리 중 애니메이션 컴포넌트
 * 
 * @example
 * // 인라인 (버튼 안)
 * <ProcessingLoader size={16} variant="inline" />
 * 
 * // 패널 (위젯 내부)
 * <ProcessingLoader size={32} variant="panel" label="처리 중..." />
 * 
 * // 오버레이 (전체 화면)
 * <ProcessingLoader size={64} variant="overlay" label="불러오는 중..." />
 */
export default function ProcessingLoader({
  size,
  scale = 2,
  variant = 'inline',
  tone = 'indigo',
  label,
  className = '',
  style = {},
}: ProcessingLoaderProps) {
  // variant별 기본 사이즈
  const defaultSizes: Record<ProcessingLoaderVariant, number> = {
    inline: 16,
    panel: 28,
    overlay: 48,
  };

  const baseHeight = Math.max(1, Math.round(size ?? defaultSizes[variant]));
  const clampedScale = Math.max(1, Math.round(scale));

  const minBarHeight = variant === 'panel' || variant === 'overlay' ? 70 : 0; // 기본 존재감 확보
  const barHeight = Math.max(minBarHeight, baseHeight * clampedScale);
  const barWidth = Math.round((barHeight * 100) / 35); // 원본 비율(100x35) 유지

  // tone별 필터 스타일
  const toneFilters: Record<ProcessingLoaderTone, CSSProperties> = {
    black: { filter: 'brightness(0)' },
    muted: { filter: 'brightness(0)', opacity: 0.35 },
    indigo: {
      // Approx. Tailwind indigo-600 (#4F46E5)
      filter:
        'brightness(0) saturate(100%) invert(24%) sepia(86%) saturate(2942%) hue-rotate(233deg) brightness(96%) contrast(98%)',
    },
    orange: {
      // Approx. Tailwind orange-500 (#F97316)
      filter:
        'brightness(0) saturate(100%) invert(55%) sepia(70%) saturate(2382%) hue-rotate(353deg) brightness(98%) contrast(98%)',
    },
  };

  // variant별 컨테이너 스타일
  const containerStyles: Record<ProcessingLoaderVariant, string> = {
    inline: 'inline-flex items-center',
    panel: 'flex flex-col items-center justify-center p-4 min-h-[120px]',
    overlay: 'flex flex-col items-center justify-center p-6 min-h-[180px]',
  };

  const containerClass = containerStyles[variant];

  // Lottie 파일 경로
  const lottiePath = '/lottie/loading-bar.json';

  return (
    <div
      className={`${containerClass} ${className}`}
      style={style}
      role="status"
      aria-label={label ?? 'Loading'}
    >
      <div
        className="relative"
        style={{
          width: `${barWidth}px`,
          height: `${barHeight}px`,
          ...toneFilters[tone],
        }}
      >
        <LottiePlayer
          path={lottiePath}
          loop={true}
          autoplay={true}
          className="w-full h-full"
        />
      </div>
      {label && variant === 'inline' && (
        <div className="text-xs text-gray-500 ml-2">{label}</div>
      )}
    </div>
  );
}
