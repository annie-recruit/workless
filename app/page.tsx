'use client';

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PixelIcon from "@/components/PixelIcon";

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-indigo-50">
      {/* 헤더 */}
      <header className="bg-indigo-600 border-b-2 border-indigo-500">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase" style={{ letterSpacing: '-0.05em' }}>
                Workless
              </h1>
              <p className="text-white/90 text-sm font-light">
                사고의 흐름을 보는 비정형 워크스페이스
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/privacy"
                  className="text-white hover:text-white/80 text-sm font-medium underline transition-colors"
                  title="개인정보처리방침"
                >
                  개인정보처리방침
                </Link>
                <span className="text-white/60">|</span>
                <Link
                  href="/terms"
                  className="text-white hover:text-white/80 text-sm font-medium underline transition-colors"
                  title="서비스 약관"
                >
                  서비스 약관
                </Link>
              </div>
              <Link
                href="/auth/signin"
                className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition-colors shadow-lg"
              >
                시작하기
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-16">
        {/* 히어로 섹션 */}
        <section className="text-center mb-20">
          <h2 className="text-5xl font-black text-gray-900 mb-6">
            Gmail을 메모로, 아이디어를 시각화로
          </h2>
          <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Workless는 Gmail 연동을 통해 이메일을 자동으로 메모로 변환하고, 
            무한 캔버스에서 아이디어를 자유롭게 배치하고 연결할 수 있는 개인 비서입니다.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/auth/signin"
              className="inline-block px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg text-lg"
            >
              Google 계정으로 시작하기
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>시작하기 전에</span>
              <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800 font-semibold underline">
                개인정보처리방침
              </Link>
              <span>및</span>
              <Link href="/terms" className="text-indigo-600 hover:text-indigo-800 font-semibold underline">
                서비스 약관
              </Link>
              <span>을 확인하세요.</span>
            </div>
          </div>
        </section>

        {/* 주요 기능 */}
        <section className="mb-20">
          <h3 className="text-3xl font-bold text-gray-900 mb-12 text-center">주요 기능</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-gray-200">
              <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <PixelIcon name="file" size={32} className="text-indigo-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Gmail 자동 연동</h4>
              <p className="text-gray-700">
                Gmail에서 받은 이메일을 자동으로 메모로 변환합니다. 
                "Workless" 라벨이 지정된 이메일만 읽어서 개인 비서로 활용할 수 있습니다.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-gray-200">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <PixelIcon name="apps" size={32} className="text-purple-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">무한 캔버스</h4>
              <p className="text-gray-700">
                메모와 아이디어를 무한 캔버스에 자유롭게 배치하고, 
                태깅(@) 기능으로 서로 연결하여 생각의 흐름을 시각화합니다.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-gray-200">
              <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <PixelIcon name="lightbulb" size={32} className="text-orange-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">AI 기반 분석</h4>
              <p className="text-gray-700">
                AI가 이메일과 메모를 분석하여 관련된 내용을 자동으로 연결하고, 
                프로젝트와 목표를 제안합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 데이터 사용 목적 */}
        <section className="mb-20 bg-white p-12 rounded-lg shadow-lg border-2 border-gray-200">
          <h3 className="text-3xl font-bold text-gray-900 mb-8">데이터 사용 목적</h3>
          <div className="space-y-6 text-gray-700">
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">1. Google 계정 정보</h4>
              <p>
                Google OAuth를 통해 이메일, 이름, 프로필 사진을 수집합니다. 
                이 정보는 사용자 인증 및 계정 관리 목적으로만 사용됩니다.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">2. Gmail 데이터 (선택적)</h4>
              <p>
                사용자가 Gmail 연동을 선택한 경우에만, "Workless" 라벨이 지정된 이메일의 
                <strong> 읽기 전용</strong> 권한을 요청합니다. 이메일을 읽어서 메모로 변환하는 데만 사용되며, 
                이메일을 보내거나 수정하지 않습니다.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">3. 사용자 생성 콘텐츠</h4>
              <p>
                사용자가 생성한 메모, 프로젝트, 목표 등은 서비스 제공 및 개선 목적으로만 사용됩니다.
              </p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
              <p className="text-sm">
                <strong>중요:</strong> Workless는 사용자의 데이터를 제3자에게 판매하지 않으며, 
                서비스 제공 목적으로만 사용합니다. 자세한 내용은{" "}
                <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800 font-semibold underline">
                  개인정보처리방침
                </Link>
                을 참고하세요.
              </p>
            </div>
          </div>
        </section>

        {/* CTA 섹션 */}
        <section className="text-center bg-indigo-600 rounded-lg p-12 text-white">
          <h3 className="text-3xl font-bold mb-4">지금 시작하세요</h3>
          <p className="text-lg mb-8 text-white/90">
            Google 계정으로 로그인하여 Workless를 무료로 체험해보세요
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-8 py-4 bg-white text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition-colors shadow-lg text-lg"
          >
            시작하기
          </Link>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-gray-300 py-8 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm">© 2026 Workless. All rights reserved.</p>
            </div>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm hover:text-white transition-colors">
                개인정보처리방침
              </Link>
              <Link href="/terms" className="text-sm hover:text-white transition-colors">
                서비스 약관
              </Link>
              <a href="mailto:support@workless.app" className="text-sm hover:text-white transition-colors">
                문의하기
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
