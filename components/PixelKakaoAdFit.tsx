'use client';

import { useRef } from 'react';
import Script from 'next/script';

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
}

export default function PixelKakaoAdFit({
    unit = "DAN-Lja4mtt5CjyPrZKb",
    width = "728",
    height = "90",
    className = '',
}: PixelKakaoAdFitProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <>
            <Script
                src="//t1.daumcdn.net/kas/static/ba.min.js"
                strategy="afterInteractive"
            />
            <div className={`pixel-adfit-wrapper ${className} flex justify-center`}>
                {/* 카카오 애드핏 광고 영역 - 장식 없이 순수 광고만 표시 */}
                <div ref={containerRef}>
                    <ins
                        className="kakao_ad_area"
                        data-ad-unit={unit}
                        data-ad-width={width}
                        data-ad-height={height}
                    ></ins>
                </div>
            </div>
        </>
    );
}
