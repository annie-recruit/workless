'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

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
    const hasMounted = useRef(false);

    useEffect(() => {
        // 개발 환경에서 중복 실행 방지
        if (hasMounted.current) return;
        hasMounted.current = true;

        // 이미 광고가 푸시되었거나 광고 요소가 없으면 리턴
        if (isAdPushed.current || !adRef.current) return;

        try {
            // 이미 광고가 로드되었는지 확인
            const adStatus = adRef.current.getAttribute('data-adsbygoogle-status');
            if (adStatus === 'done' || adStatus === 'filled') {
                console.log('[AdSense] Ad already loaded, skipping push');
                isAdPushed.current = true;
                return;
            }

            // 광고가 이미 처리 중인지 확인
            const currentAds = document.querySelectorAll('.adsbygoogle');
            let alreadyProcessed = false;
            
            currentAds.forEach((ad) => {
                const status = ad.getAttribute('data-adsbygoogle-status');
                if (status && ad === adRef.current) {
                    alreadyProcessed = true;
                }
            });

            if (alreadyProcessed) {
                console.log('[AdSense] Ad is being processed, skipping');
                return;
            }

            // 짧은 지연 후 광고 로드 (렌더링 완료 대기)
            const timer = setTimeout(() => {
                if (adRef.current && !isAdPushed.current) {
                    try {
                        // @ts-ignore
                        (window.adsbygoogle = window.adsbygoogle || []).push({});
                        isAdPushed.current = true;
                        console.log('[AdSense] Ad pushed successfully');
                    } catch (err) {
                        console.error('[AdSense] Push error:', err);
                    }
                }
            }, 100);

            return () => {
                clearTimeout(timer);
            };
        } catch (err) {
            console.error('[AdSense] Setup error:', err);
        }
    }, []);

    // 개발 환경에서 광고 비활성화 옵션
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DISABLE_ADS === 'true') {
        return (
            <div className={`pixel-adsense-wrapper ${className} flex justify-center w-full overflow-hidden`}>
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded p-8 text-center text-gray-500 text-sm">
                    [AdSense 광고 영역 - 개발 모드]
                </div>
            </div>
        );
    }

    return (
        <div className={`pixel-adsense-wrapper ${className} flex justify-center w-full overflow-hidden`}>
            {/* Google AdSense Script */}
            <Script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1164366157890050"
                crossOrigin="anonymous"
                strategy="afterInteractive"
            />
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
