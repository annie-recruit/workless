/**
 * 데이터 Export/Import 훅
 */

import { useCallback } from 'react';
import { saveAs } from 'file-saver';
import { localDB } from '@/lib/localDB';

export function useLocalExport(userId: string) {
  // 데이터 내보내기 (JSON)
  const exportData = useCallback(async () => {
    try {
      const data = await localDB.exportAll();
      
      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json' }
      );

      const filename = `workless-backup-${new Date().toISOString().split('T')[0]}.json`;
      saveAs(blob, filename);

      console.log('Data exported:', filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('내보내기 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  }, []);

  // 데이터 가져오기 (JSON)
  const importData = useCallback(async (file: File, merge: boolean = false) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!merge) {
        const confirmed = confirm(
          '기존 데이터를 모두 삭제하고 복원하시겠습니까?\n' +
          '(취소를 누르면 기존 데이터와 병합됩니다)'
        );
        if (!confirmed) {
          merge = true;
        }
      }

      await localDB.importAll(data, merge);
      
      alert('데이터가 복원되었습니다!');
      window.location.reload(); // 페이지 새로고침
    } catch (error) {
      console.error('Import failed:', error);
      alert('가져오기 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  }, []);

  // 통계 조회
  const getStats = useCallback(async () => {
    return await localDB.getStats(userId);
  }, [userId]);

  return {
    exportData,
    importData,
    getStats,
  };
}
