'use client';

import React from 'react';
import type { FlagBookmark } from '@/components/FlagContext';

type Props = {
  flags: FlagBookmark[];
  hoveredFlagId: string | null;
  selectedFlagId: string | null;
  draft?: { x: number; y: number } | null;
};

export default function FlagLayer({ flags, hoveredFlagId, selectedFlagId, draft }: Props) {
  if (flags.length === 0 && !draft) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {draft && (
        <div
          className="absolute opacity-40"
          style={{
            left: draft.x,
            top: draft.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <img
            src="/assets/icons/real_flag2.png"
            alt="Flag preview"
            width={104}
            height={97}
            className="pixel-icon relative"
            style={{ zIndex: 1 }}
            draggable={false}
          />
        </div>
      )}

      {flags.map((flag) => {
        const isHovered = hoveredFlagId === flag.id;
        const isSelected = selectedFlagId === flag.id;

        return (
          <div
            key={flag.id}
            className="absolute"
            style={{
              left: flag.x,
              top: flag.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {(isHovered || isSelected) && (
              <div
                className="absolute"
                style={{
                  left: '50%',
                  top: '100%',
                  width: 24,
                  height: 24,
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(99, 102, 241, 0.10)',
                  border: '1px solid rgba(99, 102, 241, 0.20)',
                }}
              />
            )}
            <img
              src="/assets/icons/real_flag2.png"
              alt={flag.name}
              width={104}
              height={97}
              className="pixel-icon relative"
              style={{ zIndex: 1 }}
              draggable={false}
            />
            {(isHovered || isSelected) && (
              <div
                className="absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full"
                style={{ zIndex: 2 }}
              >
                <div className="px-2 py-1 text-xs border border-gray-200 bg-white text-gray-700 whitespace-nowrap">
                  {flag.name}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
