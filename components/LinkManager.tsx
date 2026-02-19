'use client';

import { useState } from 'react';
import { Memory } from '@/types';
import PixelIcon from './PixelIcon';

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
  const [linkType, setLinkType] = useState<'related' | 'depends-on' | 'derives-from'>('related');

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
          linkType,
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
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
          <div className="bg-green-500 text-white border-3 border-gray-900 p-4 min-w-[300px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
            {/* 픽셀 코너 장식 */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            
            <div className="flex items-center gap-3">
              <PixelIcon name="success" size={24} />
              <div>
                <p className="text-sm font-bold">기록이 연결되었습니다!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 연결 추가 토스트 팝업 */}
      {!showSuccess && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
          <div className="bg-white border-3 border-gray-900 w-[500px] max-h-[80vh] flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
            {/* 픽셀 코너 장식 */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            
            {/* 헤더 */}
            <div className="p-4 border-b-3 border-gray-900 flex justify-between items-center bg-white">
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-tight">기록 연결하기</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition-colors text-xl leading-none">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3">
                {/* 현재 기록 표시 */}
                <div className="bg-blue-50 p-3 border-2 border-blue-300"
                  style={{
                    clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
                  }}
                >
                  <div className="text-xs text-blue-700 font-bold mb-1 uppercase">현재 기록</div>
                  {currentMemory.title && (
                    <p className="text-gray-900 text-xs font-bold mb-1">{currentMemory.title}</p>
                  )}
                  <p className="text-gray-800 text-xs">{stripHtmlClient(currentMemory.content).substring(0, 80)}...</p>
                </div>

                {/* 연결 타입 선택 */}
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-bold uppercase">관계 유형</div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setLinkType('related')}
                      className={`px-2 py-2 text-xs font-bold border-2 transition-all text-left ${
                        linkType === 'related'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="inline-block w-6 border-t-2 border-dashed border-current" />
                        <span>↔</span>
                      </div>
                      <span>연관</span>
                    </button>
                    <button
                      onClick={() => setLinkType('depends-on')}
                      className={`px-2 py-2 text-xs font-bold border-2 transition-all text-left ${
                        linkType === 'depends-on'
                          ? 'border-orange-500 bg-orange-500 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-orange-500'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={`inline-block w-6 border-t-2 ${linkType === 'depends-on' ? 'border-white' : 'border-orange-500'}`} />
                        <span>→</span>
                      </div>
                      <span>의존</span>
                    </button>
                    <button
                      onClick={() => setLinkType('derives-from')}
                      className={`px-2 py-2 text-xs font-bold border-2 transition-all text-left ${
                        linkType === 'derives-from'
                          ? 'border-purple-500 bg-purple-500 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-purple-500'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={`inline-block w-6 border-t-2 ${linkType === 'derives-from' ? 'border-white' : 'border-purple-500'}`} />
                        <span>→</span>
                      </div>
                      <span>파생</span>
                    </button>
                  </div>
                  <div className="text-xs text-gray-400">
                    {linkType === 'related' && '점선 ↔  양방향 · 단순 연관 관계'}
                    {linkType === 'depends-on' && '실선 → 단방향 · 이 기록이 선택한 기록에 의존함'}
                    {linkType === 'derives-from' && '실선 → 단방향 · 이 기록이 선택한 기록에서 파생됨'}
                  </div>
                </div>

                {/* 검색 + 연결 메모 */}
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="연결할 기록 검색..."
                      className="w-full h-10 px-3 pr-10 text-sm border-2 border-gray-300 focus:outline-none focus:border-gray-900"
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
                      className="w-full h-10 px-3 text-sm border-2 border-gray-300 focus:outline-none focus:border-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* 기록 목록 */}
              <div className="px-4 pb-4">
                {availableMemories.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 text-sm font-bold">
                    {searchQuery ? '검색 결과가 없습니다.' : '연결 가능한 기록이 없습니다.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableMemories.map(memory => (
                      <button
                        key={memory.id}
                        onClick={() => setSelectedMemoryId(memory.id)}
                        className={`w-full p-3 border-2 transition-all text-left ${
                          selectedMemoryId === memory.id
                            ? 'border-gray-900 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-900 bg-white'
                        }`}
                        style={{
                          clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
                        }}
                      >
                        {memory.title && (
                          <p className="text-gray-900 text-xs font-bold mb-1">{memory.title}</p>
                        )}
                        <p className="text-gray-800 text-xs mb-2 line-clamp-2">{stripHtmlClient(memory.content)}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 font-bold">
                            {new Date(memory.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                          {memory.topic && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold">
                              {memory.topic}
                            </span>
                          )}
                          {memory.nature && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold">
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
            <div className="p-4 border-t-4 border-gray-900 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border-2 border-gray-900 text-gray-700 hover:bg-gray-100 transition-colors font-bold"
              >
                취소
              </button>
              <button
                onClick={handleLink}
                disabled={!selectedMemoryId || isLinking}
                className="px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
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
