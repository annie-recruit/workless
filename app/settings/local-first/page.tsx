/**
 * 로컬 우선 설정 페이지
 */

'use client';

import { useSession } from 'next-auth/react';
import { useLocalSync } from '@/hooks/useLocalSync';
import { useLocalExport } from '@/hooks/useLocalExport';
import { dataLayer } from '@/lib/dataLayer';
import { useState, useEffect } from 'react';
import PixelIcon from '@/components/PixelIcon';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageContext';
import { signOut } from 'next-auth/react';

export default function LocalFirstSettings() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id || session?.user?.email || '';
  const { t, language } = useLanguage();
  const router = useRouter();

  const {
    syncMode,
    isSyncing,
    lastSyncedAt,
    needsSync,
    isOnline,
    changeSyncMode,
    performSync,
    restoreFromServer,
    forceRestoreFromServer,
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

  const handleWithdraw = async () => {
    if (!confirm(t('common.confirmWithdraw'))) return;

    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' });
      if (res.ok) {
        alert(t('common.withdrawSuccess'));
        await signOut({ callbackUrl: '/' });
      } else {
        alert(t('common.withdrawFailed'));
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      alert(t('common.withdrawFailed'));
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#4338ca] flex items-center justify-center font-galmuri11">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-black mb-4">{t('settings.auth.required')}</p>
          <Link href="/auth/signin" className="text-indigo-600 underline">{t('settings.auth.button')}</Link>
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
              {t('settings.title')}
            </h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              {t('settings.desc')}
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
            {t('settings.status.title')}
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-3 border-2 border-gray-200">
              <span className="text-gray-600 font-bold">{t('settings.status.network')}</span>
              <span className={`font-bold flex items-center gap-1 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                <PixelIcon name={isOnline ? 'zap' : 'close'} size={16} />
                {isOnline ? t('settings.status.online') : t('settings.status.offline')}
              </span>
            </div>

            <div className="flex justify-between items-center bg-gray-50 p-3 border-2 border-gray-200">
              <span className="text-gray-600 font-bold">{t('settings.status.syncMode')}</span>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 ${syncMode === 'auto' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="font-bold">
                  {syncMode === 'disabled' && t('settings.status.syncMode.disabled')}
                  {syncMode === 'enabled' && t('settings.status.syncMode.enabled')}
                  {syncMode === 'auto' && t('settings.status.syncMode.auto')}
                </span>
              </div>
            </div>

            {lastSyncedAt > 0 && (
              <div className="flex justify-between items-center bg-gray-50 p-3 border-2 border-gray-200">
                <span className="text-gray-600 font-bold">{t('settings.status.lastSync')}</span>
                <span className="font-bold">
                  {new Date(lastSyncedAt).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')}
                </span>
              </div>
            )}

            {needsSync && syncMode !== 'disabled' && (
              <div className="bg-yellow-100 border-4 border-yellow-400 p-3 text-yellow-800 font-bold flex items-center gap-2">
                <PixelIcon name="alert" size={20} />
                {t('settings.status.needsSync')}
              </div>
            )}

            {stats && (
              <div className="bg-indigo-50 border-2 border-indigo-200 p-4 mt-4">
                <div className="text-sm text-indigo-800 font-bold mb-3 flex items-center gap-1">
                  <PixelIcon name="list" size={14} />
                  {t('settings.status.stats.title')}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-2 bg-white border border-indigo-100">
                    <div className="text-xs text-gray-500">{t('settings.status.stats.memories')}</div>
                    <div className="text-lg font-bold">{stats.memoriesCount}</div>
                  </div>
                  <div className="text-center p-2 bg-white border border-indigo-100">
                    <div className="text-xs text-gray-500">{t('settings.status.stats.groups')}</div>
                    <div className="text-lg font-bold">{stats.groupsCount}</div>
                  </div>
                  <div className="text-center p-2 bg-white border border-indigo-100">
                    <div className="text-xs text-gray-500">{t('settings.status.stats.goals')}</div>
                    <div className="text-lg font-bold">{stats.goalsCount}</div>
                  </div>
                  <div className="text-center p-2 bg-white border border-indigo-100">
                    <div className="text-xs text-gray-500">{t('settings.status.stats.widgets')}</div>
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
            {t('settings.sync.title')}
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
                <div className="font-bold">{t('settings.sync.disabled.title')}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {t('settings.sync.disabled.desc')}
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
                <div className="font-bold">{t('settings.sync.manual.title')}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {t('settings.sync.manual.desc')}
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
                <div className="font-bold">{t('settings.sync.auto.title')}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {t('settings.sync.auto.desc')}
                </div>
              </div>
            </label>

            {syncMode !== 'disabled' && (
              <div className="bg-indigo-900 text-white p-4 border-b-4 border-r-4 border-black mt-4">
                <div className="font-bold mb-2 flex items-center gap-2">
                  <PixelIcon name="lock" size={16} className="text-indigo-300" />
                  {t('settings.sync.encryption.title')}
                </div>
                <div className="text-xs text-indigo-200 leading-relaxed">
                  {t('settings.sync.encryption.desc')}
                </div>
              </div>
            )}

            {syncMode !== 'disabled' && (
              <div className="flex flex-col md:flex-row gap-3 mt-6">
                <button
                  onClick={() => performSync()}
                  disabled={isSyncing || !isOnline}
                  className="flex-1 bg-black text-white px-6 py-4 font-bold border-b-4 border-r-4 border-gray-700 active:translate-x-1 active:translate-y-1 active:border-0 transition-all disabled:bg-gray-400 disabled:border-gray-300 flex items-center justify-center gap-2"
                >
                  <PixelIcon name="upload" size={20} />
                  {isSyncing ? t('settings.sync.button.backup.progress') : t('settings.sync.button.backup')}
                </button>

                <button
                  onClick={() => restoreFromServer()}
                  disabled={isSyncing || !isOnline}
                  className="flex-1 bg-white text-black px-6 py-4 font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:text-gray-400 disabled:border-gray-200 flex items-center justify-center gap-2"
                >
                  <PixelIcon name="download" size={20} />
                  {t('settings.sync.button.restore')}
                </button>
              </div>
            )}

            {syncMode !== 'disabled' && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <button
                  onClick={async () => {
                    const data = await dataLayer.debugGetAllLocalData();
                    console.log('🔍 [Debug] Local Data:', data);
                    const alertMsg = language === 'ko' 
                      ? `로컬 데이터: ${data.memories.length}개의 기록, ${data.groups.length}개의 그룹\n유저 ID 목록: ${data.userIds.join(', ')}\n\n상세 내용은 브라우저 콘솔(F12)을 확인하세요.`
                      : `Local Data: ${data.memories.length} memories, ${data.groups.length} groups\nUser IDs: ${data.userIds.join(', ')}\n\nCheck browser console (F12) for details.`;
                    alert(alertMsg);
                  }}
                  className="text-[10px] text-gray-400 hover:underline flex items-center gap-1"
                >
                  <PixelIcon name="info" size={12} />
                  {t('settings.sync.button.diagnose')}
                </button>
                <button
                  onClick={() => forceRestoreFromServer()}
                  className="text-[10px] text-red-500 hover:underline flex items-center gap-1"
                >
                  <PixelIcon name="warning" size={12} />
                  {t('settings.sync.button.forceRestore')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Export/Import */}
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
            <PixelIcon name="file" size={20} />
            {t('settings.export.title')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <PixelIcon name="download" size={16} />
                {t('settings.export.section.title')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('settings.export.section.desc')}
              </p>
              <button
                onClick={() => exportData()}
                className="w-full bg-indigo-600 text-white px-6 py-3 font-bold border-b-4 border-r-4 border-indigo-900 active:translate-x-1 active:translate-y-1 active:border-0 transition-all flex items-center justify-center gap-2"
              >
                {t('settings.export.button')}
              </button>
            </div>

            <div className="space-y-4 border-t-2 md:border-t-0 md:border-l-2 border-gray-100 md:pl-8 pt-6 md:pt-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <PixelIcon name="upload" size={16} />
                {t('settings.import.section.title')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('settings.import.section.desc')}
              </p>
              
              <div className="relative border-2 border-dashed border-gray-300 p-4 text-center hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-xs text-gray-500">
                  {importFile ? importFile.name : t('settings.import.placeholder')}
                </div>
              </div>

              {importFile && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImport(false)}
                    className="flex-1 bg-red-500 text-white px-3 py-2 text-xs font-bold border-b-2 border-r-2 border-red-800"
                  >
                    {t('settings.import.button.overwrite')}
                  </button>
                  <button
                    onClick={() => handleImport(true)}
                    className="flex-1 bg-indigo-500 text-white px-3 py-2 text-xs font-bold border-b-2 border-r-2 border-indigo-800"
                  >
                    {t('settings.import.button.merge')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 위험 구역 */}
        <div className="bg-red-50 border-4 border-red-200 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-red-900">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-2 border-red-200 pb-2">
            <PixelIcon name="warning" size={20} />
            {t('settings.danger.title')}
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-bold text-lg">{t('settings.danger.withdraw.title')}</div>
              <p className="text-sm opacity-80 mt-1">
                {t('settings.danger.withdraw.desc')}
              </p>
            </div>
            <button
              onClick={handleWithdraw}
              className="whitespace-nowrap bg-red-600 text-white px-6 py-3 font-bold border-b-4 border-r-4 border-red-900 active:translate-x-1 active:translate-y-1 active:border-0 transition-all"
            >
              {t('settings.danger.withdraw.button')}
            </button>
          </div>
        </div>

        {/* 설명 */}
        <div className="bg-black/20 p-6 border-l-4 border-white/30 text-white/80">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <PixelIcon name="info" size={16} />
            {t('settings.info.title')}
          </h3>
          <ul className="text-xs space-y-2 leading-relaxed">
            <li>• {t('settings.info.1')}</li>
            <li>• {t('settings.info.2')}</li>
            <li>• {t('settings.info.3')}</li>
            <li>• {t('settings.info.4')}</li>
          </ul>
        </div>
        
        <div className="flex justify-center pb-12">
          <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors flex items-center gap-2">
            <PixelIcon name="arrow-left" size={16} />
            {t('settings.button.back')}
          </Link>
        </div>
      </div>
    </div>
  );
}
