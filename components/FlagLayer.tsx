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
            style={{ 
              zIndex: 1,
              filter: 'drop-shadow(4px 4px 0px rgba(0, 0, 0, 0.3))'
            }}
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
                className="absolute border-2 border-indigo-400 bg-indigo-50"
                style={{
                  left: '50%',
                  top: '100%',
                  width: 28,
                  height: 28,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2), inset 0 0 0 2px rgba(255, 255, 255, 0.5)',
                }}
              />
            )}
            <img
              src="/assets/icons/real_flag2.png"
              alt={flag.name}
              width={104}
              height={97}
              className="pixel-icon relative"
              style={{ 
                zIndex: 1,
                filter: 'drop-shadow(4px 4px 0px rgba(0, 0, 0, 0.3))'
              }}
              draggable={false}
            />
            {(isHovered || isSelected) && (
              <div
                className="absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full"
                style={{ zIndex: 2 }}
              >
                <div className="px-3 py-1.5 text-xs font-bold border-2 border-gray-900 bg-white text-gray-900 whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] font-galmuri11 uppercase tracking-tight">
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
