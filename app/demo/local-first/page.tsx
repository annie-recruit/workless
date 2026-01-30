/**
 * 로컬 우선 데모 페이지
 * 
 * IndexedDB가 실제로 작동하는지 테스트할 수 있는 간단한 데모
 */

'use client';

import { useState } from 'react';
import { useLocalMemories } from '@/hooks/useLocalMemories';
import { useLocalSync } from '@/hooks/useLocalSync';
import { useLocalExport } from '@/hooks/useLocalExport';

export default function LocalFirstDemo() {
  // 로그인 없이 데모용 고정 userId 사용
  const [userId] = useState('demo-user');
  const [inputValue, setInputValue] = useState('');

  const { 
    memories, 
    createMemory, 
    updateMemory,
    deleteMemory, 
    isLoading 
  } = useLocalMemories(userId);

  const {
    isOnline,
    syncMode,
    changeSyncMode,
    needsSync,
  } = useLocalSync(userId);

  const { exportData, getStats } = useLocalExport(userId);

  const [stats, setStats] = useState<any>(null);

  const handleAdd = async () => {
    if (!inputValue.trim()) return;
    await createMemory(inputValue);
    setInputValue('');
  };

  const handleLoadStats = async () => {
    const s = await getStats();
    setStats(s);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-2xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🚀 로컬 우선 데모</h1>
        <p className="text-gray-400 mb-8">
          IndexedDB에 데이터가 저장되고, 오프라인에서도 작동합니다.
        </p>

        {/* 상태 표시 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">온라인 상태</div>
            <div className={`text-2xl font-bold ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
              {isOnline ? '✓ 온라인' : '✗ 오프라인'}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">동기화</div>
            <div className="text-2xl font-bold">
              {syncMode === 'disabled' && '❌ 비활성'}
              {syncMode === 'enabled' && '✓ 활성'}
              {syncMode === 'auto' && '⚡ 자동'}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">메모리 수</div>
            <div className="text-2xl font-bold text-blue-500">
              {memories.length}개
            </div>
          </div>
        </div>

        {needsSync && (
          <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4 mb-6">
            ⚠️ 동기화가 필요합니다
          </div>
        )}

        {/* 입력 폼 */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">메모리 추가</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="메모를 입력하세요..."
              className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition"
            >
              추가
            </button>
          </div>
          <div className="text-sm text-gray-400 mt-2">
            💡 오프라인에서도 추가할 수 있습니다 (개발자 도구 {'->'} Network {'->'} Offline)
          </div>
        </div>

        {/* 메모리 리스트 */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">저장된 메모리</h2>
          
          {memories.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              아직 메모리가 없습니다. 위에서 추가해보세요!
            </div>
          ) : (
            <div className="space-y-3">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="text-white">{memory.content}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(memory.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMemory(memory.id)}
                    className="ml-4 text-red-500 opacity-0 group-hover:opacity-100 transition hover:text-red-400"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 액션 버튼들 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={exportData}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition"
          >
            📥 JSON 내보내기
          </button>

          <button
            onClick={handleLoadStats}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition"
          >
            📊 통계 보기
          </button>
        </div>

        {stats && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">📊 통계</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-400">메모리</div>
                <div className="text-2xl font-bold">{stats.memoriesCount}개</div>
              </div>
              <div>
                <div className="text-gray-400">그룹</div>
                <div className="text-2xl font-bold">{stats.groupsCount}개</div>
              </div>
              <div>
                <div className="text-gray-400">목표</div>
                <div className="text-2xl font-bold">{stats.goalsCount}개</div>
              </div>
              <div>
                <div className="text-gray-400">블록</div>
                <div className="text-2xl font-bold">{stats.blocksCount}개</div>
              </div>
            </div>
          </div>
        )}

        {/* 동기화 설정 */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🔄 동기화 모드</h2>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                checked={syncMode === 'disabled'}
                onChange={() => changeSyncMode('disabled')}
                className="w-4 h-4"
              />
              <span>비활성 (완전 로컬)</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                checked={syncMode === 'enabled'}
                onChange={() => changeSyncMode('enabled')}
                className="w-4 h-4"
              />
              <span>수동 동기화</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                checked={syncMode === 'auto'}
                onChange={() => changeSyncMode('auto')}
                className="w-4 h-4"
              />
              <span>자동 동기화</span>
            </label>
          </div>
        </div>

        {/* 개발자 도구 힌트 */}
        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-6">
          <h3 className="font-bold mb-2">🛠️ 개발자 도구에서 확인하기</h3>
          <div className="text-sm space-y-2 text-gray-300">
            <div className="bg-gray-900 rounded p-2 font-mono">
              localDB.memories.toArray().then(console.log)
            </div>
            <div className="bg-gray-900 rounded p-2 font-mono">
              {`localDB.getStats('{userId}').then(console.log)`}
            </div>
            <div className="bg-gray-900 rounded p-2 font-mono">
              dataLayer.isSyncEnabled()
            </div>
            <div className="text-xs text-gray-500 mt-2">
              F12 {'->'} Console 탭에서 위 명령어를 실행해보세요
            </div>
          </div>
        </div>

        {/* 테스트 시나리오 */}
        <div className="mt-8 text-sm text-gray-500">
          <h3 className="font-bold mb-2">🧪 테스트 시나리오</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>메모리를 몇 개 추가해보세요</li>
            <li>개발자 도구 {'->'} Network {'->'} Offline 체크</li>
            <li>오프라인 상태에서 메모리를 더 추가해보세요 (작동해야 함!)</li>
            <li>브라우저를 새로고침해도 데이터가 유지됩니다</li>
            <li>JSON 내보내기로 백업 파일을 다운로드하세요</li>
            <li>Application {'->'} IndexedDB {'->'} workless-local-db에서 데이터 확인</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
