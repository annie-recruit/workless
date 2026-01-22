'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import MemoryInput from '@/components/MemoryInput';
import MemoryView from '@/components/MemoryView';
import QueryPanel from '@/components/QueryPanel';
import InsightsPanel from '@/components/InsightsPanel';
import GroupManager from '@/components/GroupManager';
import PersonaSelector from '@/components/PersonaSelector';
import { Memory } from '@/types';

export default function Home() {
  const { data: session, status } = useSession();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showModal, setShowModal] = useState<'groups' | 'query' | 'timeline' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(true); // 인사이트 패널 토글
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const contentMaxWidth = showInsights ? 'calc(100vw - 420px)' : 'calc(100vw - 40px)';

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memories');
      if (res.ok) {
        const data = await res.json();
        // 시간순 정렬 (최신순)
        const sortedMemories = data.memories.sort((a: Memory, b: Memory) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setMemories(sortedMemories);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleMemoryCreated = () => {
    fetchMemories();
  };

  // 로그인하지 않은 경우 로그인 화면 표시
  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-5xl font-black text-gray-900 mb-3 tracking-tighter uppercase" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', letterSpacing: '-0.05em' }}>
              Workless
            </h1>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px w-12 bg-gradient-to-r from-blue-400 to-purple-400"></div>
              <p className="text-slate-600 text-base font-light">
                알아서 정리해주는 개인 비서
              </p>
              <div className="h-px w-12 bg-gradient-to-r from-purple-400 to-blue-400"></div>
            </div>
            <p className="text-gray-600 mb-8">
              구글 계정으로 로그인하여 시작하세요
            </p>
          </div>
          <div>
            <button
              onClick={() => signIn('google')}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors shadow-sm font-medium"
            >
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
              <span className="text-gray-700">Google로 로그인</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex relative">
      {/* 토글 버튼 - 항상 보임 */}
      <button
        onClick={() => setShowInsights(!showInsights)}
        className={`fixed top-1/2 -translate-y-1/2 bg-white border border-gray-200 hover:bg-gray-50 transition-all duration-300 shadow-lg z-50 ${
          showInsights ? 'right-[360px]' : 'right-0'
        }`}
        style={{ 
          padding: '12px 6px',
          borderRadius: showInsights ? '8px 0 0 8px' : '8px'
        }}
        title={showInsights ? "인사이트 숨기기" : "인사이트 보기"}
      >
        <svg 
          className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${
            showInsights ? 'rotate-0' : 'rotate-180'
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        {/* 헤더 배너 - 전체 폭 */}
        <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50">
          <div className="container mx-auto px-4 py-12">
            <div className="relative z-10">
              <h1 className="text-6xl font-black text-white mb-3 tracking-tighter uppercase" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', letterSpacing: '-0.05em' }}>
                Workless
              </h1>
              <div className="flex items-center gap-3">
                <div className="h-px w-12 bg-gradient-to-r from-blue-400 to-purple-400"></div>
                <p className="text-slate-300 text-base font-light">
                  알아서 정리해주는 개인 비서
                </p>
              </div>
            </div>
            {/* 미니멀 장식 요소 */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
          </div>
        </header>

        <div
          className="mx-auto px-3 py-8 w-full"
          style={{ maxWidth: contentMaxWidth }}
        >

          {/* 상단 메뉴바 */}
          <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-2">
            {/* 왼쪽: 페르소나 선택기와 그룹 관리 */}
            <div className="flex items-center gap-3">
              <PersonaSelector
                selectedPersonaId={selectedPersonaId}
                onPersonaChange={setSelectedPersonaId}
              />
              <button
                onClick={() => setShowModal('groups')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                그룹 관리
              </button>
            </div>

            {/* 오른쪽: 사용자 정보 */}
            <div className="flex items-center gap-1">
              {session ? (
                <div className="flex items-center gap-2">
                  {session.user?.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="px-2 text-gray-600 text-sm">
                    {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  로그인
                </button>
              )}
            </div>
          </div>

          {/* 기록하기 영역 */}
          <div className="mb-8">
            <MemoryInput onMemoryCreated={handleMemoryCreated} />
          </div>

          {/* 보관함 영역 */}
          <div>
            {loading ? (
              <div className="text-center py-12 text-gray-400">
                불러오는 중...
              </div>
            ) : (
              <MemoryView 
                memories={memories} 
                onMemoryDeleted={fetchMemories}
                personaId={selectedPersonaId}
              />
            )}
          </div>
        </div>
      </div>

      {/* 사이드 패널 (인사이트) - 토글 가능 */}
      <div 
        className={`bg-white border-l border-gray-200 shadow-lg overflow-y-auto transition-all duration-300 ease-in-out ${
          showInsights ? 'w-[360px]' : 'w-0'
        }`}
      >
        {showInsights && <InsightsPanel personaId={selectedPersonaId} />}
      </div>

      {/* 그룹 관리 모달 */}
      {showModal === 'groups' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50">
              <h2 className="text-2xl font-bold text-gray-800">그룹 관리</h2>
              <button
                onClick={() => setShowModal(null)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <GroupManager onGroupsChanged={fetchMemories} personaId={selectedPersonaId} />
            </div>
          </div>
        </div>
      )}

      {/* 물어보기 모달 */}
      {showModal === 'query' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50">
              <h2 className="text-2xl font-bold text-gray-800">물어보기</h2>
              <button
                onClick={() => setShowModal(null)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <QueryPanel personaId={selectedPersonaId} />
            </div>
          </div>
        </div>
      )}

      {/* 타임라인은 별도 페이지로 */}
    </main>
  );
}
