'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ViewerSource, ViewerBlockConfig } from '@/types';
import { useViewer } from './ViewerContext';
import PixelIcon from './PixelIcon';
import ProcessingLoader from './ProcessingLoader';
import ViewerFrame from './ViewerFrame';

// PdfViewer를 동적으로 import (SSR 방지)
const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });
// DocxViewer를 동적으로 import (SSR 방지)
const DocxViewer = dynamic(() => import('./DocxViewer'), { ssr: false });

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
  width = 800,
  height = 600,
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
  const [textContent, setTextContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // props의 config가 변경되었을 때 로컬 state 동기화
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

  const historyIndexRef = useRef(historyIndex);
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const updateSource = useCallback((source: ViewerSource) => {
    setCurrentSource(source);
    setState('loading');
    setError(null);

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

  const prevConfigRef = useRef<ViewerBlockConfig>(config);
  useEffect(() => {
    const newConfig: ViewerBlockConfig = {
      currentSource: currentSource || undefined,
      history,
      historyIndex,
    };

    const prevConfig = prevConfigRef.current;
    const hasChanged =
      JSON.stringify(prevConfig.currentSource) !== JSON.stringify(newConfig.currentSource) ||
      JSON.stringify(prevConfig.history) !== JSON.stringify(newConfig.history) ||
      prevConfig.historyIndex !== newConfig.historyIndex;

    if (hasChanged) {
      prevConfigRef.current = newConfig;
      onUpdate(blockId, { config: newConfig });
    }
  }, [currentSource, history, historyIndex, blockId, onUpdate]);

  const handleImageLoad = useCallback(() => {
    setState('loaded');
    setError(null);
  }, []);

  const handleImageError = useCallback(() => {
    setState('error');
    setError('이미지를 불러올 수 없습니다');
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setPdfNumPages(numPages);
    setPdfPage(1);
    setState('loaded');
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('ViewerBlock: PDF load error:', error);
    setState('error');
    setError('PDF를 불러올 수 없습니다');
  }, []);

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

  useEffect(() => {
    if (currentSource) {
      const isImage = currentSource.kind === 'file' && currentSource.mimeType?.startsWith('image/');
      const isPdf = currentSource.kind === 'file' && currentSource.mimeType === 'application/pdf';
      const isDocx = currentSource.kind === 'file' && (
        currentSource.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        currentSource.mimeType === 'application/msword' ||
        currentSource.fileName?.toLowerCase().endsWith('.docx') ||
        currentSource.fileName?.toLowerCase().endsWith('.doc')
      );
      const isPptx = currentSource.kind === 'file' && (
        currentSource.mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        currentSource.mimeType === 'application/vnd.ms-powerpoint' ||
        currentSource.fileName?.toLowerCase().endsWith('.pptx') ||
        currentSource.fileName?.toLowerCase().endsWith('.ppt')
      );
      const isXlsx = currentSource.kind === 'file' && (
        currentSource.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        currentSource.mimeType === 'application/vnd.ms-excel' ||
        currentSource.fileName?.toLowerCase().endsWith('.xlsx') ||
        currentSource.fileName?.toLowerCase().endsWith('.xls')
      );
      const isText = currentSource.kind === 'file' && (
        currentSource.mimeType === 'text/plain' ||
        currentSource.mimeType === 'text/markdown' ||
        currentSource.fileName?.toLowerCase().endsWith('.txt') ||
        currentSource.fileName?.toLowerCase().endsWith('.md')
      );

      if (isImage || isPdf || isDocx || isPptx || isXlsx || isText) {
        setState('loading');
        setError(null);
        if (isPdf) {
          setPdfPage(1);
          setPdfNumPages(0);
        }
      } else if (currentSource.kind === 'url') {
        setState('loaded');
      }
    } else {
      setState('empty');
    }
  }, [currentSource]);

  const isImage = currentSource?.kind === 'file' && currentSource.mimeType?.startsWith('image/');
  const isPdf = currentSource?.kind === 'file' && currentSource.mimeType === 'application/pdf';
  const isDocx = currentSource?.kind === 'file' && (
    currentSource.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    currentSource.mimeType === 'application/msword' ||
    currentSource.fileName?.toLowerCase().endsWith('.docx') ||
    currentSource.fileName?.toLowerCase().endsWith('.doc')
  );

  const isPptx = currentSource?.kind === 'file' && (
    currentSource.mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    currentSource.mimeType === 'application/vnd.ms-powerpoint' ||
    currentSource.fileName?.toLowerCase().endsWith('.pptx') ||
    currentSource.fileName?.toLowerCase().endsWith('.ppt')
  );

  const isXlsx = currentSource?.kind === 'file' && (
    currentSource.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    currentSource.mimeType === 'application/vnd.ms-excel' ||
    currentSource.fileName?.toLowerCase().endsWith('.xlsx') ||
    currentSource.fileName?.toLowerCase().endsWith('.xls')
  );

  const isText = currentSource?.kind === 'file' && (
    currentSource.mimeType === 'text/plain' ||
    currentSource.mimeType === 'text/markdown' ||
    currentSource.fileName?.toLowerCase().endsWith('.txt') ||
    currentSource.fileName?.toLowerCase().endsWith('.md')
  );

  useEffect(() => {
    if (isText && currentSource?.url) {
      fetch(currentSource.url)
        .then(res => res.text())
        .then(text => {
          setTextContent(text);
          setState('loaded');
        })
        .catch(err => {
          console.error('Text load error:', err);
          setState('error');
          setError('텍스트 파일을 읽을 수 없습니다');
        });
    } else {
      setTextContent(null);
    }
  }, [isText, currentSource?.url]);

  const isOfficeFile = isDocx || isPptx || isXlsx;

  // 윈도우 타이틀 결정
  const windowTitle = currentSource
    ? (currentSource.kind === 'file' ? currentSource.fileName : currentSource.title)
    : 'New Viewer';

  // 실제 콘텐츠 렌더링 너비 계산 (프레임 테두리와 패딩 고려)
  const contentWidth = width - 8; // 테두리 4px * 2

  return (
    <div
      data-viewer-block={blockId}
      className="absolute select-none"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: zIndex,
        opacity: isDragging ? 0.85 : 1,
        transition: 'none',
        willChange: isDragging ? 'transform' : 'auto',
        pointerEvents: isDragging ? 'none' : 'auto',
      }}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation(); // 캔버스 클릭 이벤트로 전파 방지
        setActiveViewerId(blockId);
        onClick?.();
      }}
      onPaste={handlePaste}
    >
      <ViewerFrame
        title={windowTitle}
        onClose={() => onDelete(blockId)}
        className="w-full h-full shadow-2xl"
      >
        <div className="w-full h-full overflow-auto bg-gray-50 flex flex-col">
          {state === 'empty' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-6 opacity-30">
                <PixelIcon name="viewer" size={80} className="text-black" />
              </div>
              <p className="text-black font-bold text-base mb-2">Drop file / Paste URL</p>
              <p className="text-gray-500 text-xs mb-6">이미지, PDF, DOCX 파일을 여기에 드롭하세요</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-6 py-2.5 text-sm bg-black text-white hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-none font-bold"
              >
                파일 선택하기
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

          {state === 'loading' && currentSource && !isImage && !isPdf && !isOfficeFile && !isText && (
            <div className="flex-1 flex items-center justify-center relative">
              <ProcessingLoader size={32} tone="indigo" />
            </div>
          )}

          {state === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-red-50">
              <div className="mb-4 text-red-500">
                <PixelIcon name="warning" size={48} />
              </div>
              <p className="text-red-600 font-bold mb-4">{error || 'Preview not available'}</p>
              {currentSource && (
                <div className="flex gap-3">
                  <a
                    href={currentSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs font-bold border-2 border-black bg-white hover:bg-gray-100"
                  >
                    새 창에서 열기
                  </a>
                </div>
              )}
            </div>
          )}

          {(state === 'loaded' || state === 'loading') && currentSource && (
            <div className="flex-1 w-full h-full relative">
              {/* 로딩 오버레이 (이미지나 PDF 등이 로드될 때까지 표시) */}
              {state === 'loading' && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                  <ProcessingLoader size={32} tone="indigo" />
                </div>
              )}

              {isImage && (
                <div className="w-full h-full flex items-center justify-center bg-black/5 p-2">
                  <img
                    src={currentSource.url}
                    alt={currentSource.fileName}
                    className="max-w-full max-h-full object-contain shadow-sm"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                </div>
              )}
              {isPdf && (
                <PdfViewer
                  url={currentSource.url}
                  page={pdfPage}
                  numPages={pdfNumPages}
                  width={contentWidth}
                  zoom={zoom}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  onPageChange={(newPage) => setPdfPage(newPage)}
                />
              )}
              {isDocx && (
                currentSource.url.toLowerCase().endsWith('.docx') ? (
                  <DocxViewer
                    url={currentSource.url}
                    onLoadSuccess={() => setState('loaded')}
                    onLoadError={onDocumentLoadError}
                  />
                ) : (
                  <div className="w-full h-full">
                    <iframe
                      src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
                        currentSource.url.startsWith('http') 
                          ? currentSource.url 
                          : `${window.location.origin}${currentSource.url.startsWith('/') ? '' : '/'}${currentSource.url}`
                      )}`}
                      className="w-full h-full border-none"
                      onLoad={() => setState('loaded')}
                      onError={() => {
                        setState('error');
                        setError('문서를 불러올 수 없습니다. 외부에서 접근 가능한 URL이 아닐 수 있습니다.');
                      }}
                    />
                  </div>
                )
              )}
              {isText && textContent !== null && (
                <div className="w-full h-full p-4 overflow-auto whitespace-pre-wrap font-mono text-xs text-gray-800 bg-white">
                  {textContent}
                </div>
              )}
              {(isPptx || isXlsx) && (
                <div className="w-full h-full">
                  <iframe
                    src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
                      currentSource.url.startsWith('http') 
                        ? currentSource.url 
                        : `${window.location.origin}${currentSource.url.startsWith('/') ? '' : '/'}${currentSource.url}`
                    )}`}
                    className="w-full h-full border-none"
                    onLoad={() => setState('loaded')}
                    onError={() => {
                      setState('error');
                      setError('문서를 불러올 수 없습니다. 외부에서 접근 가능한 URL이 아닐 수 있습니다.');
                    }}
                  />
                </div>
              )}
              {currentSource.kind === 'url' && (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center h-full">
                  <div className="mb-6 opacity-40">
                    <PixelIcon name="link" size={64} className="text-indigo-600" />
                  </div>
                  <h3 className="text-black font-bold text-lg mb-2 truncate max-w-full px-4">
                    {currentSource.title || '외부 링크'}
                  </h3>
                  <p className="text-gray-500 text-xs mb-8 break-all max-w-sm px-4">
                    {currentSource.url}
                  </p>
                  <a
                    href={currentSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-3 bg-indigo-600 text-white font-bold text-sm shadow-[4px_4px_0px_0px_rgba(79,70,229,0.3)] hover:bg-indigo-700 active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    사이트 방문하기
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </ViewerFrame>
    </div>
  );
}
