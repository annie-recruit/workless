/**
 * 동기화 상태 관리 훅
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { localDB } from '@/lib/localDB';
import { dataLayer } from '@/lib/dataLayer';
import type { SyncMode } from '@/lib/dataLayer';

export function useLocalSync(userId: string) {
  const { data: session, status } = useSession();
  const [syncMode, setSyncMode] = useState<SyncMode>('disabled');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(0);
  const [needsSync, setNeedsSync] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // 초기 마이그레이션 및 자동 복원 체크
  useEffect(() => {
    const autoMigrate = async () => {
      if (status !== 'authenticated' || !isOnline) return;
      
      const email = session?.user?.email || '';
      const numericId = (session?.user as any)?.id || '';
      const activeUserId = numericId || email || userId;

      if (!activeUserId) return;

      console.log(`[Sync] Initializing for user ${activeUserId}...`);
      await localDB.initialize(activeUserId);

      console.log(`[Sync] Checking auto-migration for user ${activeUserId}...`);

      // 1. 로컬 ID 마이그레이션 (email -> numericId)
      if (email && numericId && email !== numericId) {
        await dataLayer.migrateLocalData(email, numericId);
      }

      // 2. 로컬에 데이터가 아예 없는지 확인 (어떤 유저의 데이터라도 있으면 복원 안 함)
      const stats = await localDB.getStats(activeUserId);
      if (stats.totalGlobalItems === 0) {
        console.log('[Sync] Local DB is empty, attempting auto-migration from server...');
        try {
          await dataLayer.restoreFromServer(activeUserId);
          console.log('[Sync] Auto-migration successful');
          
          // 복원된 데이터가 있는지 다시 확인
          const newStats = await localDB.getStats(activeUserId);
          if (newStats.totalItems > 0) {
            window.location.reload(); 
          }
        } catch (error) {
          console.error('[Sync] Auto-migration failed:', error);
        }
      } else {
        console.log(`[Sync] Local DB already has ${stats.totalGlobalItems} items, skipping auto-restore.`);
      }
    };

    // 로컬스토리지에 마이그레이션 시도 여부 저장하여 중복 실행 방지 (세션별로)
    const migrateKey = `workless:migrated:${userId}`;
    if (status === 'authenticated' && !localStorage.getItem(migrateKey)) {
      autoMigrate().then(() => {
        localStorage.setItem(migrateKey, 'true');
      });
    }
  }, [userId, isOnline, status, session]);

  // 수동 동기화
  const performSync = useCallback(async (silent = false) => {
    if (!isOnline) {
      if (!silent) alert('오프라인 상태입니다. 인터넷 연결을 확인해주세요.');
      return;
    }

    setIsSyncing(true);
    try {
      // 1. 오프라인 큐 처리
      await dataLayer.processSyncQueue();

      // 2. 전체 백업 (필요시)
      if (await localDB.needsSync(userId)) {
        await dataLayer.backupToServer(userId);
      }

      if (!silent) alert('동기화 완료!');
    } catch (error) {
      console.error('Sync failed:', error);
      if (!silent) alert('동기화 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isOnline]);

  // 동기화 설정 로드
  useEffect(() => {
    const saved = localStorage.getItem('workless:syncMode') as SyncMode;
    if (saved) {
      setSyncMode(saved);
      dataLayer.setSyncMode(saved);
    }
  }, []);

  // 주기적 자동 동기화
  useEffect(() => {
    if (syncMode === 'auto' && needsSync && isOnline && !isSyncing) {
      const timer = setTimeout(() => {
        performSync(true); // 자동 동기화는 silent 모드로
      }, 2000); // 2초 대기 후 동기화 (연속 작업 고려)
      return () => clearTimeout(timer);
    }
  }, [syncMode, needsSync, isOnline, isSyncing, performSync]);

  // 동기화 필요 여부 체크
  useEffect(() => {
    const checkSync = async () => {
      const dirty = await localDB.needsSync(userId);
      setNeedsSync(dirty);

      const metadata = await localDB.syncMetadata.get('user_' + userId);
      if (metadata) {
        setLastSyncedAt(metadata.lastSyncedAt);
      }
    };

    checkSync();
    const interval = setInterval(checkSync, 5000); // 5초마다 체크

    return () => clearInterval(interval);
  }, [userId]);

  // 온라인 상태 감지
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 동기화 모드 변경
  const changeSyncMode = useCallback((mode: SyncMode) => {
    setSyncMode(mode);
    dataLayer.setSyncMode(mode);
    localStorage.setItem('workless:syncMode', mode);

    // 동기화 활성화 시 즉시 동기화
    if (mode === 'enabled' || mode === 'auto') {
      performSync();
    }
  }, [performSync]);

  // 서버에서 복원
  const restoreFromServer = useCallback(async () => {
    if (!isOnline) {
      alert('오프라인 상태입니다. 인터넷 연결을 확인해주세요.');
      return;
    }

    if (!confirm('서버에서 데이터를 복원하시겠습니까? 현재 로컬 데이터는 덮어씌워집니다.')) {
      return;
    }

    setIsSyncing(true);
    try {
      await dataLayer.restoreFromServer(userId);
      alert('복원 완료!');
      window.location.reload(); // 페이지 새로고침
    } catch (error) {
      console.error('Restore failed:', error);
      alert('복원 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isOnline]);

  // 서버에서 강제 복원
  const forceRestoreFromServer = useCallback(async () => {
    if (!isOnline) {
      alert('오프라인 상태입니다. 인터넷 연결을 확인해주세요.');
      return;
    }

    if (!confirm('서버에서 데이터를 강제로 복원하시겠습니까? 현재 로컬 데이터는 모두 삭제되고 서버 데이터로 대체됩니다.')) {
      return;
    }

    setIsSyncing(true);
    try {
      await dataLayer.restoreFromServer(userId);
      alert('강제 복원 완료!');
      window.location.reload();
    } catch (error) {
      console.error('Force restore failed:', error);
      alert('복원 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isOnline]);

  return {
    syncMode,
    isSyncing,
    lastSyncedAt,
    needsSync,
    isOnline,
    changeSyncMode,
    performSync,
    restoreFromServer,
    forceRestoreFromServer,
  };
}
