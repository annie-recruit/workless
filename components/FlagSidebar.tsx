'use client';

import React from 'react';
import type { FlagBookmark } from '@/components/FlagContext';

type Props = {
  flags: FlagBookmark[];
  selectedFlagId: string | null;
  activeFlagId: string | null;
  hoveredFlagId: string | null;
  isPlacing: boolean;
  onAddFlag: () => void;
  onGoToFlag: (flagId: string) => void;
  onHoverFlag: (flagId: string | null) => void;
};

export default function FlagSidebar({
  flags,
  selectedFlagId,
  activeFlagId,
  hoveredFlagId,
  isPlacing,
  onAddFlag,
  onGoToFlag,
  onHoverFlag,
}: Props) {
  return (
    <div className="w-14 shrink-0 border-r border-gray-200 bg-white px-1 py-3 flex flex-col items-center gap-4 sticky top-0 z-20 h-full overflow-y-auto overflow-x-hidden">
      <button
        type="button"
        onClick={onAddFlag}
        className="w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        title="Flag 추가"
      >
        <span className="text-lg font-bold leading-none">+</span>
        <span className="text-[10px] font-semibold tracking-tight">Add</span>
      </button>

      <div className="flex-1 w-full flex flex-col items-center gap-2">
        {flags.map((flag) => {
          const isSelected = selectedFlagId === flag.id;
          const isActive = activeFlagId === flag.id;
          const isHovered = hoveredFlagId === flag.id;

          return (
            <button
              key={flag.id}
              type="button"
              onClick={() => onGoToFlag(flag.id)}
              onMouseEnter={() => onHoverFlag(flag.id)}
              onMouseLeave={() => onHoverFlag(null)}
              className={`relative w-10 h-10 flex items-center justify-center rounded-xl border transition-colors ${isSelected
                ? 'bg-indigo-50 border-indigo-500'
                : isActive
                  ? 'bg-indigo-50 border-indigo-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              title={flag.name}
            >
              <img
                src="/assets/icons/real_flag2.png"
                alt={flag.name}
                width={26}
                height={26}
                className="pixel-icon"
                style={{ opacity: isSelected ? 1 : 0.9 }}
                draggable={false}
              />

              {(isSelected || isHovered) && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                  <div
                    className={`px-2 py-1 text-xs border whitespace-nowrap ${isSelected ? 'bg-gray-900 text-white border-indigo-500' : 'bg-white text-gray-700 border-gray-200'
                      }`}
                  >
                    {flag.name}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {isPlacing && (
        <div className="w-full px-1 pb-1">
          <div className="text-[10px] text-gray-500 leading-tight text-center">
            Click on board to place flag
            <br />
            Esc to cancel
          </div>
        </div>
      )}
    </div>
  );
}
