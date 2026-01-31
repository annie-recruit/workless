'use client';

import { useState, useEffect, useRef } from 'react';
import ProcessingLoader from './ProcessingLoader';
import PixelIcon from './PixelIcon';

interface DocxViewerProps {
  url: string;
  onLoadSuccess: () => void;
  onLoadError: (error: Error) => void;
}

export default function DocxViewer({
  url,
  onLoadSuccess,
  onLoadError,
}: DocxViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 기존 타임아웃 클리어
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (typeof window === 'undefined' || !url) {
      setIsLoading(false);
      setLoadError('URL이 제공되지 않았습니다');
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    // 타임아웃 설정 (15초)
    const timeoutId = setTimeout(() => {
      console.error('DOCX load timeout after 15 seconds');
      setLoadError('DOCX 로딩 시간이 초과되었습니다. 파일이 손상되었거나 너무 클 수 있습니다.');
      setIsLoading(false);
      onLoadError(new Error('DOCX load timeout'));
    }, 15000);
    
    timeoutRef.current = timeoutId;

    const loadDocx = async () => {
      try {
        // mammoth를 동적으로 import
        const mammoth = (await import('mammoth')).default;

        // URL에서 파일 가져오기
        let absoluteUrl = url;
        if (url.startsWith('blob:') || url.startsWith('data:')) {
          absoluteUrl = url;
        } else if (url.startsWith('/')) {
          absoluteUrl = `${window.location.origin}${url}`;
        } else if (url.includes('uploads/')) {
          const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
          absoluteUrl = `${window.location.origin}${normalizedUrl}`;
        } else {
          absoluteUrl = `${window.location.origin}/${url}`;
        }

        console.log('Loading DOCX from:', absoluteUrl);

        // 파일 fetch
        const response = await fetch(absoluteUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch DOCX: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log('DOCX file size:', arrayBuffer.byteLength, 'bytes');

        // mammoth로 HTML 변환
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;
        const messages = result.messages;

        if (messages.length > 0) {
          console.warn('DOCX conversion messages:', messages);
        }

        console.log('DOCX converted to HTML, length:', html.length);
        setHtmlContent(html);
        setIsLoading(false);
        setLoadError(null);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        onLoadSuccess();
      } catch (error) {
        console.error('Error loading DOCX:', error);
        setLoadError('DOCX 파일을 읽을 수 없습니다. 파일이 손상되었거나 지원되지 않는 형식일 수 있습니다.');
        setIsLoading(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        onLoadError(error as Error);
      }
    };

    loadDocx();

    // cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [url, onLoadSuccess, onLoadError]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <ProcessingLoader size={32} variant="panel" tone="indigo" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="mb-4 opacity-50">
          <PixelIcon name="warning" size={48} className="text-purple-500" />
        </div>
        <p className="text-purple-600 text-sm mb-2 font-medium">DOCX를 불러올 수 없습니다</p>
        <p className="text-rose-500 text-xs mb-4">{loadError}</p>
        <div className="flex gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-4 py-2 text-sm bg-gradient-to-r from-purple-300 to-pink-300 hover:from-purple-400 hover:to-pink-400 text-purple-800 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
          >
            새 탭에서 열기
          </a>
          <a
            href={url}
            download
            onClick={(e) => e.stopPropagation()}
            className="px-4 py-2 text-sm bg-gradient-to-r from-purple-300 to-pink-300 hover:from-purple-400 hover:to-pink-400 text-purple-800 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
          >
            다운로드
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto p-2 bg-transparent">
      <div
        className="w-full max-w-none prose prose-slate prose-headings:font-semibold prose-p:text-slate-700 prose-a:text-purple-600 prose-strong:text-slate-900 prose-headings:text-purple-800"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: '1.6',
        }}
      />
    </div>
  );
}
