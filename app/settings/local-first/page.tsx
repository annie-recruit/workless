/**
 * 로컬 우선 설정 페이지
 * 
 * Obsidian 스타일의 동기화 설정을 제공합니다.
 */

'use client';

import { useSession } from 'next-auth/react';
import { useLocalSync } from '@/hooks/useLocalSync';
import { useLocalExport } from '@/hooks/useLocalExport';
import { useState, useEffect } from 'react';

export default function LocalFirstSettings() {
  const { data: session } = useSession();
  const userId = session?.user?.email || '';

  const {
    syncMode,
    isSyncing,
    lastSyncedAt,
    needsSync,
    isOnline,
    changeSyncMode,
    performSync,
    restoreFromServer,
  } = useLocalSync(userId);

  const { exportData, importData, getStats } = useLocalExport(userId);

  const [stats, setStats] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  // 통계 로드
  useEffect(() => {
    getStats().then(setStats);
  }, [getStats]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImport = async (merge: boolean) => {
    if (!importFile) return;
    await importData(importFile, merge);
    setImportFile(null);
  };

  if (!session) {
    return <div>로그인이 필요합니다.</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">로컬 우선 설정</h1>
        <p className="text-gray-400 mb-8">
          Obsidian 스타일: 데이터는 기본적으로 내 기기에만 저장됩니다.
        </p>

        {/* 상태 표시 */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📊 현재 상태</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">온라인 상태</span>
              <span className={isOnline ? 'text-green-500' : 'text-red-500'}>
                {isOnline ? '✓ 온라인' : '✗ 오프라인'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">동기화 모드</span>
              <span className="text-white">
                {syncMode === 'disabled' && '❌ 비활성'}
                {syncMode === 'enabled' && '✓ 활성'}
                {syncMode === 'auto' && '⚡ 자동'}
              </span>
            </div>

            {lastSyncedAt > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">마지막 동기화</span>
                <span className="text-white">
                  {new Date(lastSyncedAt).toLocaleString('ko-KR')}
                </span>
              </div>
            )}

            {needsSync && syncMode !== 'disabled' && (
              <div className="bg-yellow-900/30 border border-yellow-500 rounded p-3 text-yellow-500">
                ⚠️ 동기화가 필요합니다
              </div>
            )}

            {stats && (
              <div className="border-t border-gray-700 pt-3 mt-3">
                <div className="text-sm text-gray-400">로컬 저장된 데이터</div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>메모리: {stats.memoriesCount}개</div>
                  <div>그룹: {stats.groupsCount}개</div>
                  <div>목표: {stats.goalsCount}개</div>
                  <div>블록: {stats.blocksCount}개</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 동기화 설정 */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🔄 동기화 설정</h2>
          
          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="syncMode"
                checked={syncMode === 'disabled'}
                onChange={() => changeSyncMode('disabled')}
                className="w-5 h-5"
              />
              <div>
                <div className="font-bold">비활성</div>
                <div className="text-sm text-gray-400">
                  서버에 데이터를 전송하지 않습니다 (완전 로컬 전용)
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="syncMode"
                checked={syncMode === 'enabled'}
                onChange={() => changeSyncMode('enabled')}
                className="w-5 h-5"
              />
              <div>
                <div className="font-bold">수동 동기화</div>
                <div className="text-sm text-gray-400">
                  원할 때만 서버에 백업합니다 (암호화됨)
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="syncMode"
                checked={syncMode === 'auto'}
                onChange={() => changeSyncMode('auto')}
                className="w-5 h-5"
              />
              <div>
                <div className="font-bold">자동 동기화</div>
                <div className="text-sm text-gray-400">
                  변경사항을 자동으로 서버에 백업합니다
                </div>
              </div>
            </label>

            {syncMode !== 'disabled' && (
              <div className="bg-blue-900/30 border border-blue-500 rounded p-4 mt-4">
                <div className="font-bold mb-2">🔐 암호화 정보</div>
                <div className="text-sm text-gray-300">
                  서버로 전송되는 모든 데이터는 AES-256으로 암호화됩니다.
                  암호화 키는 당신의 기기에만 저장되며, 서버는 암호화된 데이터만 보관합니다.
                </div>
              </div>
            )}

            {syncMode !== 'disabled' && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={performSync}
                  disabled={isSyncing || !isOnline}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition"
                >
                  {isSyncing ? '동기화 중...' : '지금 동기화'}
                </button>

                <button
                  onClick={restoreFromServer}
                  disabled={isSyncing || !isOnline}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition"
                >
                  서버에서 복원
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Export/Import */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">💾 백업 및 복원</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold mb-2">내보내기 (Export)</h3>
              <p className="text-sm text-gray-400 mb-3">
                모든 데이터를 JSON 파일로 내보냅니다.
                다른 기기로 이동하거나 백업용으로 사용하세요.
              </p>
              <button
                onClick={exportData}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition"
              >
                📥 JSON 파일로 내보내기
              </button>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h3 className="font-bold mb-2">가져오기 (Import)</h3>
              <p className="text-sm text-gray-400 mb-3">
                백업 파일에서 데이터를 복원합니다.
              </p>
              
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="block mb-3 text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-gray-700 file:text-white
                  hover:file:bg-gray-600
                  cursor-pointer"
              />

              {importFile && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleImport(false)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition"
                  >
                    덮어쓰기
                  </button>
                  <button
                    onClick={() => handleImport(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition"
                  >
                    병합하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 설명 */}
        <div className="mt-8 text-sm text-gray-500">
          <h3 className="font-bold mb-2">💡 로컬 우선(Local-First)이란?</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>모든 데이터는 기본적으로 내 기기(브라우저)에만 저장됩니다</li>
            <li>인터넷 없이도 앱을 사용할 수 있습니다</li>
            <li>서버 해킹이나 장애가 발생해도 내 데이터는 안전합니다</li>
            <li>원한다면 선택적으로 서버에 암호화 백업할 수 있습니다</li>
            <li>Obsidian과 같은 철학: "내 데이터는 내가 소유합니다"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
