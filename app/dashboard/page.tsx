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
import Tutorial, { TutorialStep } from '@/components/Tutorial';
import GlobalSearch from '@/components/GlobalSearch';
import PixelIcon from '@/components/PixelIcon';
import ProcessingLoader from '@/components/ProcessingLoader';
import { Memory, CanvasBlock } from '@/types';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]); // Page level blocks state
  const [showModal, setShowModal] = useState<'groups' | 'query' | 'timeline' | 'memory_manager' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false); // 인사이트 패널 토글 (기본: 숨김)
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialButtonSrc, setTutorialButtonSrc] = useState<string>('/assets/generated/tutorial_button.png');
  const [tutorialButtonTextSrc, setTutorialButtonTextSrc] = useState<string>('/assets/generated/tutorial_button_text.png');
  const contentMaxWidth = showInsights ? 'calc(100vw - 420px)' : 'calc(100vw - 40px)';
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const fetchMemories = async (silent = false) => {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  };

  const fetchBlocks = async () => {
    try {
      const res = await fetch('/api/board/blocks');
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks || []);
      }
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
    }
  };

  useEffect(() => {
    fetchMemories();
    fetchBlocks();
  }, []);

  // 튜토리얼 버튼 스프라이트 로드 (generated asset)
  useEffect(() => {
    fetch('/assets/generated/manifest.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((manifest) => {
        const bg = manifest?.tutorial_button_bg || manifest?.tutorial_button;
        const text = manifest?.tutorial_button_text;

        if (typeof bg === 'string' && bg.length > 0) setTutorialButtonSrc(bg);
        if (typeof text === 'string' && text.length > 0) setTutorialButtonTextSrc(text);
      })
      .catch(() => {
        // 실패 시 기본 경로 사용
      });
  }, []);

  // 최초 로그인 시 튜토리얼 자동 시작
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const tutorialCompleted = localStorage.getItem('workless.tutorial.completed');
      const isFirstLogin = !tutorialCompleted;

      if (isFirstLogin) {
        // 페이지 로드 완료 대기 (메모리 로드 및 렌더링 완료 대기)
        const timer = setTimeout(() => {
          setShowTutorial(true);
        }, 2000); // 2초로 증가 (렌더링 완료 대기)

        return () => clearTimeout(timer);
      }
    }
  }, [status, session]);

  // 로그인하지 않은 경우 NextAuth 로그인 페이지로 리디렉션 (중복 로그인 화면 방지)
  // ⚠️ 중요: 모든 useEffect는 early return 전에 호출되어야 함
  useEffect(() => {
    if (status === 'unauthenticated' && !session) {
      // 무한 루프 방지: /auth 경로가 아닐 때만 리디렉션
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
    // 메모리 생성 후 즉시 로컬 상태에 추가하여 사용자에게 즉각적인 피드백 제공
    if (newMemory) {
      setMemories(prev => {
        // 중복 방지 (이미 fetch로 가져왔을 수 있음)
        if (prev.some(m => m.id === newMemory.id)) return prev;
        const updated = [newMemory, ...prev];
        return updated.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }
    // 전체 메모리를 백업으로 다시 가져옴 (사일런트 모드)
    await fetchMemories(true);
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

  // 로그인하지 않은 경우 로그인 화면 표시
  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <ProcessingLoader size={32} variant="overlay" tone="indigo" label="로딩 중..." />
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
      {/* 토글 버튼 - 항상 보임 */}
      <button
        onClick={() => setShowInsights(!showInsights)}
        className={`fixed top-1/2 -translate-y-1/2 bg-white border border-gray-200 hover:bg-gray-50 transition-all duration-300 shadow-lg z-50 ${showInsights ? 'right-[360px]' : 'right-0'
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
        {/* 헤더 배너 - 전체 폭 */}
        <header className="relative overflow-hidden bg-indigo-600 border-b-2 border-indigo-500 font-galmuri11">
          <div className="container mx-auto px-4 py-12">
            <div className="relative z-10">
              <h1 className="text-6xl font-black text-white mb-3 tracking-tighter uppercase" style={{ letterSpacing: '-0.05em' }}>
                Workless
              </h1>
              <div className="flex items-center gap-3">
                <div className="h-0.5 w-12 bg-white"></div>
                <p className="text-white/90 text-base font-light">
                  사고의 흐름을 보는 비정형 워크스페이스
                </p>
              </div>
            </div>
          </div>
        </header>

        <div
          className="mx-auto px-3 py-8 w-full font-galmuri11"
          style={{ maxWidth: contentMaxWidth }}
        >

          {/* 상단 메뉴바 */}
          <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-2">
            {/* 왼쪽: 그룹 관리 */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowModal('groups')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-sm font-medium"
                data-tutorial-target="group-manager"
              >
                그룹 관리
              </button>
              <button
                onClick={() => setShowModal('memory_manager')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1"
              >
                <PixelIcon name="list" size={16} />
                기억 관리
              </button>
              <button
                onClick={() => setShowTutorial(true)}
                className="relative inline-flex items-center justify-center p-0 bg-transparent border-0"
                style={{ width: 120, height: 32 }}
                title="튜토리얼 다시 보기"
              >
                <img
                  src={tutorialButtonSrc}
                  alt=""
                  className="pixel-icon absolute inset-0 w-full h-full select-none pointer-events-none"
                  draggable={false}
                />
                <img
                  src={tutorialButtonTextSrc}
                  alt="Tutorial"
                  className="pixel-icon absolute left-1/2 top-1/2 w-[88px] h-[20px] -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
                  draggable={false}
                />
              </button>
            </div>

            {/* 오른쪽: 사용자 정보 */}
            <div className="flex items-center gap-1">
              {session ? (
                <div className="flex items-center gap-2">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-6 h-6 rounded-full object-cover"
                      onError={(e) => {
                        // 이미지 로드 실패 시 숨김
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
            {/* 전역 검색 */}
            <GlobalSearch
              memories={memories}
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              onMemoryClick={(memory: Memory) => {
                // 메모리 카드로 스크롤
                const element = document.getElementById(`memory-${memory.id}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // 하이라이트 효과
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
          <div data-tutorial-target="board-view" className="font-galmuri11">
            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <ProcessingLoader variant="panel" tone="indigo" label="불러오는 중..." />
              </div>
            ) : (
              <MemoryView
                memories={memories}
                onMemoryDeleted={() => {
                  fetchMemories(true);
                  fetchBlocks();
                }}
                personaId={selectedPersonaId}
              />
            )}
          </div>
        </div>
      </div>

      {/* 사이드 패널 (인사이트) - 토글 가능 */}
      <div
        className={`bg-white border-l border-gray-200 shadow-lg overflow-y-auto transition-all duration-300 ease-in-out ${showInsights ? 'w-[360px]' : 'w-0'
          }`}
      >
        {showInsights && (
          <InsightsPanel
            personaId={selectedPersonaId}
            onPersonaChange={setSelectedPersonaId}
          />
        )}
      </div>

      {/* 기억 관리 패널 (토스트 스타일, Non-blocking) */}
      {showModal === 'memory_manager' && (
        <MemoryListPanel
          memories={memories}
          blocks={blocks}
          onClose={() => setShowModal(null)}
          onDeleteMemory={handleManualDeleteMemory}
          onDeleteBlock={handleManualDeleteBlock}
        />
      )}

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
      )}

      {/* 튜토리얼 */}
      {showTutorial && (
        <Tutorial
          steps={[
            {
              id: 'memory-input',
              title: '기억 기록하기',
              description: '여기서 일상의 기억, 아이디어, 할 일 등을 기록하세요. 제목과 내용을 입력하고 파일도 첨부할 수 있습니다.',
              targetSelector: 'form[data-tutorial-target="memory-input"]',
              position: 'bottom',
            },
            {
              id: 'persona-selector',
              title: '페르소나 선택',
              description: '오른쪽 패널의 페르소나를 선택하면 AI가 그 스타일로 응답합니다. 예를 들어 "친구" 페르소나는 친근하게, "선생님" 페르소나는 전문적으로 답변합니다.',
              targetSelector: 'button[data-tutorial-target="persona-selector"]',
              position: 'left',
            },
            {
              id: 'group-manager',
              title: '그룹 관리',
              description: '비슷한 기억들을 그룹으로 묶어서 관리할 수 있습니다. AI가 자동으로 묶어주거나 직접 만들 수도 있어요.',
              targetSelector: '[data-tutorial-target="group-manager"]',
              position: 'bottom',
            },
            {
              id: 'board-view',
              title: '보드 뷰',
              description: '기억들을 보드에서 드래그해서 자유롭게 배치할 수 있습니다. 연결된 기억들은 선으로 표시됩니다.',
              targetSelector: '[data-tutorial-target="board-view"]',
              position: 'bottom',
            },
            {
              id: 'link-memories',
              title: '기억 연결하기',
              description: '기억들을 연결해서 관계를 만들 수 있습니다. 각 카드에서 연결 버튼(📎 아이콘)을 눌러 관련된 기억들을 묶어보세요.',
              targetSelector: 'button[data-tutorial-link-button="true"]',
              position: 'bottom',
            },
          ]}
          onComplete={() => {
            setShowTutorial(false);
            localStorage.setItem('workless.tutorial.completed', 'true');
          }}
          onSkip={() => {
            setShowTutorial(false);
            localStorage.setItem('workless.tutorial.completed', 'true');
          }}
        />
      )}

      {/* 타임라인은 별도 페이지로 */}
    </main>
  );
}
