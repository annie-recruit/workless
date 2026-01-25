'use client';

import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { ViewerSource, ViewerBlockConfig } from '@/types';
import { useViewer } from './ViewerContext';
import PixelIcon from './PixelIcon';
import ProcessingLoader from './ProcessingLoader';

// 기본 모니터 프레임: public 아래(ASCII 파일명)로 고정
// (리눅스/도커 빌드에서 유니코드 파일명 정적 import가 깨질 수 있어서 URL 참조로 처리)
const DEFAULT_VIEWER_FRAME_SRC = '/assets/generated/monitor_frame.png';

// 모니터 프레임 기준 "파란 스크린" 영역(비율)
// 이걸로써봐라.png (455x333)에서 블루 픽셀 bbox를 잡고,
// 테두리/장식이 가려지지 않도록 약간 inset한 값입니다.
const VIEWER_SCREEN_PCT = {
  // raw bbox pct (before inset): left 0.1033, top 0.1231, width 0.7956, height 0.5706
  left: 0.1033,
  top: 0.1231,
  width: 0.7956,
  height: 0.5706,
};

// PdfViewer를 동적으로 import (SSR 방지)
const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });
// DocxViewer를 동적으로 import (SSR 방지)
const DocxViewer = dynamic(() => import('./DocxViewer'), { ssr: false });

// PDF.js 관련 import를 클라이언트 사이드에서만 동적으로 로드
let Document: any = null;
let Page: any = null;
let pdfjs: any = null;

if (typeof window !== 'undefined') {
  import('react-pdf').then((mod) => {
    Document = mod.Document;
    Page = mod.Page;
    pdfjs = mod.pdfjs;
    
    // PDF.js worker 설정
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    }
  });
}

interface ViewerBlockProps {
  blockId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  /** 보드 줌(글자 선명도 보정용) */
  zoom?: number;
  config: ViewerBlockConfig;
  onUpdate: (blockId: string, updates: Partial<{ x: number; y: number; config: ViewerBlockConfig }>) => void;
  onDelete: (blockId: string) => void;
  isDragging: boolean;
  isClicked: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick?: () => void;
  zIndex?: number;
}

type ViewerState = 'empty' | 'loading' | 'loaded' | 'error';

export default function ViewerBlock({
  blockId,
  x,
  y,
  width = 600,
  // 기본 프레임(455x333) 비율에 맞춰 기본값을 잡아, 첫 렌더에서 테두리가 덜 잘리게
  height = 439,
  zoom = 1,
  config,
  onUpdate,
  onDelete,
  isDragging,
  isClicked,
  onPointerDown,
  onClick,
  zIndex = 10,
}: ViewerBlockProps) {
  const { registerViewer, unregisterViewer, setActiveViewerId } = useViewer();
  const [currentSource, setCurrentSource] = useState<ViewerSource | null>(config.currentSource || null);
  const [history, setHistory] = useState<ViewerSource[]>(config.history || []);
  const [historyIndex, setHistoryIndex] = useState(config.historyIndex ?? -1);
  const [state, setState] = useState<ViewerState>(currentSource ? 'loading' : 'empty');
  const [error, setError] = useState<string | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [frameImageFailed, setFrameImageFailed] = useState(false);
  
  // props의 config가 변경되었을 때 로컬 state 동기화 (외부에서 config를 변경한 경우)
  useEffect(() => {
    if (config.currentSource !== undefined && JSON.stringify(config.currentSource) !== JSON.stringify(currentSource)) {
      setCurrentSource(config.currentSource || null);
    }
    if (config.history !== undefined && JSON.stringify(config.history) !== JSON.stringify(history)) {
      setHistory(config.history || []);
    }
    if (config.historyIndex !== undefined && config.historyIndex !== historyIndex) {
      setHistoryIndex(config.historyIndex ?? -1);
    }
  }, [config.currentSource, config.history, config.historyIndex]);

  // Viewer 등록/해제
  const historyIndexRef = useRef(historyIndex);
  
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);
  
  const updateSource = useCallback((source: ViewerSource) => {
    console.log('ViewerBlock: updateSource called with:', source);
    setCurrentSource(source);
    setState('loading');
    setError(null);
    
    // 히스토리에 추가
    setHistory(prev => {
      const currentIndex = historyIndexRef.current;
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(source);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, []);
  
  useEffect(() => {
    registerViewer(blockId, updateSource);
    return () => unregisterViewer(blockId);
  }, [blockId, registerViewer, unregisterViewer, updateSource]);

  // config 업데이트 (실제 변경이 있을 때만)
  const prevConfigRef = useRef<ViewerBlockConfig>(config);
  useEffect(() => {
    const newConfig: ViewerBlockConfig = {
      currentSource: currentSource || undefined,
      history,
      historyIndex,
      // PixelLab 이미지도 유지 (외부에서 업데이트된 경우)
      pixelArtFrame: config.pixelArtFrame,
      pixelArtBackground: config.pixelArtBackground,
    };
    
    // 이전 config와 비교하여 실제로 변경되었을 때만 업데이트
    const prevConfig = prevConfigRef.current;
    const hasChanged = 
      JSON.stringify(prevConfig.currentSource) !== JSON.stringify(newConfig.currentSource) ||
      JSON.stringify(prevConfig.history) !== JSON.stringify(newConfig.history) ||
      prevConfig.historyIndex !== newConfig.historyIndex ||
      prevConfig.pixelArtFrame !== newConfig.pixelArtFrame ||
      prevConfig.pixelArtBackground !== newConfig.pixelArtBackground;
    
    if (hasChanged) {
      prevConfigRef.current = newConfig;
      onUpdate(blockId, { config: newConfig });
    }
  }, [currentSource, history, historyIndex, config.pixelArtFrame, config.pixelArtBackground, blockId, onUpdate]);

  // 이미지 로드
  const handleImageLoad = useCallback(() => {
    console.log('Image loaded successfully');
    setState('loaded');
    setError(null);
  }, []);

  const handleImageError = useCallback(() => {
    console.error('Image load error');
    setState('error');
    setError('이미지를 불러올 수 없습니다');
  }, []);

  // PDF 로드
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('ViewerBlock: PDF loaded successfully, numPages:', numPages);
    setPdfNumPages(numPages);
    setPdfPage(1); // 첫 페이지로 리셋
    setState('loaded');
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('ViewerBlock: PDF load error:', error);
    setState('error');
    setError('PDF를 불러올 수 없습니다');
  }, []);

  // 파일 선택
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const source: ViewerSource = {
      kind: 'file',
      url,
      fileName: file.name,
      mimeType: file.type,
    };

    setCurrentSource(source);
    setState('loading');
    setHistory(prev => [...prev, source]);
    setHistoryIndex(prev => prev + 1);
  }, []);

  // URL 붙여넣기
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text || !text.startsWith('http')) return;

    try {
      const source: ViewerSource = {
        kind: 'url',
        url: text,
        title: new URL(text).hostname,
      };

      setCurrentSource(source);
      setState('loading');
      setHistory(prev => [...prev, source]);
      setHistoryIndex(prev => prev + 1);
    } catch (err) {
      console.error('Invalid URL:', err);
    }
  }, []);

  // 소스 변경 시 state 업데이트
  useEffect(() => {
    if (currentSource) {
      const isImage = currentSource.kind === 'file' && 
        currentSource.mimeType?.startsWith('image/');
      const isPdf = currentSource.kind === 'file' && 
        currentSource.mimeType === 'application/pdf';
      const isDocx = currentSource.kind === 'file' && 
        (currentSource.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
         currentSource.mimeType === 'application/msword' ||
         currentSource.fileName?.toLowerCase().endsWith('.docx') ||
         currentSource.fileName?.toLowerCase().endsWith('.doc'));
      
      if (isImage || isPdf || isDocx) {
        console.log('Source changed, setting state to loading:', { isImage, isPdf, isDocx, url: currentSource.url });
        setState('loading');
        setError(null);
        // PDF인 경우 페이지 리셋
        if (isPdf) {
          setPdfPage(1);
          setPdfNumPages(0);
        }
      } else if (currentSource.kind === 'url') {
        setState('loaded'); // URL은 바로 loaded로
      }
    } else {
      setState('empty');
    }
  }, [currentSource]);

  // 소스 타입 확인
  const isImage = currentSource?.kind === 'file' && 
    currentSource.mimeType?.startsWith('image/');
  const isPdf = currentSource?.kind === 'file' && 
    currentSource.mimeType === 'application/pdf';
  const isDocx = currentSource?.kind === 'file' && 
    (currentSource.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
     currentSource.mimeType === 'application/msword' ||
     currentSource.fileName?.toLowerCase().endsWith('.docx') ||
     currentSource.fileName?.toLowerCase().endsWith('.doc'));

  const frameSrc = config.pixelArtFrame || DEFAULT_VIEWER_FRAME_SRC;
  const screenStyle: CSSProperties = {
    left: `${VIEWER_SCREEN_PCT.left * 100}%`,
    top: `${VIEWER_SCREEN_PCT.top * 100}%`,
    width: `${VIEWER_SCREEN_PCT.width * 100}%`,
    height: `${VIEWER_SCREEN_PCT.height * 100}%`,
  };
  const screenWidthPx = Math.max(0, Math.floor(width * VIEWER_SCREEN_PCT.width));
  // 스크린을 최대한 채우도록 여백 최소화 (너무 큰 경우만 상한)
  const pdfRenderWidth = Math.min(Math.max(200, screenWidthPx - 1), 1600);

  const backgroundStyle = config.pixelArtBackground
    ? {
        backgroundImage: `url(${config.pixelArtBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {};

  return (
    <div
      data-viewer-block={blockId}
      // box-shadow는 요소의 "사각형 박스" 기준이라 투명 PNG에서 하얀/네모 헤일로처럼 보일 수 있음
      // 프레임 PNG 자체(알파)를 따르는 drop-shadow는 아래 <img>에 적용
      className="absolute"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: zIndex,
        opacity: isDragging ? 0.85 : 1,
        transition: 'none',
        willChange: isDragging ? 'transform' : 'auto',
        pointerEvents: isDragging ? 'none' : 'auto',
        contain: 'layout style paint',
        background: frameImageFailed ? 'linear-gradient(to bottom right, rgb(243, 232, 255), rgb(251, 207, 232), rgb(255, 228, 230))' : 'transparent',
        border: frameImageFailed ? '4px solid rgb(196, 181, 253)' : 'none',
      }}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        setActiveViewerId(blockId);
        onClick?.();
      }}
      onPaste={handlePaste}
    >
      <div className="relative w-full h-full">
        {/* 임시: 기존 헤더/푸터 제거. 닫기 버튼만 최소 오버레이로 유지 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(blockId);
          }}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-lg bg-white/45 hover:bg-white/65 text-black/70 hover:text-black/80 transition-colors shadow-sm border border-black/10 backdrop-blur-sm"
          title="닫기"
        >
          ×
        </button>

        {!frameImageFailed && (
          <img
            src={frameSrc}
            alt="Viewer Frame"
            // object-cover는 컨테이너 비율이 다르면 상/하가 잘릴 수 있음.
            // 프레임은 "전체가 보이는 게" 중요해서 fill로 맞춤(기본 비율은 위 height로 최대한 유지).
            className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none drop-shadow-2xl"
            // 안티앨리어싱으로 투명 가장자리가 하얗게 보이는(프린지) 현상을 줄이기 위해 pixelated 사용
            style={{ imageRendering: 'pixelated' as const }}
            draggable={false}
            onError={() => setFrameImageFailed(true)}
          />
        )}

        {/* 스크린(파란 액정) 영역 */}
        <div className="absolute" style={screenStyle}>
          <div className="relative w-full h-full overflow-hidden rounded-lg">
            {/* 본문 (헤더/푸터 없이 전체 높이 사용) */}
            <div
              className="relative w-full h-full overflow-auto"
              style={{
                backgroundColor: 'transparent',
                ...backgroundStyle,
              }}
            >
              {state === 'empty' && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="mb-4 opacity-50">
                    <PixelIcon name="viewer" size={64} className="text-black/60" />
                  </div>
                  <p className="text-black/80 text-sm mb-2 font-medium">Drop file / paste URL to preview</p>
                  <p className="text-black/70 text-xs mb-4">이미지, PDF 또는 DOCX 파일을 드롭하거나 URL을 붙여넣으세요</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 text-sm bg-white/50 hover:bg-white/60 text-black/80 rounded-lg transition-all shadow-md hover:shadow-lg font-medium border border-black/10"
                  >
                    파일 선택
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {state === 'loading' && currentSource && (
                <div className="flex items-center justify-center h-full relative">
                  {isImage ? (
                    // 이미지는 로딩 중에도 렌더링 시작 (onLoad/onError에서 상태 변경)
                    <>
                      <img
                        key={`${currentSource.url}-${Date.now()}`} // 강제 재로드
                        src={currentSource.url}
                        alt={currentSource.fileName}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        className="max-w-full max-h-full object-contain"
                        style={{ imageRendering: 'auto' as const }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                        <ProcessingLoader size={48} variant="overlay" tone="indigo" label="로딩 중..." />
                      </div>
                    </>
                  ) : isPdf ? (
                    // PDF는 로딩 중에도 렌더링 시작 (onLoadSuccess에서 상태 변경)
                    <PdfViewer
                      key={currentSource.url}
                      url={currentSource.url}
                      page={pdfPage}
                      numPages={pdfNumPages}
                      width={pdfRenderWidth}
                      zoom={zoom}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      onPageChange={(newPage) => setPdfPage(newPage)}
                    />
                  ) : isDocx ? (
                    // DOCX는 로딩 중에도 렌더링 시작 (onLoadSuccess에서 상태 변경)
                    <DocxViewer
                      key={currentSource.url}
                      url={currentSource.url}
                      onLoadSuccess={() => {
                        console.log('ViewerBlock: DOCX loaded successfully');
                        setState('loaded');
                        setError(null);
                      }}
                      onLoadError={onDocumentLoadError}
                    />
                  ) : (
                    <ProcessingLoader size={48} variant="overlay" tone="indigo" label="로딩 중..." />
                  )}
                </div>
              )}

              {state === 'error' && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="mb-4 opacity-50">
                    <PixelIcon name="warning" size={48} className="text-purple-500" />
                  </div>
                  <p className="text-purple-600 text-sm mb-4 font-medium">Preview not available</p>
                  {currentSource && (
                    <div className="flex gap-2">
                      <a
                        href={currentSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-purple-300 to-pink-300 hover:from-purple-400 hover:to-pink-400 text-purple-800 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        Open in new tab
                      </a>
                      <a
                        href={currentSource.url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-purple-300 to-pink-300 hover:from-purple-400 hover:to-pink-400 text-purple-800 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        Download
                      </a>
                    </div>
                  )}
                </div>
              )}

              {state === 'loaded' && currentSource && (
                <div className="h-full w-full">
                  {isImage && (
                    <img
                      src={currentSource.url}
                      alt={currentSource.fileName}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'auto' as const }}
                    />
                  )}
                  {isPdf && (
                    <PdfViewer
                      url={currentSource.url}
                      page={pdfPage}
                      numPages={pdfNumPages}
                      width={pdfRenderWidth}
                      zoom={zoom}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      onPageChange={(newPage) => setPdfPage(newPage)}
                    />
                  )}
                  {isDocx && (
                    <DocxViewer
                      url={currentSource.url}
                      onLoadSuccess={() => {
                        console.log('ViewerBlock: DOCX loaded successfully');
                        setState('loaded');
                        setError(null);
                      }}
                      onLoadError={onDocumentLoadError}
                    />
                  )}
                  {currentSource.kind === 'url' && (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <div className="mb-4 opacity-50">
                        <PixelIcon name="link" size={48} className="text-purple-500" />
                      </div>
                      <p className="text-purple-600 text-sm mb-2 font-medium">{currentSource.title || 'URL'}</p>
                      <p className="text-purple-500 text-xs mb-4 break-all">{currentSource.url}</p>
                      <a
                        href={currentSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-purple-300 to-pink-300 hover:from-purple-400 hover:to-pink-400 text-purple-800 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        Open in new tab
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
