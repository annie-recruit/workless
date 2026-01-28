'use client';

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PixelGradientBanner from '@/components/PixelGradientBanner';
import PixelIcon from '@/components/PixelIcon';
import PixelAdSense from '@/components/PixelAdSense';
import OnboardingMiniBoard from '@/components/OnboardingMiniBoard';

export default function LandingPage() {
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
                  맥락을 구체화. 비정형 애자일 워크스페이스
                </p>
                <div className="h-0.5 w-12 bg-white"></div>
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠: 앱 목적 + 미니 보드 */}
          <section className="flex flex-col xl:flex-row items-center justify-center gap-4 xl:gap-12 mt-8" aria-label="서비스 소개">
            {/* 앱 목적 설명 */}
            <article className="relative bg-white border-2 border-gray-800 p-8 w-full max-w-xl h-auto xl:h-[500px] flex flex-col justify-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-all hover:scale-[1.02]">
              {/* 픽셀 코너 포인트 */}
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

              <h2 className="text-gray-900 font-bold text-xl mb-8 text-center xl:text-left">애플리케이션 목적</h2>
              <p className="text-gray-800 text-base leading-loose">
                <strong className="text-gray-900">WORKLESS</strong>는 비정형 사고를 위한 무한 캔버스 워크스페이스입니다.
                <br /><br />
                기록하는 모든 것이 의미가 되고, 의미가 있는 모든 것들은 기록이 됩니다.
                <br /><br />
                혼자서 고민하지 마세요! AI 어시스턴트는 언제든지 당신의 아이디어를 빠르게 실행할 수있도록 도와 드릴 것입니다.
                <br /><br />
                지금 바로 모든 생각 조각들을 연결하고 그룹화 하여 시각화 해보세요.
              </p>
            </article>

            {/* 온보딩 미니 보드 */}
            <div className="flex-shrink-0 transform scale-[0.5] sm:scale-75 md:scale-90 xl:scale-100 transition-transform origin-center -my-24 sm:-my-12 xl:my-0">
              <OnboardingMiniBoard />
            </div>
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

          {/* 3개 박스: 가로 배치 */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* 연동 서비스 */}
            <div className="relative space-y-3 bg-white border-2 border-gray-800 p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-all hover:scale-105">
              {/* 픽셀 코너 포인트 */}
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

              <h3 className="text-gray-900 font-bold text-base mb-2">
                서비스 연동과 AI를 통해 액션 아이템 도출
              </h3>
              <div className="space-y-2 text-gray-700 text-xs">
                <div className="flex items-start gap-2">
                  <PixelIcon name="file" size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">Gmail</div>
                    <div className="text-gray-600">&quot;Workless&quot; 라벨 이메일 자동 캔버스화</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <PixelIcon name="settings" size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">AI 어시스턴트</div>
                    <div className="text-gray-600">메모 연관성 분석 및 인사이트</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 핵심 기능 */}
            <div className="relative space-y-3 bg-white border-2 border-gray-800 p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-all hover:scale-105">
              {/* 픽셀 코너 포인트 */}
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

              <h3 className="text-gray-900 font-bold text-base mb-2 flex items-center gap-2">
                <PixelIcon name="apps" size={20} className="text-indigo-500" />
                <span>핵심 기능</span>
              </h3>
              <div className="space-y-2 text-gray-700 text-xs">
                <div className="flex items-start gap-2">
                  <PixelIcon name="apps" size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">무한 캔버스</div>
                    <div className="text-gray-600">끝없는 2D 공간에서 자유롭게 사고</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <PixelIcon name="tag" size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">비정형 구조</div>
                    <div className="text-gray-600">제약없이 자유롭게 콘텐츠 배열</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <PixelIcon name="tag" size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">맥락 시각화</div>
                    <div className="text-gray-600">태깅으로 관계 자동 분석</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 유저 가치 */}
            <div className="relative space-y-3 bg-white border-2 border-gray-800 p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-all hover:scale-105">
              {/* 픽셀 코너 포인트 */}
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

              <h3 className="text-gray-900 font-bold text-base mb-2 flex items-center gap-2">
                <PixelIcon name="star" size={20} className="text-yellow-500" />
                <span>경험하길 바라는 가치</span>
              </h3>
              <div className="space-y-2 text-gray-800 text-xs leading-relaxed">
                <p>
                  <span className="font-bold text-orange-600">답답했던 생각 조각을 구체화</span>
                  <br />당신의 사고방식대로 자유롭게
                </p>
                <p>
                  <span className="font-bold text-indigo-600">흩어진 정보를 하나로.</span>
                  <br />공간적 맥락과 태그로 연결
                </p>
                <p>
                  <span className="font-bold text-pink-600">아이디어를 시각화.</span>
                  <br />생각의 흐름이 보이면 일이 쉬워짐
                </p>
              </div>
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
                <strong className="text-gray-900">Gmail 데이터 사용:</strong> "WORKLESS" 라벨이 지정된 이메일만 <strong>읽기 전용</strong>으로 접근하며,
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
          <div className="max-w-4xl mx-auto">
            <PixelAdSense
              borderColor="purple"
              className="my-8"
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

          {/* 하단 데코레이션 */}
          <div className="flex justify-center gap-2 opacity-30">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-white rounded-none"></div>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 데코레이션 */}
      <div className="flex justify-center gap-2 opacity-30 mt-8 mb-12">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-2 h-2 bg-white rounded-none"></div>
        ))}
      </div>
    </main>
  );
}
