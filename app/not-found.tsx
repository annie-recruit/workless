import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center font-galmuri11 bg-white">
      <h1 className="text-6xl font-black text-gray-900 mb-4">404</h1>
      <p className="text-gray-600 mb-8 text-sm">페이지를 찾을 수 없습니다</p>
      <Link
        href="/"
        className="px-6 py-3 bg-indigo-600 text-white font-bold text-sm border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] transition-all"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
