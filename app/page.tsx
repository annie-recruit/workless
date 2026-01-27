'use client';

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PixelGradientBanner from '@/components/PixelGradientBanner';
import OnboardingWhiteboard from '@/components/OnboardingWhiteboard';
import PixelIcon from '@/components/PixelIcon';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 로그인한 사용자는 대시보드로 리디렉션
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/dashboard');
      return;
    }
  }, [status, session, router]);

  // 로딩 중이거나 이미 로그인한 경우 로딩 화면 표시
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-6xl font-black text-white mb-3 tracking-tighter uppercase" style={{ letterSpacing: '-0.05em' }}>
                Workless
              </h1>
              <div className="flex items-center justify-center gap-4">
                <div className="h-0.5 w-12 bg-white"></div>
                <p className="text-white/90 text-base font-light">
                  사고의 흐름을 보는 비정형 워크스페이스
                </p>
                <div className="h-0.5 w-12 bg-white"></div>
              </div>
            </div>

            <p className="text-white/80 text-sm tracking-wide">
              맥락을 구체화. 비정형 애자일 워크스페이스
            </p>
          </div>

          {/* CTA 버튼 */}
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/auth/signin"
              className="group relative w-full max-w-md flex items-center justify-center gap-4 px-8 py-5 bg-white/10 hover:bg-white/20 border border-white/30 transition-all duration-300 backdrop-blur-sm"
            >
              {/* 버튼 내부 장식 */}
              <div className="absolute inset-0 border border-white/0 group-hover:border-white/40 transition-all duration-300"></div>

              <div className="bg-white p-2 rounded-sm group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <span className="text-white text-lg font-bold tracking-wider">
                시작하기
              </span>
            </Link>
            <p className="text-white/70 text-xs">
              시작하면 <Link href="/terms" className="underline hover:text-white">서비스 약관</Link> 및 <Link href="/privacy" className="underline hover:text-white">개인정보처리방침</Link>에 동의하게 됩니다
            </p>
          </div>

          {/* 3개 박스: 가로 배치 */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* 연동 서비스 */}
            <div className="space-y-3 bg-white/5 backdrop-blur-sm border border-white/20 p-5">
              <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                <PixelIcon name="link" size={20} className="text-orange-400" />
                <span>연동 가능한 서비스</span>
              </h3>
              <div className="space-y-2 text-white/80 text-xs">
                <div className="flex items-start gap-2">
                  <PixelIcon name="file" size={16} className="text-white/70 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Gmail</div>
                    <div className="text-white/60">"Workless" 라벨 이메일 자동 캔버스화</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <PixelIcon name="settings" size={16} className="text-white/70 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">AI 어시스턴트</div>
                    <div className="text-white/60">메모 연관성 분석 및 인사이트</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 핵심 기능 */}
            <div className="space-y-3 bg-white/5 backdrop-blur-sm border border-white/20 p-5">
              <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                <PixelIcon name="apps" size={20} className="text-indigo-400" />
                <span>핵심 기능</span>
              </h3>
              <div className="space-y-2 text-white/80 text-xs">
                <div className="flex items-start gap-2">
                  <PixelIcon name="apps" size={16} className="text-white/70 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">무한 캔버스</div>
                    <div className="text-white/60">끝없는 2D 공간에서 자유롭게 사고</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <PixelIcon name="tag" size={16} className="text-white/70 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">비정형 구조</div>
                    <div className="text-white/60">폴더 없이 태그와 맥락으로 연결</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <PixelIcon name="tag" size={16} className="text-white/70 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">맥락 시각화</div>
                    <div className="text-white/60">태깅으로 관계 자동 분석</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 유저 가치 */}
            <div className="space-y-3 bg-gradient-to-br from-orange-500/20 to-indigo-500/20 backdrop-blur-sm border border-white/30 p-5">
              <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                <PixelIcon name="star" size={20} className="text-yellow-300" />
                <span>제공하는 가치</span>
              </h3>
              <div className="space-y-2 text-white/90 text-xs leading-relaxed">
                <p>
                  <span className="font-bold text-orange-300">틀에 박힌 워크플로우는 이제 그만.</span> 
                  <br/>당신의 사고방식대로 자유롭게
                </p>
                <p>
                  <span className="font-bold text-indigo-300">흩어진 정보를 하나로.</span>
                  <br/>공간적 맥락과 태그로 연결
                </p>
                <p>
                  <span className="font-bold text-pink-300">아이디어를 시각화.</span>
                  <br/>생각의 흐름이 보이면 일이 쉬워짐
                </p>
              </div>
            </div>
          </div>

          {/* Google 심사 필수: 데이터 사용 명시 */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/30 p-4 text-xs text-white/80 leading-relaxed">
            <p className="mb-2">
              <strong className="text-white">📧 Gmail 데이터 사용:</strong> "Workless" 라벨이 지정된 이메일만 <strong>읽기 전용</strong>으로 접근하며, 
              이메일을 메모로 변환하는 데만 사용됩니다. 이메일을 보내거나 수정하지 않습니다.
            </p>
            <p>
              <strong className="text-white">🔒 개인정보 보호:</strong> 수집된 데이터는 서비스 제공 목적으로만 사용되며 제3자에게 판매하지 않습니다.
            </p>
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
            <a href="mailto:support@workless.app" className="hover:text-white transition-colors underline">
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

      {/* 하단: 온보딩 미니보드 (전체 너비) */}
      <div className="relative z-10 flex items-center justify-center p-8">
        <div className="w-full max-w-6xl h-[600px] bg-white/95 backdrop-blur-sm rounded-lg overflow-hidden shadow-2xl border-[3px] border-gray-800">
          {/* 온보딩 헤더 */}
          <div className="bg-white px-6 py-4 border-b-[3px] border-gray-800">
            <h2 className="text-xl font-bold mb-1 text-gray-900">애자일 워크스페이스를 체험해보세요!</h2>
            <p className="text-sm text-gray-700">
              로그인 없이 미리 체험해보세요! 드래그하여 자유롭게 배치할 수 있습니다.
            </p>
          </div>

          {/* 미니 화이트보드 */}
          <div className="h-[calc(100%-80px)]">
            <OnboardingWhiteboard />
          </div>
        </div>
      </div>
    </main>
  );
}
