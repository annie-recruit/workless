'use client';

import type { CSSProperties } from 'react';
import LottiePlayer from './LottiePlayer';

export type ProcessingLoaderVariant = 'inline' | 'panel' | 'overlay';
export type ProcessingLoaderTone = 'graphite' | 'black' | 'indigo' | 'orange' | 'muted' | 'white';

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
  tone = 'graphite',
  label,
  className = '',
  style = {},
}: ProcessingLoaderProps) {
  // variant별 기본 사이즈
  const defaultSizes: Record<ProcessingLoaderVariant, number> = {
    inline: 16,
    panel: 18,
    overlay: 28,
  };

  const baseSize = Math.max(1, Math.round(size ?? defaultSizes[variant]));
  const clampedScale = Math.max(1, Math.round(scale));

  const minSize = variant === 'panel' || variant === 'overlay' ? 36 : 0; // 기본 존재감 확보
  const pixelSize = Math.max(minSize, baseSize * clampedScale);

  // tone별 필터 스타일
  const toneFilters: Record<ProcessingLoaderTone, CSSProperties> = {
    // 찐회색(그래파이트) 느낌: 모든 색을 회색으로 눌러서 통일
    // NOTE: "더 찐한 회색"을 위해 색상을 단일 다크그레이로 눌러 통일합니다.
    // brightness(0)로 전부 검정으로 만든 뒤, invert(0.22)로 #383838 정도의 찐회색으로 올립니다.
    graphite: { filter: 'grayscale(1) brightness(0) invert(0.22)' },
    black: { filter: 'brightness(0)' },
    muted: { filter: 'brightness(0)', opacity: 0.35 },
    // 기존 컬러 톤은 요청에 맞춰 찐회색으로 통일(호환성 유지용 키)
    indigo: { filter: 'grayscale(1) brightness(0) invert(0.22)' },
    orange: { filter: 'grayscale(1) brightness(0) invert(0.22)' },
    white: {
      filter: 'brightness(0) invert(1)',
    },
  };

  // variant별 컨테이너 스타일
  const containerStyles: Record<ProcessingLoaderVariant, string> = {
    inline: 'inline-flex items-center',
    panel: 'flex flex-col items-center justify-center p-4 min-h-[120px]',
    overlay: 'flex flex-col items-center justify-center p-6 min-h-[180px]',
  };

  const containerClass = containerStyles[variant];

  // Lottie JSON 파일 경로 (dotLottie에서 추출)
  const lottiePath = '/lottie/pixel-stickman-running.json';

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
          width: `${pixelSize}px`,
          height: `${pixelSize}px`,
          imageRendering: 'pixelated',
          ...toneFilters[tone],
        }}
      >
        <LottiePlayer path={lottiePath} loop={true} autoplay={true} renderer="canvas" className="w-full h-full" />
      </div>
      {label && variant === 'inline' && (
        <div className="text-xs text-gray-500 ml-2">{label}</div>
      )}
    </div>
  );
}
