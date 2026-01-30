'use client';

import { useEffect, useRef } from 'react';

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
}

export default function PixelAdSense({
    adSlot,
    adFormat = 'auto',
    fullWidthResponsive = true,
    className = '',
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
