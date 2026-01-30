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

  // 초기 마이그레이션 체크
  useEffect(() => {
    const autoMigrate = async () => {
      if (status !== 'authenticated' || !userId || !isOnline) return;
      
      const email = session?.user?.email || '';
      const numericId = (session?.user as any)?.id || '';

      // 1. 로컬 ID 마이그레이션 (email -> numericId)
      if (email && numericId && email !== numericId) {
        await dataLayer.migrateLocalData(email, numericId);
      }

      const activeUserId = numericId || email || userId;

      // 2. 로컬에 데이터가 아예 없는지 확인 (어떤 유저의 데이터라도 있으면 복원 안 함)
      const stats = await localDB.getStats(activeUserId);
      if (stats.totalGlobalItems === 0) {
        console.log('Local DB is empty, attempting auto-migration from server...');
        try {
          await dataLayer.restoreFromServer(activeUserId);
          console.log('Auto-migration successful');
          window.location.reload(); 
        } catch (error) {
          console.error('Auto-migration failed:', error);
        }
      }
    };

    // 로컬스토리지에 마이그레이션 시도 여부 저장하여 중복 실행 방지
    const migrateKey = `workless:migrated:${userId}`;
    if (!localStorage.getItem(migrateKey)) {
      autoMigrate().then(() => {
        localStorage.setItem(migrateKey, 'true');
      });
    }
  }, [userId, isOnline, status]);

  // 동기화 설정 로드
  useEffect(() => {
    const saved = localStorage.getItem('workless:syncMode') as SyncMode;
    if (saved) {
      setSyncMode(saved);
      dataLayer.setSyncMode(saved);
    }
  }, []);

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
  }, []);

  // 수동 동기화
  const performSync = useCallback(async () => {
    if (!isOnline) {
      alert('오프라인 상태입니다. 인터넷 연결을 확인해주세요.');
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

      alert('동기화 완료!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('동기화 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isOnline]);

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

  return {
    syncMode,
    isSyncing,
    lastSyncedAt,
    needsSync,
    isOnline,
    changeSyncMode,
    performSync,
    restoreFromServer,
  };
}
