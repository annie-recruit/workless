'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import MemoryInput from '@/components/MemoryInput';
import MemoryView from '@/components/MemoryView';
import QueryPanel from '@/components/QueryPanel';
import InsightsPanel from '@/components/InsightsPanel';
import GroupManager from '@/components/GroupManager';
import MemoryListPanel from '@/components/MemoryListPanel';
import PersonaSelector from '@/components/PersonaSelector';
import GlobalSearch from '@/components/GlobalSearch';
import PixelIcon from '@/components/PixelIcon';
import ProcessingLoader from '@/components/ProcessingLoader';
import { useLocalSync } from '@/hooks/useLocalSync';
import { dataLayer } from '@/lib/dataLayer';
import { Memory, CanvasBlock } from '@/types';

export default function Home() {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id || session?.user?.email || '';
  
  // 동기화 및 마이그레이션 관리
  useLocalSync(userId);

  const router = useRouter();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]); // Page level blocks state
  const [showModal, setShowModal] = useState<'groups' | 'query' | 'timeline' | 'memory_manager' | null>(null);
  const [loading, setLoading] = useState(true); // 기본값을 true로 설정하여 세션 확인 후 데이터 로딩까지 유지
  const [showInsights, setShowInsights] = useState(false); // 인사이트 패널 토글 (기본: 숨김)
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const contentMaxWidth = showInsights ? 'calc(100vw - 360px)' : '100%';
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 로컬 우선 데이터 로드
      const [localMemories, localBlocks] = await Promise.all([
        dataLayer.getMemories(userId),
        dataLayer.getBlocks(userId),
      ]);

      const sortedMemories = localMemories.sort((a: Memory, b: Memory) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setMemories(sortedMemories);
      setBlocks(localBlocks);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status]);

  // 로그인하지 않은 경우 NextAuth 로그인 페이지로 리디렉션
  useEffect(() => {
    if (status === 'unauthenticated' && !session) {
      // 잠깐의 로딩 상태를 무시하고 실제 비인증 상태일 때만 리디렉션
      const timer = setTimeout(() => {
        if (status === 'unauthenticated' && typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          router.push('/auth/signin');
        }
      }, 500); // 500ms 유예 시간을 주어 모바일에서의 깜빡임 대응
      return () => clearTimeout(timer);
    }
  }, [status, session, router]);

  // 전역 단축키: / 로 검색 오버레이 열기, ESC로 닫기
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const el = target instanceof HTMLElement ? target : null;
      if (!el) return false;
      if (el.closest('input, textarea, select')) return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isSearchOpen) return;
        if (isEditableTarget(e.target)) return;

        e.preventDefault();
        lastActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setIsSearchOpen(true);
        return;
      }

      if (e.key === 'Escape' && isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSearchOpen]);

  // 검색 오버레이 닫힐 때: 마지막 포커스 복원
  useEffect(() => {
    if (isSearchOpen) return;
    const el = lastActiveElementRef.current;
    if (!el) return;

    lastActiveElementRef.current = null;
    setTimeout(() => {
      if (document.contains(el)) el.focus?.();
    }, 0);
  }, [isSearchOpen]);

  const handleMemoryCreated = async (newMemory?: Memory) => {
    if (newMemory) {
      setMemories(prev => {
        if (prev.some(m => m.id === newMemory.id)) return prev;
        const updated = [newMemory, ...prev];
        return updated.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }
    await fetchDashboardData(true);
  };

  const handleManualDeleteMemory = async (id: string) => {
    if (!confirm('기억을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/memories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMemories(prev => prev.filter(m => m.id !== id));
      } else {
        alert('삭제 실패');
      }
    } catch {
      alert('삭제 중 오류 발생');
    }
  };

  const handleManualDeleteBlock = async (id: string) => {
    if (!confirm('위젯을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/board/blocks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBlocks(prev => prev.filter(b => b.id !== id));
      } else {
        alert('삭제 실패');
      }
    } catch {
      alert('삭제 중 오류 발생');
    }
  };

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <ProcessingLoader size={32} variant="overlay" tone="indigo" label="워크스페이스 로딩 중..." />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <ProcessingLoader size={32} variant="overlay" tone="indigo" label="로그인 페이지로 이동 중..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-indigo-50 flex relative">
      {/* 토글 버튼 */}
      <button
        onClick={() => setShowInsights(!showInsights)}
        className={`hidden md:block fixed top-1/2 -translate-y-1/2 bg-white border border-gray-200 hover:bg-gray-50 transition-all duration-300 shadow-lg z-50 ${showInsights ? 'right-[360px]' : 'right-0'
          }`}
        style={{
          padding: '12px 6px',
          borderRadius: showInsights ? '8px 0 0 8px' : '8px'
        }}
        title={showInsights ? "인사이트 숨기기" : "인사이트 보기"}
      >
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${showInsights ? 'rotate-0' : 'rotate-180'
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
        <header className="relative overflow-hidden bg-indigo-600 border-b-2 border-indigo-500 font-galmuri11">
          <div className="container mx-auto px-4 py-6 md:py-12">
            <div className="relative z-10">
              <h1 className="text-3xl md:text-6xl font-black text-white mb-3 tracking-tighter uppercase" style={{ letterSpacing: '-0.05em' }}>
                Workless
              </h1>
              <div className="flex items-center gap-3">
                <div className="h-0.5 w-8 md:w-12 bg-white"></div>
                <p className="text-white/90 text-xs md:text-base font-light">
                  사고의 흐름을 보는 비정형 워크스페이스
                </p>
              </div>
            </div>
          </div>
        </header>


        <div
          className="py-4 md:py-8 w-full font-galmuri11"
        >
          {/* 상단 메뉴바 */}
          <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-2 overflow-x-auto no-scrollbar flex-nowrap flex-row">
            <div className="flex items-center gap-2 md:gap-3 shrink-0 flex-nowrap flex-row">
              <button
                onClick={() => setShowModal('groups')}
                className="px-2 md:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-[10px] md:text-sm font-medium whitespace-nowrap"
              >
                그룹 관리
              </button>
              <button
                onClick={() => setShowModal('memory_manager')}
                className="px-2 md:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-[10px] md:text-sm font-medium flex items-center gap-1 whitespace-nowrap"
              >
                <PixelIcon name="list" size={14} />
                <span className="whitespace-nowrap">기억 관리</span>
              </button>
              <Link
                href="/settings/local-first"
                className="px-2 md:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-[10px] md:text-sm font-medium flex items-center gap-1 whitespace-nowrap"
              >
                <PixelIcon name="settings" size={14} />
                <span className="whitespace-nowrap">설정</span>
              </Link>
            </div>

            <div className="flex items-center gap-1 shrink-0 flex-nowrap flex-row">
              {session ? (
                <div className="flex items-center gap-1 md:gap-2 flex-nowrap flex-row">
                  <span className="px-1 md:px-2 text-gray-600 text-[10px] md:text-sm whitespace-nowrap max-w-[80px] md:max-w-none truncate">
                    {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="px-2 md:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-[10px] md:text-sm font-medium whitespace-nowrap"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="px-2 md:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-[10px] md:text-sm font-medium whitespace-nowrap"
                >
                  로그인
                </button>
              )}
            </div>
          </div>

          {/* 기록하기 영역 */}
          <div className="mb-8">
            <MemoryInput onMemoryCreated={handleMemoryCreated} />
            <GlobalSearch
              memories={memories}
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              onMemoryClick={(memory: Memory) => {
                const element = document.getElementById(`memory-${memory.id}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  element.style.transition = 'box-shadow 0.3s';
                  element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.3)';
                  setTimeout(() => {
                    element.style.boxShadow = '';
                  }, 2000);
                }
              }}
            />
          </div>

          {/* 보관함 영역 */}
          <div className="font-galmuri11">
            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <ProcessingLoader variant="panel" tone="indigo" label="불러오는 중..." />
              </div>
            ) : (
              <MemoryView
                memories={memories}
                onMemoryDeleted={() => {
                  fetchDashboardData(true);
                }}
                personaId={selectedPersonaId}
              />
            )}
          </div>
        </div>
      </div>

      {/* 사이드 패널 (인사이트) */}
      <div
        className={`bg-white border-l border-gray-200 shadow-lg overflow-y-auto transition-all duration-300 ease-in-out hidden md:block ${showInsights ? 'w-[360px]' : 'w-0'
          }`}
      >
        {showInsights && (
          <InsightsPanel
            personaId={selectedPersonaId}
            onPersonaChange={setSelectedPersonaId}
          />
        )}
      </div>

      {/* 기억 관리 패널 */}
      {
        showModal === 'memory_manager' && (
          <MemoryListPanel
            memories={memories}
            blocks={blocks}
            onClose={() => setShowModal(null)}
            onDeleteMemory={handleManualDeleteMemory}
            onDeleteBlock={handleManualDeleteBlock}
          />
        )
      }

      {/* 그룹 관리 모달 */}
      {
        showModal === 'groups' && (
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
                <GroupManager onGroupsChanged={() => fetchDashboardData(true)} personaId={selectedPersonaId} />
              </div>
            </div>
          </div>
        )
      }

      {/* 물어보기 모달 */}
      {
        showModal === 'query' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-orange-200 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b-2 border-orange-300 flex items-center justify-between bg-gradient-to-r from-orange-50 to-indigo-50">
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
        )
      }

      {/* 타임라인은 별도 페이지로 */}
    </main >
  );
}
