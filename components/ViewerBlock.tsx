'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ViewerSource, ViewerBlockConfig } from '@/types';
import { useViewer } from './ViewerContext';

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
  height = 400,
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
  const [pinned, setPinned] = useState(config.pinned || false);
  const [state, setState] = useState<ViewerState>(currentSource ? 'loading' : 'empty');
  const [error, setError] = useState<string | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    if (config.pinned !== undefined && config.pinned !== pinned) {
      setPinned(config.pinned || false);
    }
  }, [config.currentSource, config.history, config.historyIndex, config.pinned]);

  // Viewer 등록/해제
  const pinnedRef = useRef(pinned);
  const historyIndexRef = useRef(historyIndex);
  
  // ref 동기화
  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);
  
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);
  
  const updateSource = useCallback((source: ViewerSource) => {
    if (pinnedRef.current) {
      console.log('Viewer is pinned, ignoring source update');
      return; // Pin 상태면 무시
    }
    
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
      pinned,
    };
    
    // 이전 config와 비교하여 실제로 변경되었을 때만 업데이트
    const prevConfig = prevConfigRef.current;
    const hasChanged = 
      JSON.stringify(prevConfig.currentSource) !== JSON.stringify(newConfig.currentSource) ||
      JSON.stringify(prevConfig.history) !== JSON.stringify(newConfig.history) ||
      prevConfig.historyIndex !== newConfig.historyIndex ||
      prevConfig.pinned !== newConfig.pinned;
    
    if (hasChanged) {
      prevConfigRef.current = newConfig;
      onUpdate(blockId, { config: newConfig });
    }
  }, [currentSource, history, historyIndex, pinned, blockId, onUpdate]);

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

  // 히스토리 네비게이션
  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentSource(history[newIndex]);
      setState('loading');
    }
  }, [history, historyIndex]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentSource(history[newIndex]);
      setState('loading');
    }
  }, [history, historyIndex]);

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

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const displayTitle = currentSource?.kind === 'file' 
    ? currentSource.fileName 
    : currentSource?.kind === 'url' 
    ? currentSource.title || new URL(currentSource.url).hostname
    : 'Viewer';

  return (
    <div
      data-viewer-block={blockId}
      className="absolute bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100 rounded-2xl shadow-2xl border-4 border-purple-200 overflow-hidden"
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
      }}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        setActiveViewerId(blockId);
        onClick?.();
      }}
      onPaste={handlePaste}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-200/80 via-pink-200/80 to-rose-200/80 border-b border-purple-300/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">📺</span>
            <span className="text-sm font-semibold text-purple-700">Viewer</span>
          </div>
          {currentSource && (
            <>
              <div className="h-4 w-px bg-purple-300/50" />
              <span className="text-xs text-purple-600 truncate" title={displayTitle}>
                {displayTitle}
              </span>
            </>
          )}
          {pinned && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-400/30 text-purple-700 rounded-full border border-purple-400/50">
              Pinned
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPinned(!pinned);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              pinned 
                ? 'bg-purple-400/30 text-purple-700 hover:bg-purple-400/40' 
                : 'text-purple-500 hover:text-purple-600 hover:bg-purple-200/50'
            }`}
            title={pinned ? 'Pin 해제' : 'Pin 고정'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(blockId);
            }}
            className="p-1.5 rounded-lg text-purple-500 hover:text-rose-500 hover:bg-rose-200/50 transition-colors"
            title="닫기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="relative bg-white/50 h-[calc(100%-120px)] overflow-auto">
        {state === 'empty' && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="mb-4 text-6xl opacity-50">📺</div>
            <p className="text-purple-600 text-sm mb-2 font-medium">Drop file / paste URL to preview</p>
            <p className="text-purple-500 text-xs mb-4">이미지, PDF 또는 DOCX 파일을 드롭하거나 URL을 붙여넣으세요</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 text-sm bg-gradient-to-r from-purple-300 to-pink-300 hover:from-purple-400 hover:to-pink-400 text-purple-800 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
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
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                    <p className="text-purple-600 text-sm font-medium">로딩 중...</p>
                  </div>
                </div>
              </>
            ) : isPdf ? (
              // PDF는 로딩 중에도 렌더링 시작 (onLoadSuccess에서 상태 변경)
              <PdfViewer
                key={currentSource.url}
                url={currentSource.url}
                page={pdfPage}
                numPages={pdfNumPages}
                width={Math.min(width - 40, 800)}
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
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-purple-600 text-sm font-medium">로딩 중...</p>
              </div>
            )}
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="mb-4 text-5xl opacity-50">⚠️</div>
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
          <div className="h-full flex items-center justify-center p-4">
            {isImage && (
              <img
                src={currentSource.url}
                alt={currentSource.fileName}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="max-w-full max-h-full object-contain"
                  style={{ imageRendering: 'auto' as const }}
              />
            )}
            {isPdf && (
              <PdfViewer
                url={currentSource.url}
                page={pdfPage}
                numPages={pdfNumPages}
                width={Math.min(width - 40, 800)}
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
                <div className="mb-4 text-5xl opacity-50">🔗</div>
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

      {/* 하단 컨트롤바 (리모컨 느낌) */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-r from-purple-200/80 via-pink-200/80 to-rose-200/80 border-t border-purple-300/50 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              goBack();
            }}
            disabled={!canGoBack}
            className="p-2 rounded-lg bg-purple-300/60 hover:bg-purple-400/70 disabled:opacity-50 disabled:cursor-not-allowed text-purple-700 transition-colors shadow-sm hover:shadow-md"
            title="이전"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goForward();
            }}
            disabled={!canGoForward}
            className="p-2 rounded-lg bg-purple-300/60 hover:bg-purple-400/70 disabled:opacity-50 disabled:cursor-not-allowed text-purple-700 transition-colors shadow-sm hover:shadow-md"
            title="다음"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {currentSource && (
            <>
              <a
                href={currentSource.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg bg-purple-300/60 hover:bg-purple-400/70 text-purple-700 transition-colors shadow-sm hover:shadow-md"
                title="새 탭에서 열기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <a
                href={currentSource.url}
                download={currentSource.kind === 'file' ? currentSource.fileName : undefined}
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg bg-purple-300/60 hover:bg-purple-400/70 text-purple-700 transition-colors shadow-sm hover:shadow-md"
                title="다운로드"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
