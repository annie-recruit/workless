'use client';

import React from 'react';
import type { FlagBookmark } from '@/components/FlagContext';
import PixelIcon from './PixelIcon';
import { useLanguage } from './LanguageContext';

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

export default function FlagMenuBar({
    flags,
    selectedFlagId,
    activeFlagId,
    hoveredFlagId,
    isPlacing,
    onAddFlag,
    onGoToFlag,
    onHoverFlag,
}: Props) {
    const { t } = useLanguage();

    return (
        <div className="shrink-0 sticky top-0 z-20 border-b border-white/20 bg-white/80 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap flex-row">
            <button
                type="button"
                onClick={onAddFlag}
                className="shrink-0 px-3 py-1.5 flex items-center gap-1.5 rounded border border-white/30 bg-white/70 hover:bg-white transition-colors text-xs whitespace-nowrap"
                title={t('flag.manage.add')}
            >
                <PixelIcon name="flag" size={16} />
                <span className="font-medium text-gray-700 whitespace-nowrap">{t('flag.manage.add')}</span>
            </button>

            {isPlacing && (
                <div className="text-[11px] text-indigo-600 font-medium whitespace-nowrap shrink-0">
                    {t('flag.manage.placing')}
                </div>
            )}

            <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar flex-nowrap flex-row">
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
                            className={`shrink-0 px-2 py-1 flex items-center gap-1.5 rounded border transition-colors text-xs whitespace-nowrap ${isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                : isActive
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-600'
                                    : 'bg-white/70 border-white/30 hover:bg-white text-gray-700'
                                }`}
                            title={flag.name}
                        >
                            <img
                                src="/assets/icons/real_flag2.png"
                                alt={flag.name}
                                width={16}
                                height={16}
                                className="pixel-icon"
                                style={{ opacity: isSelected ? 1 : 0.9 }}
                                draggable={false}
                            />
                            <span className="font-medium whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis">
                                {flag.name}
                            </span>
                        </button>
                    );
                })}
            </div>

            {flags.length === 0 && !isPlacing && (
                <div className="text-[11px] text-gray-400 italic">
                    {t('flag.manage.noFlags')}
                </div>
            )}
        </div>
    );
}
