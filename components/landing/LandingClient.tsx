'use client';

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PixelGradientBanner from '@/components/PixelGradientBanner';
import PixelIcon from '@/components/PixelIcon';
import PixelKakaoAdFit from '@/components/PixelKakaoAdFit';
import PixelAdSense from '@/components/PixelAdSense';
import OnboardingMiniBoard from '@/components/OnboardingMiniBoard';
import { useLanguage } from '@/components/LanguageContext';
import PixelLanguageToggle from '@/components/PixelLanguageToggle';

export default function LandingClient() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isAgreed, setIsAgreed] = useState(false);
    const { t, language } = useLanguage();

    // JSON-LD 구조화된 데이터
    const websiteJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'WORKLESS',
        url: 'https://workless.me',
        potentialAction: {
            '@type': 'SearchAction',
            target: 'https://workless.me/search?q={search_term_string}',
            'query-input': 'required name=search_term_string',
        },
    };

    const softwareJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'WORKLESS',
        applicationCategory: 'ProductivityApplication',
        operatingSystem: 'Web',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'KRW',
        },
        description: '무한 캔버스 화이트보드에서 메모하고 브레인스토밍하는 AI 협업 도구. 아이디어 정리와 지식 관리를 한 곳에서.',
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '150',
        },
    };

    // 로그인한 사용자는 대시보드로 리디렉션
    useEffect(() => {
        if (status === 'authenticated' && session) {
            const timer = setTimeout(() => {
                router.replace('/dashboard');
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [status, session, router]);

    // JSON-LD 스크립트를 head에 추가 (Hydration 에러 방지)
    useEffect(() => {
        const websiteScript = document.createElement('script');
        websiteScript.type = 'application/ld+json';
        websiteScript.text = JSON.stringify(websiteJsonLd);
        document.head.appendChild(websiteScript);

        const softwareScript = document.createElement('script');
        softwareScript.type = 'application/ld+json';
        softwareScript.text = JSON.stringify(softwareJsonLd);
        document.head.appendChild(softwareScript);

        return () => {
            document.head.removeChild(websiteScript);
            document.head.removeChild(softwareScript);
        };
    }, []);

    // 로그인한 사용자는 리디렉션 중이므로 아무것도 표시하지 않음
    if (status === 'authenticated' && session) {
        return null;
    }

    return (
        <main className="min-h-screen flex flex-col relative overflow-hidden font-galmuri11 bg-indigo-950">

            {/* 상단: 타이틀 + 버튼 + 3개 박스 */}
            <div className="relative z-10 flex items-center justify-center p-8">
                <div className="max-w-6xl w-full space-y-8 py-8">
                    {/* 언어 토글 추가 */}
                    <div className="flex justify-end items-center gap-4 mb-4">
                        <Link 
                            href="/features"
                            className="px-3 py-1 bg-white border-2 border-gray-800 text-gray-900 font-bold text-[10px] hover:bg-gray-50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]"
                        >
                            About
                        </Link>
                        <PixelLanguageToggle />
                    </div>

                    {/* 타이틀 */}
                    <div className="text-center space-y-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-6xl font-black text-white mb-3 tracking-tighter" style={{ letterSpacing: '-0.05em', WebkitTextStroke: '2px black', textShadow: '4px 4px 0px rgba(0,0,0,0.3)' }}>
                                {t('landing.title')}
                            </h1>
                            <div className="flex items-center justify-center gap-4">
                                <div className="h-0.5 w-12 bg-white"></div>
                                <p className="text-white/90 text-sm md:text-base font-light">
                                    {t('landing.subtitle')}
                                </p>
                                <div className="h-0.5 w-12 bg-white"></div>
                            </div>
                        </div>
                    </div>

                    {/* 메인 콘텐츠: 앱 목적 + 미니 보드 (통합 예정) */}
                    <section className="flex flex-col items-center justify-center mt-8 w-full" aria-label="서비스 소개">
                        {/* 앱 목적 설명 (보드 배경으로 확장) */}
                        <article
                            className="relative bg-white border-2 border-gray-800 p-4 md:p-8 w-full max-w-5xl min-h-[400px] md:min-h-[500px] flex flex-col justify-center items-center text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-all hover:scale-[1.01] overflow-hidden"
                            style={{ backgroundColor: '#ffffff' }}
                        >
                            {/* 픽셀 코너 포인트 */}
                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800 z-20" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800 z-20" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800 z-20" />
                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800 z-20" />

                            {/* 온보딩 미니 보드 (오버레이) */}
                            <div className="absolute inset-0 z-10 w-full h-full">
                                <OnboardingMiniBoard
                                    showLines={false}
                                    initialPositions={{
                                        card1: { x: 20, y: 20 },
                                        card2: { x: 200, y: 20 },
                                        action: { x: 20, y: 250 },
                                        card3: { x: 200, y: 290 },
                                        viewer: { x: 420, y: 60 },
                                        calendar: { x: 450, y: 240 },
                                    }}
                                />
                            </div>

                            {/* 텍스트 콘텐츠 */}
                            <div className="relative z-0 flex flex-col items-center pointer-events-none select-none w-full px-6">
                                <h2 className="text-gray-900 font-bold text-2xl md:text-3xl mb-10">{t('landing.mainText')}</h2>

                                {/* 4개 기능 박스 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl">
                                    {/* AI와 서비스 연동 */}
                                    <div className="bg-indigo-50 p-4 space-y-2 pointer-events-auto shadow-md">
                                        <h3 className="text-gray-900 font-bold text-sm mb-3 flex items-center gap-1">
                                            <PixelIcon name="zap" size={16} className="text-indigo-500" ariaLabel={t('landing.feature1.title')} />
                                            {t('landing.feature1.title')}
                                        </h3>
                                        <div className="space-y-3 text-xs text-gray-700">
                                            <div>
                                                <div className="font-bold text-gray-900 mb-1">{t('landing.feature1.gmail.title')}</div>
                                                <div className="text-gray-600 leading-relaxed">{t('landing.feature1.gmail.desc')}</div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 mb-1">{t('landing.feature1.ai.title')}</div>
                                                <div className="text-gray-600 leading-relaxed">{t('landing.feature1.ai.desc')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 핵심 기능 */}
                                    <div className="bg-indigo-50 p-4 space-y-2 pointer-events-auto shadow-md">
                                        <h3 className="text-gray-900 font-bold text-sm mb-3 flex items-center gap-1">
                                            <PixelIcon name="apps" size={16} className="text-purple-500" ariaLabel={t('landing.feature2.title')} />
                                            {t('landing.feature2.title')}
                                        </h3>
                                        <div className="space-y-3 text-xs text-gray-700">
                                            <div>
                                                <div className="font-bold text-gray-900 mb-1">{t('landing.feature2.canvas.title')}</div>
                                                <div className="text-gray-600 leading-relaxed">{t('landing.feature2.canvas.desc')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI 어시스턴트 - 페르소나 설정 */}
                                    <div className="bg-indigo-50 p-4 space-y-2 pointer-events-auto shadow-md">
                                        <h3 className="text-gray-900 font-bold text-sm mb-3 flex items-center gap-1">
                                            <PixelIcon name="user" size={16} className="text-pink-500" ariaLabel={t('landing.feature3.title')} />
                                            {t('landing.feature3.title')}
                                        </h3>
                                        <div className="space-y-3 text-xs text-gray-700">
                                            <div className="text-gray-600 leading-relaxed">
                                                {t('landing.feature3.desc')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 여러가지 위젯 & 맥락 시각화 */}
                                    <div className="bg-indigo-50 p-4 space-y-2 pointer-events-auto shadow-md">
                                        <h3 className="text-gray-900 font-bold text-sm mb-3 flex items-center gap-1">
                                            <PixelIcon name="settings" size={16} className="text-orange-500" ariaLabel={t('landing.feature4.title')} />
                                            {t('landing.feature4.title')}
                                        </h3>
                                        <div className="space-y-3 text-xs text-gray-700">
                                            <div>
                                                <div className="font-bold text-gray-900 mb-1">{t('landing.feature4.widgets.title')}</div>
                                                <div className="text-gray-600 leading-relaxed">{t('landing.feature4.widgets.desc')}</div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 mb-1">{t('landing.feature4.viz.title')}</div>
                                                <div className="text-gray-600 leading-relaxed">{t('landing.feature4.viz.desc')}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </article>
                    </section>

                    {/* CTA 버튼 */}
                    <div className="flex flex-col items-center gap-4">
                        <button
                            onClick={() => {
                                if (isAgreed) {
                                    localStorage.setItem('terms_agreed', 'true');
                                    router.push('/auth/signin');
                                }
                            }}
                            disabled={!isAgreed}
                            className={`group relative w-full max-w-md flex items-center justify-center gap-4 px-8 py-5 border-2 border-gray-800 transition-all duration-300
                ${isAgreed
                                    ? "bg-white hover:bg-gray-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] hover:scale-105 cursor-pointer"
                                    : "bg-gray-200 text-gray-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] cursor-not-allowed"
                                }`}
                        >
                            {/* 픽셀 코너 포인트 */}
                            <div className={`absolute -top-1 -left-1 w-2 h-2 ${isAgreed ? "bg-gray-800" : "bg-gray-400"}`} />
                            <div className={`absolute -top-1 -right-1 w-2 h-2 ${isAgreed ? "bg-gray-800" : "bg-gray-400"}`} />
                            <div className={`absolute -bottom-1 -left-1 w-2 h-2 ${isAgreed ? "bg-gray-800" : "bg-gray-400"}`} />
                            <div className={`absolute -bottom-1 -right-1 w-2 h-2 ${isAgreed ? "bg-gray-800" : "bg-gray-400"}`} />

                            <span className={`text-lg font-bold tracking-wider ${isAgreed ? "text-gray-900" : "text-gray-400"}`}>
                                {t('landing.start')}
                            </span>
                        </button>

                        {/* 동의 체크박스 */}
                        <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded backdrop-blur-sm">
                            <input
                                type="checkbox"
                                id="terms-agreement"
                                checked={isAgreed}
                                onChange={(e) => setIsAgreed(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                            />
                            <label htmlFor="terms-agreement" className="text-white/90 text-xs cursor-pointer select-none">
                                <Link href="/terms" className="underline font-bold hover:text-white" onClick={(e) => e.stopPropagation()}>{t('landing.terms')}</Link>
                                {language === 'ko' ? ' 및 ' : ' and '}
                                <Link href="/privacy" className="underline font-bold hover:text-white" onClick={(e) => e.stopPropagation()}>{t('landing.privacy')}</Link>
                                {language === 'ko' ? '에 동의합니다' : '. I agree.'}
                            </label>
                        </div>
                    </div>

                    {/* 광고 영역 */}
                    <div className="max-w-4xl mx-auto space-y-8 my-8">
                        <PixelAdSense
                            className=""
                        />
                        <PixelKakaoAdFit />
                    </div>
                </div>
            </div>
        </main>
    );
}
