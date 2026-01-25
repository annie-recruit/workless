'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import LottiePlayer from './LottiePlayer';

export type PixelBurstHandle = {
  play: (args: { x: number; y: number; size?: number; width?: number; height?: number; zIndex?: number }) => void;
};

type BurstInstance = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

type PixelBurstLayerProps = {
  className?: string;
  path?: string;
};

const DEFAULT_PATH = '/assets/lottie/pixel-burst.json';
const DEFAULT_SPEED = 0.6;

const PixelBurstLayer = forwardRef<PixelBurstHandle, PixelBurstLayerProps>(function PixelBurstLayer(
  { className, path = DEFAULT_PATH },
  ref,
) {
  const counterRef = useRef(0);
  const [bursts, setBursts] = useState<BurstInstance[]>([]);

  const play = useCallback((args: { x: number; y: number; size?: number; width?: number; height?: number; zIndex?: number }) => {
    const id = `burst_${Date.now()}_${counterRef.current++}`;
    const width = Math.max(16, Math.floor(args.width ?? args.size ?? 48));
    const height = Math.max(16, Math.floor(args.height ?? args.size ?? 48));
    const zIndex = Math.floor(args.zIndex ?? 20000);

    setBursts((prev) => [...prev, { id, x: args.x, y: args.y, width, height, zIndex }]);
  }, []);

  useImperativeHandle(ref, () => ({ play }), [play]);

  const remove = useCallback((id: string) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return (
    <div className={['absolute inset-0 pointer-events-none', className ?? ''].join(' ').trim()}>
      {bursts.map((b) => (
        <div
          key={b.id}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: b.width,
            height: b.height,
            zIndex: b.zIndex,
            imageRendering: 'pixelated',
          }}
          aria-hidden="true"
        >
          <LottiePlayer
            path={path}
            loop={false}
            autoplay={true}
            speed={DEFAULT_SPEED}
            renderer="canvas"
            onComplete={() => remove(b.id)}
            className="w-full h-full"
          />
        </div>
      ))}
    </div>
  );
});

export default PixelBurstLayer;
