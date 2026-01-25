/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import lottie, { type AnimationItem } from 'lottie-web';

type LottieRenderer = 'svg' | 'canvas' | 'html';

interface LottiePlayerProps {
  /** public 경로 (예: /lottie/graph.blob.idle.json) */
  path: string;
  className?: string;
  style?: CSSProperties;
  loop?: boolean;
  autoplay?: boolean;
  renderer?: LottieRenderer;
  /** 재생 속도 (기본 1.0) */
  speed?: number;
  /** autoplay=false일 때 멈춰둘 프레임 (기본 0) */
  stillFrame?: number;
  /** loop=false일 때 완료 콜백 */
  onComplete?: () => void;
}

export default function LottiePlayer({
  path,
  className,
  style,
  loop = true,
  autoplay = true,
  renderer = 'svg',
  speed = 1,
  stillFrame = 0,
  onComplete,
}: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    animRef.current?.setSpeed(speed);
  }, [speed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // prefers-reduced-motion: reduce면 자동재생 비활성화
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (animRef.current) {
      animRef.current.destroy();
      animRef.current = null;
    }

    const anim = lottie.loadAnimation({
      container,
      renderer,
      loop: prefersReducedMotion ? false : loop,
      autoplay: prefersReducedMotion ? false : autoplay,
      path,
      rendererSettings: {
        // svg 안티앨리어싱/스케일링 품질
        preserveAspectRatio: 'xMidYMid meet',
      } as any,
    });

    animRef.current = anim;
    anim.setSpeed(speed);

    if (!autoplay || prefersReducedMotion) {
      anim.addEventListener('DOMLoaded', () => {
        try {
          anim.goToAndStop(stillFrame, true);
        } catch {
          // ignore
        }
      });
    }

    if (!loop && onComplete) {
      const handler = () => onComplete();
      anim.addEventListener('complete', handler);
      return () => {
        anim.removeEventListener('complete', handler);
        anim.destroy();
        animRef.current = null;
      };
    }

    return () => {
      anim.destroy();
      animRef.current = null;
    };
  }, [path, loop, autoplay, renderer, speed, stillFrame, onComplete]);

  return <div ref={containerRef} className={className} style={style} />;
}
