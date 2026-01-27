'use client';

import { signIn } from 'next-auth/react';
import PixelGradientBanner from '@/components/PixelGradientBanner';
import OnboardingWhiteboard from '@/components/OnboardingWhiteboard';

export default function SignInPage() {
  return (
    <main className="min-h-screen flex relative overflow-hidden font-galmuri11">
      {/* 픽셀 그라데이션 배경 */}
      <div className="absolute inset-0 z-0">
        <PixelGradientBanner className="opacity-100" />
        {/* 오버레이로 색감 조절 */}
        <div className="absolute inset-0 bg-indigo-900/10 backdrop-blur-[2px]"></div>
      </div>

      {/* 왼쪽: 로그인 폼 */}
      <div className="relative z-10 w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-12">
          <div className="text-center space-y-6">
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
              구글 계정으로 로그인하여 시작하세요
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="group relative w-full max-w-sm flex items-center justify-center gap-4 px-8 py-5 bg-white/10 hover:bg-white/20 border border-white/30 transition-all duration-300 backdrop-blur-sm"
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
                Google로 로그인
              </span>
            </button>
          </div>

          {/* 하단 데코레이션 */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 opacity-30">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-white rounded-none"></div>
            ))}
          </div>
        </div>
      </div>

      {/* 오른쪽: 온보딩 가이드 (미니 화이트보드) */}
      <div className="relative z-10 w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl h-[500px] bg-white/95 backdrop-blur-sm rounded-lg overflow-hidden shadow-2xl border-[3px] border-gray-800">
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
