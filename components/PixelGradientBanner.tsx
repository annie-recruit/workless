'use client';

import { useEffect, useMemo, useRef } from 'react';

type PixelGradientBannerProps = {
  className?: string;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function PixelGradientBanner({ className }: PixelGradientBannerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSizeRef = useRef<{ width: number; height: number; dpr: number } | null>(null);

  const internalCanvas = useMemo(() => {
    const LOGICAL_W = 320;
    const LOGICAL_H = 120;
    const CELL_SIZE = 4;
    const NOISE_AMPLITUDE = 14;

    const ORANGE_500 = [249, 115, 22] as const;
    const ORANGE_400 = [251, 146, 60] as const;
    const INDIGO_600 = [79, 70, 229] as const;

    const seed = 1337;
    const rand = mulberry32(seed);

    const c = document.createElement('canvas');
    c.width = LOGICAL_W;
    c.height = LOGICAL_H;
    const ctx = c.getContext('2d');
    if (!ctx) return c;

    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < LOGICAL_H; y += CELL_SIZE) {
      for (let x = 0; x < LOGICAL_W; x += CELL_SIZE) {
        const nx = x / (LOGICAL_W - 1);
        const ny = y / (LOGICAL_H - 1);
        const t = clamp(0.65 * nx + 0.35 * ny, 0, 1);

        let r: number;
        let g: number;
        let b: number;

        if (t < 0.5) {
          const tt = t / 0.5;
          r = lerp(ORANGE_500[0], ORANGE_400[0], tt);
          g = lerp(ORANGE_500[1], ORANGE_400[1], tt);
          b = lerp(ORANGE_500[2], ORANGE_400[2], tt);
        } else {
          const tt = (t - 0.5) / 0.5;
          r = lerp(ORANGE_400[0], INDIGO_600[0], tt);
          g = lerp(ORANGE_400[1], INDIGO_600[1], tt);
          b = lerp(ORANGE_400[2], INDIGO_600[2], tt);
        }

        const n = (rand() - 0.5) * NOISE_AMPLITUDE;
        const rr = clamp(Math.round(r + n), 0, 255);
        const gg = clamp(Math.round(g + n), 0, 255);
        const bb = clamp(Math.round(b + n), 0, 255);

        ctx.fillStyle = `rgb(${rr}, ${gg}, ${bb})`;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }

    return c;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      const last = lastSizeRef.current;
      if (last && last.width === width && last.height === height && last.dpr === dpr) return;
      lastSizeRef.current = { width, height, dpr };

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(internalCanvas, 0, 0, width, height);
    };

    let raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [internalCanvas]);

  const mergedClassName = [
    'absolute inset-0 h-full w-full pointer-events-none',
    className ?? '',
  ]
    .join(' ')
    .trim();

  return (
    <canvas
      ref={canvasRef}
      className={mergedClassName}
      style={{ imageRendering: 'pixelated', zIndex: -1 }}
      aria-hidden="true"
    />
  );
}
