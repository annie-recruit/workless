'use client';

import Link from "next/link";
import Image from "next/image";
import PixelIcon from '@/components/PixelIcon';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden" style={{ fontFamily: 'Galmuri11, monospace' }}>
      {/* 픽셀 도트 배경 */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle, #00ff00 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />

      {/* 그리드 오버레이 */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(#00ffff 1px, transparent 1px), linear-gradient(90deg, #00ffff 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* 헤더 */}
      <header className="relative bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 border-b-4 border-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold text-white mb-2 tracking-tight uppercase pixel-text" style={{
                textShadow: '4px 4px 0px rgba(0,0,0,0.5), 2px 2px 0px rgba(255,255,255,0.3)'
              }}>
                WORKLESS
              </h1>
              <p className="text-white text-lg font-bold tracking-wide">
                맥락을 구체화. 비정형 애자일 워크스페이스
              </p>
            </div>
            <Link
              href="/auth/signin"
              className="px-8 py-4 bg-yellow-400 text-black font-bold border-4 border-black hover:bg-yellow-300 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] uppercase"
            >
              ▶ START
            </Link>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-20 relative">
        {/* 히어로 섹션 */}
        <section className="text-center mb-32">
          <div className="mb-8 inline-block px-6 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 border-4 border-white">
            <span className="text-white text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <PixelIcon name="apps" size={16} className="text-white" />
              <span>New Generation Workspace</span>
            </span>
          </div>

          <h2 className="text-6xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-8 leading-tight" style={{
            textShadow: '0 0 30px rgba(0,255,255,0.5)'
          }}>
            사고의 흐름을<br />
            픽셀로 그리다
          </h2>

          <p className="text-xl md:text-2xl text-cyan-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            틀에 박힌 워크플로우는 이제 그만.<br />
            무한 캔버스 위에서 아이디어를 자유롭게 배치하고,<br />
            맥락으로 연결하여 당신만의 비정형 워크스페이스를 만드세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/signin"
              className="px-10 py-5 bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-bold text-xl border-4 border-white hover:from-cyan-300 hover:to-purple-400 transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] hover:translate-x-[3px] hover:translate-y-[3px] uppercase"
            >
              ▶ 지금 시작하기
            </Link>
            <div className="text-pink-400 text-sm font-bold flex items-center gap-1.5">
              <PixelIcon name="zap" size={14} className="text-pink-400" />
              <span>무료로 체험하기</span>
            </div>
          </div>
        </section>

        {/* 핵심 컨셉 */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4 uppercase" style={{
              textShadow: '3px 3px 0px rgba(255,0,255,0.5)'
            }}>
              ◈ Core Concept ◈
            </h3>
            <div className="w-32 h-1 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* 무한 캔버스 */}
            <div className="bg-gradient-to-br from-cyan-900/50 to-purple-900/50 backdrop-blur-sm p-8 border-4 border-cyan-400 relative group hover:border-pink-400 transition-all hover:scale-105">
              <div className="absolute top-0 right-0 w-8 h-8 bg-cyan-400 border-2 border-white"></div>
              <div className="w-20 h-20 bg-cyan-400 border-4 border-white flex items-center justify-center mb-6 mx-auto relative">
                <Image
                  src="/assets/icons/pixel_flag.png"
                  alt="Canvas"
                  width={48}
                  height={48}
                  className="pixelated"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 animate-pulse"></div>
              </div>
              <h4 className="text-2xl font-bold text-cyan-300 mb-4 text-center uppercase">
                ∞ 무한 캔버스
              </h4>
              <p className="text-gray-300 leading-relaxed">
                끝없는 2D 공간에서 자유롭게 사고하세요.
                메모, 이미지, 링크를 원하는 곳에 배치하고
                공간적 맥락으로 정보를 구조화합니다.
              </p>
            </div>

            {/* 비정형 구조 */}
            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm p-8 border-4 border-purple-400 relative group hover:border-cyan-400 transition-all hover:scale-105">
              <div className="absolute top-0 right-0 w-8 h-8 bg-purple-400 border-2 border-white"></div>
              <div className="w-20 h-20 bg-purple-400 border-4 border-white flex items-center justify-center mb-6 mx-auto relative">
                <Image
                  src="/assets/icons/bundle.png"
                  alt="Agile"
                  width={48}
                  height={48}
                  className="pixelated"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 animate-pulse"></div>
              </div>
              <h4 className="text-2xl font-bold text-purple-300 mb-4 text-center uppercase">
                ◇ 비정형 애자일
              </h4>
              <p className="text-gray-300 leading-relaxed">
                폴더나 계층 구조 없이, 당신의 사고방식대로.
                태그와 연결로 맥락을 만들고,
                프로젝트를 유연하게 진화시킵니다.
              </p>
            </div>

            {/* 맥락 연결 */}
            <div className="bg-gradient-to-br from-pink-900/50 to-yellow-900/50 backdrop-blur-sm p-8 border-4 border-pink-400 relative group hover:border-yellow-400 transition-all hover:scale-105">
              <div className="absolute top-0 right-0 w-8 h-8 bg-pink-400 border-2 border-white"></div>
              <div className="w-20 h-20 bg-pink-400 border-4 border-white flex items-center justify-center mb-6 mx-auto relative">
                <Image
                  src="/assets/icons/check.png"
                  alt="Context"
                  width={48}
                  height={48}
                  className="pixelated"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 animate-pulse"></div>
              </div>
              <h4 className="text-2xl font-bold text-pink-300 mb-4 text-center uppercase">
                ⚡ 맥락 시각화
              </h4>
              <p className="text-gray-300 leading-relaxed">
                @ 태깅으로 연결하면 AI가 관계를 분석하고
                시각화합니다. 흩어진 생각들이
                하나의 큰 그림으로 완성됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* 부가 기능 */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4 uppercase" style={{
              textShadow: '3px 3px 0px rgba(0,255,255,0.5)'
            }}>
              + Extra Features
            </h3>
            <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 backdrop-blur-sm p-8 border-4 border-yellow-400">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-yellow-400 border-4 border-white flex items-center justify-center flex-shrink-0">
                  <PixelIcon name="email" size={32} className="text-gray-900" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-yellow-300 mb-3 uppercase">Gmail 연동</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    "Workless" 라벨이 붙은 이메일을 자동으로 캔버스에 가져옵니다.
                    외부 정보를 워크스페이스로 손쉽게 통합하세요.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/30 to-cyan-900/30 backdrop-blur-sm p-8 border-4 border-green-400">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-green-400 border-4 border-white flex items-center justify-center flex-shrink-0">
                  <PixelIcon name="user" size={32} className="text-gray-900" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-green-300 mb-3 uppercase">AI 어시스턴트</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    AI가 메모 간의 연관성을 분석하고,
                    새로운 인사이트와 다음 액션을 제안합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 데이터 투명성 */}
        <section className="mb-32 bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm p-12 border-4 border-purple-400 relative">
          <div className="absolute top-4 right-4 w-4 h-4 bg-cyan-400 animate-pulse"></div>
          <div className="absolute bottom-4 left-4 w-4 h-4 bg-pink-400 animate-pulse"></div>

          <h3 className="text-3xl font-bold text-white mb-8 uppercase text-center flex items-center justify-center gap-3" style={{
            textShadow: '2px 2px 0px rgba(255,0,255,0.5)'
          }}>
            <PixelIcon name="lock" size={28} className="text-white" />
            <span>데이터 투명성</span>
          </h3>

          <div className="space-y-6 text-gray-300 max-w-4xl mx-auto">
            <div className="bg-black/40 p-6 border-2 border-cyan-400">
              <h4 className="text-xl font-bold text-cyan-300 mb-3 flex items-center gap-2">
                <span className="text-2xl">▸</span> Google 계정 정보
              </h4>
              <p className="leading-relaxed">
                Google OAuth를 통해 이메일, 이름, 프로필 사진을 수집합니다.
                이 정보는 사용자 인증 및 계정 관리 목적으로만 사용됩니다.
              </p>
            </div>

            <div className="bg-black/40 p-6 border-2 border-purple-400">
              <h4 className="text-xl font-bold text-purple-300 mb-3 flex items-center gap-2">
                <span className="text-2xl">▸</span> Gmail 데이터 (선택적)
              </h4>
              <p className="leading-relaxed">
                사용자가 Gmail 연동을 선택한 경우에만, "Workless" 라벨이 지정된 이메일의
                <strong className="text-yellow-400"> 읽기 전용</strong> 권한을 요청합니다.
                이메일을 보내거나 수정하지 않습니다.
              </p>
            </div>

            <div className="bg-black/40 p-6 border-2 border-pink-400">
              <h4 className="text-xl font-bold text-pink-300 mb-3 flex items-center gap-2">
                <span className="text-2xl">▸</span> 사용자 생성 콘텐츠
              </h4>
              <p className="leading-relaxed">
                사용자가 생성한 메모, 프로젝트, 목표 등은 서비스 제공 및 개선 목적으로만 사용됩니다.
              </p>
            </div>

            <div className="bg-gradient-to-r from-yellow-400/20 to-pink-400/20 p-6 border-4 border-yellow-400">
              <p className="text-sm leading-relaxed">
                <strong className="text-yellow-300 text-lg flex items-center gap-2">
                  <PixelIcon name="alert" size={18} className="text-yellow-300" />
                  <span>중요:</span>
                </strong><br />
                Workless는 사용자의 데이터를 제3자에게 판매하지 않으며,
                서비스 제공 목적으로만 사용합니다. 자세한 내용은{" "}
                <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 font-bold underline">
                  개인정보처리방침
                </Link>
                을 참고하세요.
              </p>
            </div>
          </div>
        </section>

        {/* CTA 섹션 */}
        <section className="text-center mb-20">
          <div className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 p-1 border-4 border-white inline-block">
            <div className="bg-black px-16 py-12">
              <h3 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 uppercase" style={{
                textShadow: '0 0 30px rgba(0,255,255,0.5)'
              }}>
                Ready to Start?
              </h3>
              <p className="text-xl text-gray-300 mb-8">
                당신의 사고방식을 픽셀로 표현하세요
              </p>
              <Link
                href="/auth/signin"
                className="inline-block px-12 py-6 bg-gradient-to-r from-yellow-400 to-pink-400 text-black font-bold text-xl border-4 border-white hover:from-yellow-300 hover:to-pink-300 transition-all shadow-[8px_8px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] hover:translate-x-[4px] hover:translate-y-[4px] uppercase"
              >
                ▶▶ 무료로 시작하기 ◀◀
              </Link>
              <div className="mt-6 text-cyan-400 text-sm font-bold animate-pulse flex items-center justify-center gap-2">
                <PixelIcon name="zap" size={14} className="text-cyan-400" />
                <span>Google 계정으로 간편 로그인</span>
                <PixelIcon name="zap" size={14} className="text-cyan-400" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="relative bg-gradient-to-r from-purple-900 via-blue-900 to-purple-900 border-t-4 border-cyan-400 py-8 mt-20">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 10px)',
        }} />
        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-gray-400 text-sm font-bold">
                © 2026 WORKLESS. ALL RIGHTS RESERVED.
              </p>
            </div>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors font-bold border-b-2 border-transparent hover:border-cyan-400"
              >
                개인정보처리방침
              </Link>
              <Link
                href="/terms"
                className="text-purple-400 text-sm hover:text-purple-300 transition-colors font-bold border-b-2 border-transparent hover:border-purple-400"
              >
                서비스 약관
              </Link>
              <a
                href="mailto:support@workless.app"
                className="text-pink-400 text-sm hover:text-pink-300 transition-colors font-bold border-b-2 border-transparent hover:border-pink-400"
              >
                문의하기
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .pixelated {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
}
