/**
 * 로컬 우선 설정 페이지
 */

'use client';

import { useSession } from 'next-auth/react';
import { useLocalSync } from '@/hooks/useLocalSync';
import { useLocalExport } from '@/hooks/useLocalExport';
import { useState, useEffect } from 'react';
import PixelIcon from '@/components/PixelIcon';
import Link from 'next/link';

export default function LocalFirstSettings() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id || session?.user?.email || '';

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
    return (
      <div className="min-h-screen bg-[#4338ca] flex items-center justify-center font-galmuri11">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-black mb-4">로그인이 필요합니다.</p>
          <Link href="/auth/signin" className="text-indigo-600 underline">로그인하러 가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#4338ca] text-white p-4 md:p-8 font-galmuri11">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between mb-8 bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <PixelIcon name="settings" size={32} />
              데이터 및 동기화 설정
            </h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Workless는 데이터를 브라우저에 우선 저장하여 오프라인에서도 작동합니다.
            </p>
          </div>
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all">
            <PixelIcon name="close" size={24} />
          </Link>
        </div>

        {/* 상태 표시 */}
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
            <PixelIcon name="monitor" size={20} />
            시스템 상태
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-3 border-2 border-gray-200">
              <span className="text-gray-600 font-bold">네트워크 상태</span>
              <span className={`font-bold flex items-center gap-1 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                <PixelIcon name={isOnline ? 'zap' : 'close'} size={16} />
                {isOnline ? '온라인 연결됨' : '오프라인 상태'}
              </span>
            </div>

            <div className="flex justify-between items-center bg-gray-50 p-3 border-2 border-gray-200">
              <span className="text-gray-600 font-bold">현재 동기화 모드</span>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 ${syncMode === 'auto' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="font-bold">
                  {syncMode === 'disabled' && '클라우드 동기화 비활성'}
                  {syncMode === 'enabled' && '수동 동기화 대기'}
                  {syncMode === 'auto' && '자동 실시간 동기화'}
                </span>
              </div>
            </div>

            {lastSyncedAt > 0 && (
              <div className="flex justify-between items-center bg-gray-50 p-3 border-2 border-gray-200">
                <span className="text-gray-600 font-bold">최근 동기화 시점</span>
                <span className="font-bold">
                  {new Date(lastSyncedAt).toLocaleString('ko-KR')}
                </span>
              </div>
            )}

            {needsSync && syncMode !== 'disabled' && (
              <div className="bg-yellow-100 border-4 border-yellow-400 p-3 text-yellow-800 font-bold flex items-center gap-2">
                <PixelIcon name="alert" size={20} />
                서버와 동기화되지 않은 데이터가 있습니다.
              </div>
            )}

            {stats && (
              <div className="bg-indigo-50 border-2 border-indigo-200 p-4 mt-4">
                <div className="text-sm text-indigo-800 font-bold mb-3 flex items-center gap-1">
                  <PixelIcon name="list" size={14} />
                  내 기기에 저장된 데이터 통계
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-2 bg-white border border-indigo-100">
                    <div className="text-xs text-gray-500">메모리</div>
                    <div className="text-lg font-bold">{stats.memoriesCount}</div>
                  </div>
                  <div className="text-center p-2 bg-white border border-indigo-100">
                    <div className="text-xs text-gray-500">그룹</div>
                    <div className="text-lg font-bold">{stats.groupsCount}</div>
                  </div>
                  <div className="text-center p-2 bg-white border border-indigo-100">
                    <div className="text-xs text-gray-500">목표</div>
                    <div className="text-lg font-bold">{stats.goalsCount}</div>
                  </div>
                  <div className="text-center p-2 bg-white border border-indigo-100">
                    <div className="text-xs text-gray-500">위젯</div>
                    <div className="text-lg font-bold">{stats.blocksCount}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 동기화 설정 */}
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
            <PixelIcon name="cloud" size={20} />
            동기화 옵션
          </h2>
          
          <div className="space-y-4">
            <label className={`flex items-start space-x-3 p-4 border-2 transition-all cursor-pointer ${syncMode === 'disabled' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
              <input
                type="radio"
                name="syncMode"
                checked={syncMode === 'disabled'}
                onChange={() => changeSyncMode('disabled')}
                className="mt-1 w-5 h-5 accent-black"
              />
              <div>
                <div className="font-bold">클라우드 비활성 (로컬 전용)</div>
                <div className="text-sm text-gray-500 mt-1">
                  어떠한 데이터도 서버에 전송하지 않습니다. 사생활이 완벽히 보호되지만, 다른 기기에서 데이터를 볼 수 없습니다.
                </div>
              </div>
            </label>

            <label className={`flex items-start space-x-3 p-4 border-2 transition-all cursor-pointer ${syncMode === 'enabled' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
              <input
                type="radio"
                name="syncMode"
                checked={syncMode === 'enabled'}
                onChange={() => changeSyncMode('enabled')}
                className="mt-1 w-5 h-5 accent-black"
              />
              <div>
                <div className="font-bold">수동 백업 모드</div>
                <div className="text-sm text-gray-500 mt-1">
                  데이터가 내 기기에만 머물며, 원할 때만 아래 '지금 동기화' 버튼을 통해 서버에 백업합니다.
                </div>
              </div>
            </label>

            <label className={`flex items-start space-x-3 p-4 border-2 transition-all cursor-pointer ${syncMode === 'auto' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
              <input
                type="radio"
                name="syncMode"
                checked={syncMode === 'auto'}
                onChange={() => changeSyncMode('auto')}
                className="mt-1 w-5 h-5 accent-black"
              />
              <div>
                <div className="font-bold">실시간 동기화 (권장)</div>
                <div className="text-sm text-gray-500 mt-1">
                  데이터가 변경될 때마다 서버와 자동으로 동기화됩니다. 모바일이나 다른 컴퓨터에서도 동일한 내용을 즉시 확인할 수 있습니다.
                </div>
              </div>
            </label>

            {syncMode !== 'disabled' && (
              <div className="bg-indigo-900 text-white p-4 border-b-4 border-r-4 border-black mt-4">
                <div className="font-bold mb-2 flex items-center gap-2">
                  <PixelIcon name="lock" size={16} className="text-indigo-300" />
                  엔드-투-엔드 암호화 적용
                </div>
                <div className="text-xs text-indigo-200 leading-relaxed">
                  서버로 전송되는 데이터는 AES-256 방식으로 암호화되어 보관됩니다. 
                  귀하의 계정 비밀번호를 기반으로 생성된 키 없이는 누구도 내용을 열람할 수 없습니다.
                </div>
              </div>
            )}

            {syncMode !== 'disabled' && (
              <div className="flex flex-col md:flex-row gap-3 mt-6">
                <button
                  onClick={performSync}
                  disabled={isSyncing || !isOnline}
                  className="flex-1 bg-black text-white px-6 py-4 font-bold border-b-4 border-r-4 border-gray-700 active:translate-x-1 active:translate-y-1 active:border-0 transition-all disabled:bg-gray-400 disabled:border-gray-300 flex items-center justify-center gap-2"
                >
                  <PixelIcon name="upload" size={20} />
                  {isSyncing ? '동기화 진행 중...' : '지금 서버로 백업'}
                </button>

                <button
                  onClick={restoreFromServer}
                  disabled={isSyncing || !isOnline}
                  className="flex-1 bg-white text-black px-6 py-4 font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:text-gray-400 disabled:border-gray-200 flex items-center justify-center gap-2"
                >
                  <PixelIcon name="download" size={20} />
                  서버 데이터로 복원
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Export/Import */}
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
            <PixelIcon name="file" size={20} />
            데이터 내보내기 및 가져오기
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <PixelIcon name="download" size={16} />
                내보내기 (Export)
              </h3>
              <p className="text-sm text-gray-500">
                현재 브라우저에 저장된 모든 정보를 JSON 파일로 다운로드합니다. 
                백업 파일을 직접 관리하고 싶을 때 사용하세요.
              </p>
              <button
                onClick={exportData}
                className="w-full bg-indigo-600 text-white px-6 py-3 font-bold border-b-4 border-r-4 border-indigo-900 active:translate-x-1 active:translate-y-1 active:border-0 transition-all flex items-center justify-center gap-2"
              >
                📥 데이터 파일 다운로드
              </button>
            </div>

            <div className="space-y-4 border-t-2 md:border-t-0 md:border-l-2 border-gray-100 md:pl-8 pt-6 md:pt-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <PixelIcon name="upload" size={16} />
                가져오기 (Import)
              </h3>
              <p className="text-sm text-gray-500">
                이전에 내보낸 JSON 파일을 불러옵니다.
              </p>
              
              <div className="relative border-2 border-dashed border-gray-300 p-4 text-center hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-xs text-gray-500">
                  {importFile ? importFile.name : 'JSON 파일을 선택하거나 여기로 드래그'}
                </div>
              </div>

              {importFile && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImport(false)}
                    className="flex-1 bg-red-500 text-white px-3 py-2 text-xs font-bold border-b-2 border-r-2 border-red-800"
                  >
                    전체 덮어쓰기
                  </button>
                  <button
                    onClick={() => handleImport(true)}
                    className="flex-1 bg-indigo-500 text-white px-3 py-2 text-xs font-bold border-b-2 border-r-2 border-indigo-800"
                  >
                    기존 데이터와 병합
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 설명 */}
        <div className="bg-black/20 p-6 border-l-4 border-white/30 text-white/80">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <PixelIcon name="info" size={16} />
            로컬 우선(Local-First) 기술 안내
          </h3>
          <ul className="text-xs space-y-2 leading-relaxed">
            <li>• 귀하의 데이터는 브라우저 내 IndexedDB라는 안전한 저장소에 1순위로 기록됩니다.</li>
            <li>• 네트워크 연결이 끊겨도 메모 추가 및 조회 등 모든 기능을 평소처럼 이용할 수 있습니다.</li>
            <li>• 서버 동기화는 데이터 백업 및 멀티 디바이스 환경을 위한 선택 사항입니다.</li>
            <li>• &quot;당신의 데이터는 당신의 기기에 머물러야 한다&quot;는 철학을 준수합니다.</li>
          </ul>
        </div>
        
        <div className="flex justify-center pb-12">
          <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors flex items-center gap-2">
            <PixelIcon name="arrow-left" size={16} />
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
