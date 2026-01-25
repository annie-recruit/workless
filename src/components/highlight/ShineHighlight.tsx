'use client';

import { useMemo } from 'react';
import LottiePlayer from '@/components/LottiePlayer';

export type TargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
};

export type ShineHighlightProps = {
  targetRect: TargetRect;
  className?: string;
  speed?: number;
  path?: string;
};

const DEFAULT_PATH = '/assets/lottie/shine.json';
const DEFAULT_SPEED = 0.65;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function ShineHighlight({ targetRect, className, speed = DEFAULT_SPEED, path = DEFAULT_PATH }: ShineHighlightProps) {
  const style = useMemo(() => {
    const padding = clamp(Math.min(targetRect.width, targetRect.height) * 0.15, 24, 48);
    return {
      position: 'absolute' as const,
      left: targetRect.x - padding,
      top: targetRect.y - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
      zIndex: (targetRect.zIndex ?? 0) + 1,
      pointerEvents: 'none' as const,
    };
  }, [targetRect.height, targetRect.width, targetRect.x, targetRect.y, targetRect.zIndex]);

  return (
    <div className={className} style={style} aria-hidden="true">
      <LottiePlayer path={path} loop={true} autoplay={true} speed={speed} className="w-full h-full" />
    </div>
  );
}

