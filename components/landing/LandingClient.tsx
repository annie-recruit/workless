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

export default function LandingClient() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isAgreed, setIsAgreed] = useState(false);

    // 로그인한 사용자는 대시보드로 리디렉션
    useEffect(() => {
        if (status === 'authenticated' && session) {
            router.replace('/dashboard');
            return;
        }
    }, [status, session, router]);

    // 로그인한 사용자는 리디렉션 중이므로 아무것도 표시하지 않음
    if (status === 'authenticated' && session) {
        return null;
    }

    return (
        <main className="min-h-screen flex flex-col relative overflow-hidden font-galmuri11">
            {/* 픽셀 그라데이션 배경 */}
            <div className="absolute inset-0 z-0">
                <PixelGradientBanner className="opacity-100" />
                {/* 오버레이로 색감 조절 */}
                <div className="absolute inset-0 bg-indigo-900/10 backdrop-blur-[2px]"></div>
            </div>

            {/* 상단: 타이틀 + 버튼 + 3개 박스 */}
            <div className="relative z-10 flex items-center justify-center p-8">
                <div className="max-w-6xl w-full space-y-8 py-8">
                    {/* 타이틀 */}
                    <div className="text-center space-y-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-6xl font-black text-white mb-3 tracking-tighter" style={{ letterSpacing: '-0.05em', WebkitTextStroke: '2px black', textShadow: '4px 4px 0px rgba(0,0,0,0.3)' }}>
                                WORKLESS
                            </h1>
                            <div className="flex items-center justify-center gap-4">
                                <div className="h-0.5 w-12 bg-white"></div>
                                <p className="text-white/90 text-sm md:text-base font-light">
                                    비정형 애자일 워크스페이스
                                </p>
                                <div className="h-0.5 w-12 bg-white"></div>
                            </div>
                        </div>
                    </div>

                    {/* 메인 콘텐츠: 앱 목적 + 미니 보드 (통합 예정) */}
                    <section className="flex flex-col items-center justify-center mt-8 w-full" aria-label="서비스 소개">
                        {/* 앱 목적 설명 (보드 배경으로 확장) */}
                        <article
                            className="relative bg-white border-2 border-gray-800 p-8 w-full max-w-5xl min-h-[500px] flex flex-col justify-center items-center text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-all hover:scale-[1.01] overflow-hidden"
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
                                        card1: { x: 30, y: 30 },
                                        card2: { x: 250, y: 30 },
                                        action: { x: 30, y: 330 },
                                        card3: { x: 250, y: 380 },
                                        viewer: { x: 700, y: 80 },
                                        calendar: { x: 750, y: 300 },
                                    }}
                                />
                            </div>

                            {/* 텍스트 콘텐츠 */}
                            <div className="relative z-0 flex flex-col items-center pointer-events-none select-none w-full px-6">
                                <h2 className="text-gray-900 font-bold text-2xl md:text-3xl mb-10">당신의 액션을 위하여!</h2>

                                {/* 4개 기능 박스 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl">
                                    {/* AI와 서비스 연동 */}
                                    <div className="bg-indigo-50 p-4 space-y-2 pointer-events-auto shadow-md">
                                        <h3 className="text-gray-900 font-bold text-sm mb-3 flex items-center gap-1">
                                            <PixelIcon name="zap" size={16} className="text-indigo-500" ariaLabel="AI 서비스 연동" />
                                            AI와 서비스 연동
                                        </h3>
                                        <div className="space-y-3 text-xs text-gray-700">
                                            <div>
                                                <div className="font-bold text-gray-900 mb-1">Gmail 연동</div>
                                                <div className="text-gray-600 leading-relaxed">&quot;Workless&quot; 라벨 이메일을 자동으로 메모 카드화하여 기록</div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 mb-1">AI 어시스턴트</div>
                                                <div className="text-gray-600 leading-relaxed">기록한 내용의 맥락을 이해하고 인사이트, 액션아이템 제안, 연관 정보 자동 연결</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 핵심 기능 */}
                                    <div className="bg-indigo-50 p-4 space-y-2 pointer-events-auto shadow-md">
                                        <h3 className="text-gray-900 font-bold text-sm mb-3 flex items-center gap-1">
                                            <PixelIcon name="apps" size={16} className="text-purple-500" ariaLabel="핵심 기능" />
                                            핵심 기능
                                        </h3>
                                        <div className="space-y-3 text-xs text-gray-700">
                                            <div>
                                                <div className="font-bold text-gray-900 mb-1">무한 캔버스 화이트보드</div>
                                                <div className="text-gray-600 leading-relaxed">끝없는 2D 공간에서 자유롭게 아이디어를 메모하고, 브레인스토밍하며, 체계적으로 정리할 수 있는 생산성 도구</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI 어시스턴트 - 페르소나 설정 */}
                                    <div className="bg-indigo-50 p-4 space-y-2 pointer-events-auto shadow-md">
                                        <h3 className="text-gray-900 font-bold text-sm mb-3 flex items-center gap-1">
                                            <PixelIcon name="user" size={16} className="text-pink-500" ariaLabel="AI 페르소나 설정" />
                                            AI 페르소나 커스터마이징
                                        </h3>
                                        <div className="space-y-3 text-xs text-gray-700">
                                            <div className="text-gray-600 leading-relaxed">
                                                업무 스타일에 맞는 AI 어시스턴트를 만들어보세요. 친근한 코치부터 전문적인 컨설턴트, 창의적인 파트너까지 - 당신만의 맞춤형 AI 협업 도구로 생산성을 극대화하세요.
                                            </div>
                                        </div>
                                    </div>

                                    {/* 여러가지 위젯 & 맥락 시각화 */}
                                    <div className="bg-indigo-50 p-4 space-y-2 pointer-events-auto shadow-md">
                                        <h3 className="text-gray-900 font-bold text-sm mb-3 flex items-center gap-1">
                                            <PixelIcon name="settings" size={16} className="text-orange-500" ariaLabel="위젯 및 시각화 기능" />
                                            위젯 & 시각화
                                        </h3>
                                        <div className="space-y-3 text-xs text-gray-700">
                                            <div>
                                                <div className="font-bold text-gray-900 mb-1">다양한 위젯 도구</div>
                                                <div className="text-gray-600 leading-relaxed">캘린더, 문서 뷰어, 할일 관리, 미니맵 등 실용적인 위젯으로 화이트보드를 업무용 협업 공간으로 확장</div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 mb-1">지식 맥락 시각화</div>
                                                <div className="text-gray-600 leading-relaxed">태그로 연결된 메모와 아이디어가 자동으로 그룹화되며, 공간적 배치를 통해 생각의 흐름과 연관 관계를 직관적으로 파악</div>
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
                                    sessionStorage.setItem('terms_agreed', 'true');
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
                                시작하기
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
                                <Link href="/terms" className="underline font-bold hover:text-white" onClick={(e) => e.stopPropagation()}>서비스 약관</Link>
                                {' 및 '}
                                <Link href="/privacy" className="underline font-bold hover:text-white" onClick={(e) => e.stopPropagation()}>개인정보처리방침</Link>
                                {'에 동의합니다'}
                            </label>
                        </div>
                    </div>



                    {/* Google 심사 필수: 데이터 사용 명시 */}
                    <div className="relative bg-white border-2 border-gray-800 p-4 text-xs text-gray-800 leading-relaxed shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-all hover:scale-[1.02]">
                        {/* 픽셀 코너 포인트 */}
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />
                        <p className="mb-2 flex items-start gap-2">
                            <PixelIcon name="email" size={16} className="text-gray-900 mt-0.5 flex-shrink-0" />
                            <span>
                                <strong className="text-gray-900">Gmail 데이터 사용:</strong> &quot;Workless&quot; 라벨이 지정된 이메일만 <strong>읽기 전용</strong>으로 접근하며,
                                이메일을 메모로 변환하는 데만 사용됩니다. 이메일을 보내거나 수정하지 않습니다.
                            </span>
                        </p>
                        <p className="flex items-start gap-2">
                            <PixelIcon name="lock" size={16} className="text-gray-900 mt-0.5 flex-shrink-0" />
                            <span>
                                <strong className="text-gray-900">개인정보 보호:</strong> 수집된 데이터는 서비스 제공 목적으로만 사용되며 제3자에게 판매하지 않습니다.
                            </span>
                        </p>
                    </div>

                    {/* 픽셀 스타일 광고 */}
                    <div className="max-w-4xl mx-auto space-y-8 my-8">
                        <PixelAdSense
                            borderColor="purple"
                            className=""
                        />
                        <PixelKakaoAdFit
                            borderColor="yellow"
                        />
                    </div>

                    {/* 하단 링크 */}
                    <div className="flex justify-center gap-4 text-xs text-white/60">
                        <Link href="/privacy" className="hover:text-white transition-colors underline">
                            개인정보처리방침
                        </Link>
                        <span>·</span>
                        <Link href="/terms" className="hover:text-white transition-colors underline">
                            서비스 약관
                        </Link>
                        <span>·</span>
                        <a href="mailto:rkdhs326@gmail.com" className="hover:text-white transition-colors underline">
                            문의하기
                        </a>
                    </div>
                </div>
            </div>

        </main>
    );
}
