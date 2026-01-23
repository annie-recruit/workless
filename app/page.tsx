'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import MemoryInput from '@/components/MemoryInput';
import MemoryView from '@/components/MemoryView';
import QueryPanel from '@/components/QueryPanel';
import InsightsPanel from '@/components/InsightsPanel';
import GroupManager from '@/components/GroupManager';
import PersonaSelector from '@/components/PersonaSelector';
import Tutorial, { TutorialStep } from '@/components/Tutorial';
import GlobalSearch from '@/components/GlobalSearch';
import { Memory } from '@/types';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showModal, setShowModal] = useState<'groups' | 'query' | 'timeline' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(true); // 인사이트 패널 토글
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
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

  const handleMemoryCreated = async () => {
    // 메모리 생성 후 즉시 새로고침 (필요한 경우에만)
    // 전체 메모리를 다시 가져오는 대신, 최신 메모리만 추가하는 방식으로 최적화 가능
    await fetchMemories();
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">로그인 페이지로 이동 중...</p>
        </div>
      </main>
    );
  }

  return (
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-indigo-50 flex relative">
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
                data-tutorial-target="persona-selector"
              />
              <button
                onClick={() => setShowModal('groups')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-sm font-medium"
                data-tutorial-target="group-manager"
              >
                그룹 관리
              </button>
              <button
                onClick={() => setShowTutorial(true)}
                className="px-4 py-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 transition-colors text-sm font-medium flex items-center gap-1 border border-indigo-200"
                title="튜토리얼 다시 보기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                튜토리얼
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
          <div data-tutorial-target="board-view">
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
          <div className="bg-white border-2 border-orange-200 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
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
              description: '페르소나를 선택하면 AI가 그 스타일로 응답합니다. 예를 들어 "친구" 페르소나는 친근하게, "선생님" 페르소나는 전문적으로 답변합니다.',
              targetSelector: 'button[data-tutorial-target="persona-selector"]',
              position: 'bottom',
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
