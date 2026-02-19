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
import PixelLanguageToggle from '@/components/PixelLanguageToggle';
import { Memory, CanvasBlock } from '@/types';

export default function Home() {
  const { data: session, status } = useSession();
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
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [memoriesRes, blocksRes] = await Promise.all([
        fetch('/api/memories'),
        fetch('/api/board/blocks')
      ]);

      if (memoriesRes.ok) {
        const data = await memoriesRes.json();
        const sortedMemories = data.memories.sort((a: Memory, b: Memory) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setMemories(sortedMemories);
      }

      if (blocksRes.ok) {
        const data = await blocksRes.json();
        setBlocks(data.blocks || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false); // 무조건 false로 설정
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
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        router.push('/auth/signin');
      }
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
        <ProcessingLoader size={32} variant="overlay" tone="graphite" label="워크스페이스 로딩 중..." />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <ProcessingLoader size={32} variant="overlay" tone="graphite" label="로그인 페이지로 이동 중..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-indigo-50 flex relative">
      {/* 언어 토글 + About 버튼 (고정 위치) */}
      <div className="fixed top-4 right-4 z-[100] flex items-center gap-3 scale-90 md:scale-100">
        <Link
          href="/features"
          className="px-3 py-1 bg-white border-2 border-gray-800 text-gray-900 font-bold text-[10px] hover:bg-gray-50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]"
        >
          About
        </Link>
        <PixelLanguageToggle />
      </div>

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
          <div className="container mx-auto px-4 py-12">
            <div className="relative z-10">
              <h1 className="text-4xl md:text-6xl font-black text-white mb-3 tracking-tighter uppercase" style={{ letterSpacing: '-0.05em' }}>
                Workless
              </h1>
              <div className="flex items-center gap-3">
                <div className="h-0.5 w-12 bg-white"></div>
                <p className="text-white/90 text-sm md:text-base font-light">
                  사고의 흐름을 보는 비정형 워크스페이스
                </p>
              </div>
            </div>
          </div>
        </header>


        <div
          className="py-8 w-full font-galmuri11"
        >
          {/* 상단 메뉴바 */}
          <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowModal('groups')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-xs md:text-sm font-medium"
              >
                그룹 관리
              </button>
              <button
                onClick={() => setShowModal('memory_manager')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-xs md:text-sm font-medium flex items-center gap-1"
              >
                <PixelIcon name="list" size={16} />
                기억 관리
              </button>
              <Link
                href="/settings/local-first"
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-xs md:text-sm font-medium flex items-center gap-1"
              >
                <PixelIcon name="settings" size={16} />
                설정
              </Link>
            </div>

            <div className="flex items-center gap-1">
              {session ? (
                <div className="flex items-center gap-2">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-6 h-6 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-xs text-gray-600">
                        {(session.user?.name || session.user?.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="px-2 text-gray-600 text-xs md:text-sm">
                    {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-xs md:text-sm font-medium"
                  >
                    로그아웃
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('정말로 계정을 탈퇴하시겠습니까? 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.')) {
                        try {
                          const res = await fetch('/api/user/delete', { method: 'DELETE' });
                          if (res.ok) {
                            alert('그동안 이용해주셔서 감사합니다. 계정이 삭제되었습니다.');
                            signOut({ callbackUrl: '/' });
                          } else {
                            alert('계정 삭제 중 오류가 발생했습니다.');
                          }
                        } catch (error) {
                          alert('계정 삭제 처리 중 오류가 발생했습니다.');
                        }
                      }
                    }}
                    className="px-4 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors text-xs md:text-sm font-medium"
                  >
                    계정 탈퇴
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-xs md:text-sm font-medium"
                >
                  로그인
                </button>
              )}
            </div>
          </div>

          {/* 전역 검색 */}
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

          {/* 보관함 영역 */}
          <div className="font-galmuri11">
            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <ProcessingLoader variant="panel" tone="graphite" label="불러오는 중..." />
              </div>
            ) : (
              <MemoryView
                key={groupRefreshKey}
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

      {/* 페르소나 플로팅 버튼 */}
      <div className="fixed bottom-24 right-6 z-[150] md:bottom-8">
        <PersonaSelector
          selectedPersonaId={selectedPersonaId}
          onPersonaChange={setSelectedPersonaId}
          variant="fab"
        />
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

      {/* 그룹 관리 토스트 */}
      {
        showModal === 'groups' && (
          <div className="fixed bottom-6 right-6 z-[9000] animate-slide-up font-galmuri11">
            <div className="w-[400px] h-[500px] bg-white border-3 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative">
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900 z-20" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900 z-20" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900 z-20" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900 z-20" />
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-indigo-50 border-b-3 border-gray-900">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <PixelIcon name="folder" size={20} className="text-indigo-500" />
                  그룹 관리
                </h3>
                <button
                  onClick={() => setShowModal(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <PixelIcon name="close" size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <GroupManager onGroupsChanged={() => {
                  fetchDashboardData(true);
                  setGroupRefreshKey(prev => prev + 1);
                }} personaId={selectedPersonaId} />
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
