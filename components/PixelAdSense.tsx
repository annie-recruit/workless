'use client';

import { useEffect, useRef } from 'react';
import PixelIcon from './PixelIcon';

interface PixelAdSenseProps {
    /**
     * 광고 슬롯 ID (예: "1234567890")
     */
    adSlot?: string;
    /**
     * 광고 형식 (auto, rectangle, horizontal, vertical)
     */
    adFormat?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
    /**
     * 전체 너비 반응형 여부
     */
    fullWidthResponsive?: boolean;
    /**
     * 커스텀 클래스명
     */
    className?: string;
    /**
     * 테두리 색상 (기본: cyan)
     */
    borderColor?: 'cyan' | 'purple' | 'pink' | 'yellow' | 'orange' | 'indigo';
}

export default function PixelAdSense({
    adSlot,
    adFormat = 'auto',
    fullWidthResponsive = true,
    className = '',
    borderColor = 'cyan',
}: PixelAdSenseProps) {
    const adRef = useRef<HTMLModElement>(null);
    const isAdPushed = useRef(false);

    useEffect(() => {
        // 이미 광고가 푸시되었거나 광고 요소가 없으면 리턴
        if (isAdPushed.current || !adRef.current) return;

        try {
            // 이미 광고가 로드되었는지 확인
            const adStatus = adRef.current.getAttribute('data-adsbygoogle-status');
            if (adStatus === 'done') {
                console.log('AdSense: Ad already loaded, skipping push');
                return;
            }

            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            isAdPushed.current = true;
        } catch (err) {
            console.error('AdSense error:', err);
        }
    }, []);

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
        <div className={`pixel-adsense-wrapper ${className} flex justify-center w-full overflow-hidden`}>
            {/* 애드센스 광고 영역 */}
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'block', minWidth: '250px' }}
                data-ad-client="ca-pub-1164366157890050"
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
            ></ins>
        </div>
    );
}
