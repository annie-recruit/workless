'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ViewerSource } from '@/types';

interface ViewerContextType {
  openInViewer: (source: ViewerSource, viewerId?: string) => void;
  registerViewer: (viewerId: string, updateSource: (source: ViewerSource) => void) => void;
  unregisterViewer: (viewerId: string) => void;
  viewerExists: boolean;
  activeViewerId: string | null;
  setActiveViewerId: (viewerId: string | null) => void;
}

const ViewerContext = createContext<ViewerContextType | undefined>(undefined);

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewers, setViewers] = useState<Map<string, (source: ViewerSource) => void>>(new Map());
  const [activeViewerId, setActiveViewerId] = useState<string | null>(null);

  const registerViewer = useCallback((viewerId: string, updateSource: (source: ViewerSource) => void) => {
    setViewers(prev => new Map(prev).set(viewerId, updateSource));
    // 첫 번째 Viewer가 등록되면 active로 설정
    setActiveViewerId(prev => prev || viewerId);
  }, []);

  const unregisterViewer = useCallback((viewerId: string) => {
    setViewers(prev => {
      const next = new Map(prev);
      next.delete(viewerId);
      
      // 삭제된 Viewer가 active였으면 다른 Viewer로 변경
      setActiveViewerId(currentActive => {
        if (currentActive === viewerId) {
          const remaining = Array.from(next.keys());
          return remaining[0] || null;
        }
        return currentActive;
      });
      
      return next;
    });
  }, []);

  const openInViewer = useCallback((source: ViewerSource, viewerId?: string) => {
    // 렌더링 중 상태 업데이트를 피하기 위해 직접 viewers Map 사용
    const targetId = viewerId || activeViewerId || Array.from(viewers.keys())[0];
    if (targetId) {
      const viewer = viewers.get(targetId);
      if (viewer) {
        console.log('ViewerContext: openInViewer called, target viewer:', targetId, 'source:', source);
        // 다음 틱에서 실행하여 렌더링 완료 후 상태 업데이트
        Promise.resolve().then(() => {
          viewer(source);
          setActiveViewerId(targetId);
        });
      } else {
        console.warn('ViewerContext: viewer not found:', targetId, 'available viewers:', Array.from(viewers.keys()));
      }
    } else {
      console.warn('ViewerContext: no viewer available');
    }
  }, [viewers, activeViewerId]);

  const viewerExists = viewers.size > 0;

  return (
    <ViewerContext.Provider value={{ 
      openInViewer, 
      registerViewer, 
      unregisterViewer,
      viewerExists,
      activeViewerId,
      setActiveViewerId,
    }}>
      {children}
    </ViewerContext.Provider>
  );
}

export function useViewer() {
  const context = useContext(ViewerContext);
  if (!context) {
    throw new Error('useViewer must be used within ViewerProvider');
  }
  return context;
}
