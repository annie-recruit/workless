'use client';

import React, { useState, useEffect } from 'react';
import ProcessingLoader from '@/components/ProcessingLoader';

interface ViewerFrameProps {
  children?: React.ReactNode;
  src?: string; // override 가능한 이미지 경로
  className?: string;
  style?: React.CSSProperties;
}

/**
 * PixelLab로 생성된 뷰어 프레임 이미지를 사용하는 컴포넌트
 * manifest.json에서 에셋 경로를 자동으로 로드합니다.
 */
export default function ViewerFrame({ 
  children, 
  src: overrideSrc,
  className = '',
  style = {}
}: ViewerFrameProps) {
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // override src가 있으면 우선 사용
    if (overrideSrc) {
      setFrameSrc(overrideSrc);
      setLoading(false);
      return;
    }

    // manifest.json에서 viewer_frame 경로 로드
    const loadManifest = async () => {
      try {
        const response = await fetch('/assets/generated/manifest.json');
        if (!response.ok) {
          console.warn('[ViewerFrame] manifest.json을 찾을 수 없습니다.');
          setLoading(false);
          return;
        }

        const manifest = await response.json();
        const framePath = manifest.viewer_frame;
        
        if (framePath) {
          setFrameSrc(framePath);
        } else {
          console.warn('[ViewerFrame] manifest.json에 viewer_frame이 없습니다.');
        }
      } catch (error) {
        console.error('[ViewerFrame] manifest.json 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadManifest();
  }, [overrideSrc]);

  if (loading) {
    return (
      <div className={`relative ${className}`} style={style}>
        <div className="absolute inset-0 flex items-center justify-center">
          <ProcessingLoader variant="panel" tone="indigo" label="로딩 중..." />
        </div>
        {children}
      </div>
    );
  }

  if (!frameSrc) {
    // 프레임 이미지가 없으면 children만 렌더링
    return (
      <div className={`relative ${className}`} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={style}>
      {/* 프레임 이미지 (배경) */}
      <img
        src={frameSrc}
        alt="Viewer Frame"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* 내부 콘텐츠 영역 (padding으로 여백 확보) */}
      <div className="relative z-10 p-4 h-full">
        {children}
      </div>
    </div>
  );
}
