'use client';

import { useEffect, useMemo, useRef } from 'react';

const BLOB_CANVAS_SIZE = 160;
const BLOB_RING_WIDTH_PX = 6;
const BLOB_JITTER_RANGE_PX: [number, number] = [1, 3];
const BLOB_PERIOD_RANGE_MS: [number, number] = [2000, 4000];
const BLOB_CENTER_COUNT = 3;
const BLOB_ANIMATION_STEPS = 5;
const BLOB_HOVERED_STEPS = 6;

const BLOB_ALPHA_PRESETS: Record<number, number[]> = {
  4: [0, 80, 160, 255],
  5: [0, 60, 120, 200, 255],
  6: [0, 50, 110, 170, 220, 255],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clamp01 = (value: number) => clamp(value, 0.08, 0.92);

const seededRandom = (value: number) => {
  const x = Math.sin(value) * 10000;
  return x - Math.floor(x);
};

const seededNoise = (seed: number, x: number, y: number) => {
  const combined = x * 374761393 + y * 668265263 + seed * 982451653;
  return seededRandom(combined);
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : normalized.padStart(6, '0');
  const int = parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const delta = max - min;
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h = 0;
  if (max === rNorm) h = (gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0);
  else if (max === gNorm) h = (bNorm - rNorm) / delta + 2;
  else h = (rNorm - gNorm) / delta + 4;
  h /= 6;
  return { h, s, l };
};

const hslToHex = (h: number, s: number, l: number) => {
  const hueToRgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16).padStart(2, '0');
    return hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const paletteCache = new Map<string, Array<{ color: string; alpha: number }>>();

const generatePalette = (baseHex: string, steps: number) => {
  const cacheKey = `${baseHex}-${steps}`;
  if (paletteCache.has(cacheKey)) return paletteCache.get(cacheKey)!;

  const rgb = hexToRgb(baseHex);
  const baseHsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const alphaPreset = BLOB_ALPHA_PRESETS[steps] ?? null;
  const palette = Array.from({ length: steps }, (_, idx) => {
    const ratio = steps === 1 ? 0 : idx / (steps - 1);
    const offset = (ratio - 0.5) * 0.24;
    const adjustedL = clamp(baseHsl.l - offset, 0, 1);
    const adjustedS = clamp(baseHsl.s + offset * 0.16, 0, 1);
    const color = hslToHex(baseHsl.h, adjustedS, adjustedL);
    const alpha = alphaPreset ? alphaPreset[idx] ?? 255 : Math.round((ratio * 0.5 + 0.5) * 255);
    return { color, alpha };
  });
  paletteCache.set(cacheKey, palette);
  return palette;
};

const createCenters = (seed: number) => {
  return Array.from({ length: BLOB_CENTER_COUNT }, (_, idx) => {
    const angle = ((idx / BLOB_CENTER_COUNT) * Math.PI * 2 + seededRandom(seed + idx * 17) * 0.7) % (Math.PI * 2);
    const radius = 0.28 + seededRandom(seed + idx * 31) * 0.1;
    const jitterRadius = 0.17 + seededRandom(seed + idx * 37) * 0.1;
    const x = clamp01(0.5 + Math.cos(angle) * jitterRadius);
    const y = clamp01(0.5 + Math.sin(angle) * jitterRadius);
    return { x, y, radius };
  });
};

const createAnimationConfig = (seed: number) => {
  const period = clamp(
    BLOB_PERIOD_RANGE_MS[0] + seededRandom(seed + 5) * (BLOB_PERIOD_RANGE_MS[1] - BLOB_PERIOD_RANGE_MS[0]),
    BLOB_PERIOD_RANGE_MS[0],
    BLOB_PERIOD_RANGE_MS[1],
  );
  const amplitude = clamp(
    BLOB_JITTER_RANGE_PX[0] + seededRandom(seed + 9) * (BLOB_JITTER_RANGE_PX[1] - BLOB_JITTER_RANGE_PX[0]),
    BLOB_JITTER_RANGE_PX[0],
    BLOB_JITTER_RANGE_PX[1],
  );
  const phaseOffset = seededRandom(seed + 13) * Math.PI * 2;
  const angularSpeed = (Math.PI * 2) / period;
  return { amplitude, phaseOffset, angularSpeed };
};

type Bounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

type BlobRendererProps = {
  bounds: Bounds;
  color: string;
  seed: number;
  hovered?: boolean;
};

const fillPixels = ({
  buffer,
  size,
  paletteRgb,
  paletteAlpha,
  centers,
  jitterNorm,
  ringWidthNorm,
  seed,
}: {
  buffer: Uint8ClampedArray;
  size: number;
  paletteRgb: Array<{ r: number; g: number; b: number }>;
  paletteAlpha: number[];
  centers: Array<{ x: number; y: number; radius: number }>;
  jitterNorm: number;
  ringWidthNorm: number;
  seed: number;
}) => {
  const centerIndex = Math.floor((paletteRgb.length - 1) / 2);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    const py = (y + 0.5) / size;
    for (let x = 0; x < size; x += 1) {
      const px = (x + 0.5) / size;
      let signedDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < centers.length; i += 1) {
        const center = centers[i];
        const dx = px - center.x;
        const dy = py - center.y;
        const dist = Math.hypot(dx, dy);
        const radius = center.radius + jitterNorm;
        const distance = dist - radius;
        signedDistance = Math.min(signedDistance, distance);
      }
      const noise = (seededNoise(seed, x, y) - 0.5) * 0.04;
      const normalizedDistance = signedDistance + noise;
      const ringIndex = clamp(
        Math.round(centerIndex + normalizedDistance / Math.max(ringWidthNorm, 1e-3)),
        0,
        paletteRgb.length - 1,
      );
      const color = paletteRgb[ringIndex];
      const alpha = paletteAlpha[ringIndex] ?? 255;
      buffer[offset] = color.r;
      buffer[offset + 1] = color.g;
      buffer[offset + 2] = color.b;
      buffer[offset + 3] = alpha;
      offset += 4;
    }
  }
};

export default function BlobRenderer({ bounds, color, seed, hovered = false }: BlobRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);

  const paletteSteps = hovered ? BLOB_HOVERED_STEPS : BLOB_ANIMATION_STEPS;
  const palette = useMemo(() => generatePalette(color, paletteSteps), [color, paletteSteps]);
  const paletteRgb = useMemo(
    () => palette.map((entry) => hexToRgb(entry.color)),
    [palette],
  );
  const paletteAlpha = useMemo(() => palette.map((entry) => entry.alpha), [palette]);
  const centers = useMemo(() => createCenters(seed), [seed]);
  const animationConfig = useMemo(() => createAnimationConfig(seed), [seed]);

  const style = useMemo(
    () => ({
      position: 'absolute' as const,
      left: bounds.minX,
      top: bounds.minY,
      width: bounds.width,
      height: bounds.height,
      pointerEvents: 'none' as const,
      imageRendering: 'pixelated' as const,
      zIndex: 400,
    }),
    [bounds.minX, bounds.minY, bounds.width, bounds.height],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const widthPx = Math.max(1, Math.round(bounds.width));
    const heightPx = Math.max(1, Math.round(bounds.height));
    if (widthPx === 0 || heightPx === 0) return;

    canvas.width = widthPx;
    canvas.height = heightPx;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const offscreen = offscreenRef.current || document.createElement('canvas');
    offscreen.width = BLOB_CANVAS_SIZE;
    offscreen.height = BLOB_CANVAS_SIZE;
    offscreenRef.current = offscreen;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const size = BLOB_CANVAS_SIZE;
    let imageData = imageDataRef.current;
    if (!imageData || imageData.width !== size || imageData.height !== size) {
      imageData = offCtx.createImageData(size, size);
      imageDataRef.current = imageData;
    }
    const buffer = imageData.data;

    const maxDim = Math.max(bounds.width, bounds.height, 1);
    const ringWidthNorm = BLOB_RING_WIDTH_PX / maxDim;

    let animationFrame: number | null = null;
    const drawFrame = (time: number) => {
      const jitterPx =
        animationConfig.amplitude *
        Math.sin(time * animationConfig.angularSpeed + animationConfig.phaseOffset);
      const jitterNorm = jitterPx / maxDim;

      fillPixels({
        buffer,
        size,
        paletteRgb,
        paletteAlpha,
        centers,
        jitterNorm,
        ringWidthNorm,
        seed,
      });

      offCtx.putImageData(imageData, 0, 0);

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, widthPx, heightPx);
      ctx.drawImage(offscreen, 0, 0, widthPx, heightPx);

      animationFrame = requestAnimationFrame(drawFrame);
    };

    animationFrame = requestAnimationFrame(drawFrame);
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [
    bounds.width,
    bounds.height,
    paletteRgb,
    paletteAlpha,
    centers,
    animationConfig,
    seed,
  ]);

  return <canvas ref={canvasRef} style={style} aria-hidden="true" />;
}
