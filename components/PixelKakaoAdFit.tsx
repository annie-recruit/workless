'use client';

import { useRef } from 'react';
import Script from 'next/script';
import PixelIcon from './PixelIcon';

interface PixelKakaoAdFitProps {
    /**
     * 광고 단위 ID
     */
    unit?: string;
    /**
     * 광고 너비
     */
    width?: string;
    /**
     * 광고 높이
     */
    height?: string;
    /**
     * 커스텀 클래스명
     */
    className?: string;
    /**
     * 테두리 색상 (기본: yellow)
     */
    borderColor?: 'cyan' | 'purple' | 'pink' | 'yellow' | 'orange' | 'indigo';
}

export default function PixelKakaoAdFit({
    unit = "DAN-pPIckK10ycycJAhf",
    width = "728",
    height = "90",
    className = '',
    borderColor = 'yellow',
}: PixelKakaoAdFitProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const borderColorMap = {
        cyan: 'border-cyan-400',
        purple: 'border-purple-400',
        pink: 'border-pink-400',
        yellow: 'border-yellow-400',
        orange: 'border-orange-400',
        indigo: 'border-indigo-400',
    };

    const glowColorMap = {
        cyan: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
        purple: 'shadow-[0_0_20px_rgba(192,132,252,0.3)]',
        pink: 'shadow-[0_0_20px_rgba(244,114,182,0.3)]',
        yellow: 'shadow-[0_0_20px_rgba(250,204,21,0.3)]',
        orange: 'shadow-[0_0_20px_rgba(251,146,60,0.3)]',
        indigo: 'shadow-[0_0_20px_rgba(129,140,248,0.3)]',
    };

    return (
        <>
            <Script
                src="//t1.daumcdn.net/kas/static/ba.min.js"
                strategy="afterInteractive"
            />
            <div className={`pixel-adfit-wrapper ${className} flex justify-center`}>
                {/* 픽셀 아트 스타일 외부 프레임 */}
                <div className="relative group w-fit">
                    {/* 코너 장식 */}
                    <div className={`absolute -top-1 -left-1 w-3 h-3 ${borderColorMap[borderColor]} bg-current z-10`}></div>
                    <div className={`absolute -top-1 -right-1 w-3 h-3 ${borderColorMap[borderColor]} bg-current z-10`}></div>
                    <div className={`absolute -bottom-1 -left-1 w-3 h-3 ${borderColorMap[borderColor]} bg-current z-10`}></div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${borderColorMap[borderColor]} bg-current z-10`}></div>

                    {/* 메인 컨테이너 */}
                    <div
                        className={`
            relative w-fit mx-auto
            border-4 ${borderColorMap[borderColor]}
            bg-black/40 backdrop-blur-sm
            p-4
            ${glowColorMap[borderColor]}
            transition-all duration-300
            hover:scale-[1.02]
            group-hover:${glowColorMap[borderColor].replace('0.3', '0.5')}
          `}
                    >
                        {/* 상단 레이블 */}
                        <div className="absolute -top-3 left-4 px-2 bg-black">
                            <span className={`text-xs font-bold ${borderColorMap[borderColor].replace('border-', 'text-')} uppercase tracking-wider flex items-center gap-1`}>
                                <PixelIcon name="zap" size={10} className={borderColorMap[borderColor].replace('border-', 'text-')} />
                                <span>AdFit</span>
                            </span>
                        </div>

                        {/* 카카오 애드핏 광고 영역 */}
                        <div ref={containerRef} className="flex justify-center items-center" style={{ display: 'inline-block' }}>
                            <ins
                                className="kakao_ad_area"
                                data-ad-unit={unit}
                                data-ad-width={width}
                                data-ad-height={height}
                            ></ins>
                        </div>

                        {/* 하단 픽셀 도트 장식 */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-50">
                            {[...Array(3)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1 h-1 ${borderColorMap[borderColor]} bg-current animate-pulse`}
                                    style={{ animationDelay: `${i * 200}ms` }}
                                ></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
