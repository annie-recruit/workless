'use client';

import { useState } from 'react';
import { Memory } from '@/types';

interface LinkManagerProps {
  currentMemory: Memory;
  allMemories: Memory[];
  onClose: () => void;
  onLinked: (updatedMemory1: Memory, updatedMemory2: Memory) => void;
}

export default function LinkManager({ currentMemory, allMemories, onClose, onLinked }: LinkManagerProps) {
  const stripHtmlClient = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [linkNote, setLinkNote] = useState('');

  // 현재 기록과 이미 링크된 기록들은 제외
  const linkedIds = currentMemory.relatedMemoryIds || [];
  const availableMemories = allMemories.filter(m => 
    m.id !== currentMemory.id && 
    !linkedIds.includes(m.id) &&
    (searchQuery === '' || 
     stripHtmlClient(m.content).toLowerCase().includes(searchQuery.toLowerCase()) ||
     m.topic?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const [showSuccess, setShowSuccess] = useState(false);

  const handleLink = async () => {
    if (!selectedMemoryId) {
      alert('연결할 기록을 선택해주세요.');
      return;
    }

    setIsLinking(true);
    try {
      const res = await fetch('/api/memories/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryId1: currentMemory.id,
          memoryId2: selectedMemoryId,
          note: linkNote,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // 업데이트된 메모리 정보를 콜백으로 전달
        if (data.memory1 && data.memory2) {
          onLinked(data.memory1, data.memory2);
        }
        // 성공 토스트 표시
        setShowSuccess(true);
        // 2초 후 닫기
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
          // 상태 초기화
          setSelectedMemoryId(null);
          setLinkNote('');
          setSearchQuery('');
        }, 2000);
      } else {
        alert('링크 추가 실패');
      }
    } catch (error) {
      console.error('Failed to link memories:', error);
      alert('링크 추가 중 오류 발생');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <>
      {/* 성공 토스트 */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-green-500 text-white rounded-xl shadow-2xl p-4 min-w-[300px] border border-green-600">
            <div className="flex items-center gap-3">
              <div className="text-2xl">✅</div>
              <div>
                <p className="text-sm font-semibold">기록이 연결되었습니다!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 연결 추가 토스트 팝업 */}
      {!showSuccess && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col border border-gray-200">
            {/* 헤더 */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-xl">
              <h2 className="text-lg font-bold text-white">기록 연결하기</h2>
              <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3">
                {/* 현재 기록 표시 */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-600 font-medium mb-1">현재 기록</div>
                  {currentMemory.title && (
                    <p className="text-gray-900 text-xs font-semibold mb-1">{currentMemory.title}</p>
                  )}
                  <p className="text-gray-800 text-xs">{stripHtmlClient(currentMemory.content).substring(0, 80)}...</p>
                </div>

                {/* 검색 + 연결 메모 */}
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="연결할 기록 검색..."
                      className="w-full h-10 px-3 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={linkNote}
                      onChange={(e) => setLinkNote(e.target.value)}
                      placeholder="연결 메모 (선의 의미)"
                      className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 기록 목록 */}
              <div className="px-4 pb-4">
                {availableMemories.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 text-sm">
                    {searchQuery ? '검색 결과가 없습니다.' : '연결 가능한 기록이 없습니다.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableMemories.map(memory => (
                      <button
                        key={memory.id}
                        onClick={() => setSelectedMemoryId(memory.id)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          selectedMemoryId === memory.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        {memory.title && (
                          <p className="text-gray-900 text-xs font-semibold mb-1">{memory.title}</p>
                        )}
                        <p className="text-gray-800 text-xs mb-2 line-clamp-2">{stripHtmlClient(memory.content)}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">
                            {new Date(memory.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                          {memory.topic && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                              {memory.topic}
                            </span>
                          )}
                          {memory.nature && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                              {memory.nature}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleLink}
                disabled={!selectedMemoryId || isLinking}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLinking ? '연결 중...' : '연결하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
