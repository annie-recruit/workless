'use client';

import { useState, useEffect } from 'react';
import MemoryInput from '@/components/MemoryInput';
import MemoryView from '@/components/MemoryView';
import QueryPanel from '@/components/QueryPanel';
import InsightsPanel from '@/components/InsightsPanel';
import GroupManager from '@/components/GroupManager';
import { Memory } from '@/types';

export default function Home() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [clusters, setClusters] = useState<Map<string, Memory[]>>(new Map());
  const [showModal, setShowModal] = useState<'groups' | 'query' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(true); // 인사이트 패널 토글

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memories');
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories);

        // 맥락별 묶음 생성
        const clusterMap = new Map<string, Memory[]>();
        data.memories.forEach((memory: Memory) => {
          const tag = memory.clusterTag || '미분류';
          if (!clusterMap.has(tag)) {
            clusterMap.set(tag, []);
          }
          clusterMap.get(tag)!.push(memory);
        });
        setClusters(clusterMap);
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex relative">
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

        <div className="container mx-auto px-4 py-8 max-w-5xl">

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
                clusters={clusters} 
                onMemoryDeleted={fetchMemories}
                onOpenGroups={() => setShowModal('groups')}
                onOpenQuery={() => setShowModal('query')}
              />
            )}
          </div>
        </div>
      </div>

      {/* 사이드 패널 (인사이트) - 토글 가능 */}
      <div 
        className={`relative bg-white border-l border-gray-200 shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
          showInsights ? 'w-96' : 'w-0'
        }`}
      >
        {/* 토글 버튼 - 사이드 패널 왼쪽 */}
        <button
          onClick={() => setShowInsights(!showInsights)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white border border-gray-200 hover:bg-gray-50 transition-all duration-200 shadow-lg ${
            showInsights ? 'rounded-l-lg' : 'rounded-lg -translate-x-4'
          }`}
          style={{ padding: '12px 6px' }}
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
        
        {showInsights && <InsightsPanel />}
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
              <GroupManager onGroupsChanged={fetchMemories} />
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
              <QueryPanel />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
