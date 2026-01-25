'use client';

import { useMemo } from 'react';
import BlobRenderer from './BlobRenderer';

type BlobArea = {
  id: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  color: string;
  seed: number;
  memoryIds: string[];
};

type BlobLayerProps = {
  blobAreas: BlobArea[];
  hoveredBlobId: string | null;
  hoveredMemoryId: string | null;
};

export default function BlobLayer({ blobAreas, hoveredBlobId, hoveredMemoryId }: BlobLayerProps) {
  const sortedBlobs = useMemo(() => {
    return blobAreas
      .map((blob) => {
        const width = Math.max(1, blob.bounds.maxX - blob.bounds.minX);
        const height = Math.max(1, blob.bounds.maxY - blob.bounds.minY);
        return { blob, width, height };
      })
      .filter(({ width, height }) => width > 0 && height > 0)
      .sort((a, b) => a.width * a.height - b.width * b.height);
  }, [blobAreas]);

  if (sortedBlobs.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 300 }}>
      {sortedBlobs.map(({ blob, width, height }) => {
        const bounds = blob.bounds;
        const isHovered =
          hoveredBlobId === blob.id ||
          (hoveredMemoryId != null && blob.memoryIds.includes(hoveredMemoryId));
        return (
          <BlobRenderer
            key={`blob-${blob.id}`}
            bounds={{
              minX: bounds.minX,
              minY: bounds.minY,
              width,
              height,
            }}
            seed={blob.seed}
            color={blob.color}
            hovered={isHovered}
          />
        );
      })}
    </div>
  );
}
