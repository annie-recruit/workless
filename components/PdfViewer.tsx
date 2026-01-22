'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PdfViewerProps {
  url: string;
  page: number;
  numPages: number;
  width: number;
  onLoadSuccess: (data: { numPages: number }) => void;
  onLoadError: (error: Error) => void;
  onPageChange: (page: number) => void;
}

export default function PdfViewer({
  url,
  page,
  numPages,
  width,
  onLoadSuccess,
  onLoadError,
  onPageChange,
}: PdfViewerProps) {
  const [Document, setDocument] = useState<any>(null);
  const [Page, setPage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingPdfRef = useRef(false);

  // options 메모이제이션 (모든 return 문보다 위에 있어야 함 - React 훅 규칙)
  const documentOptions = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.530/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.4.530/standard_fonts/',
    httpHeaders: {
      'Accept': 'application/pdf',
    },
    withCredentials: false,
    verbosity: 0, // 로그 레벨 낮춤
  }), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let isMounted = true;
    
    import('react-pdf').then((mod) => {
      if (!isMounted) return;
      
      setDocument(() => mod.Document);
      setPage(() => mod.Page);
      
      // PDF.js worker 설정
      const { pdfjs } = mod;
      // 실제 설치된 버전 사용
      const version = pdfjs.version || '5.4.530';
      
      // worker 파일 경로 (설치된 버전에 맞춤)
      // react-pdf 10.x는 pdfjs-dist 5.x와 함께 사용
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      
      console.log('PDF.js worker configured:', pdfjs.GlobalWorkerOptions.workerSrc);
      console.log('PDF.js version:', version);
      
      setIsLoading(false);
    }).catch((error) => {
      console.error('Failed to load react-pdf:', error);
      if (isMounted) {
        onLoadError(error);
        setIsLoading(false);
      }
    });
    
    return () => {
      isMounted = false;
    };
  }, []); // 의존성 배열 제거 (한 번만 실행)

  // PDF URL 처리 및 blob 변환 (CORS 문제 해결)
  // ⚠️ 중요: 이 useEffect는 모든 return 문보다 위에 있어야 함 (React 훅 규칙)
  useEffect(() => {
    // 기존 타임아웃 클리어
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (typeof window === 'undefined' || !url) {
      setPdfUrl(url || '');
      setIsLoadingPdf(false);
      setLoadError(null);
      return;
    }
    
    setIsLoadingPdf(true);
    setLoadError(null);
    isLoadingPdfRef.current = true;
    
    // 타임아웃 설정 (10초)
    timeoutRef.current = setTimeout(() => {
      if (isLoadingPdfRef.current) {
        console.error('PDF load timeout after 10 seconds');
        setLoadError('PDF 로딩 시간이 초과되었습니다. 파일이 손상되었거나 너무 클 수 있습니다.');
        setIsLoadingPdf(false);
        isLoadingPdfRef.current = false;
        onLoadError(new Error('PDF load timeout'));
      }
    }, 10000);
    
    const loadPdf = async () => {
      try {
        // 이미 blob URL이거나 data URL인 경우 그대로 사용
        if (url.startsWith('blob:') || url.startsWith('data:')) {
          setPdfUrl(url);
          // isLoadingPdf는 Document의 onLoadSuccess에서 false로 설정
          setLoadError(null);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          return;
        }
        
        // 절대 URL인 경우
        if (url.startsWith('http://') || url.startsWith('https://')) {
          // 외부 URL은 blob으로 변환하여 CORS 문제 해결 시도
          try {
            const response = await fetch(url, { mode: 'cors' });
            if (response.ok) {
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              setPdfUrl(blobUrl);
              // isLoadingPdf는 Document의 onLoadSuccess에서 false로 설정
              setLoadError(null);
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              return;
            }
          } catch (error) {
            console.warn('Failed to fetch PDF as blob, using direct URL:', error);
          }
          // blob 변환 실패 시 원본 URL 사용
          setPdfUrl(url);
          // isLoadingPdf는 Document의 onLoadSuccess에서 false로 설정
          setLoadError(null);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          return;
        }
        
        // 상대 경로인 경우 절대 URL로 변환
        let absoluteUrl = url;
        if (url.startsWith('/')) {
          absoluteUrl = `${window.location.origin}${url}`;
        } else if (url.includes('uploads/')) {
          const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
          absoluteUrl = `${window.location.origin}${normalizedUrl}`;
        } else {
          absoluteUrl = `${window.location.origin}/${url}`;
        }
        
        console.log('Loading PDF from:', absoluteUrl);
        
        // 로컬 파일은 blob으로 변환하여 CORS 문제 해결
        try {
          const response = await fetch(absoluteUrl, {
            headers: {
              'Accept': 'application/pdf',
            },
          });
          
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            console.log('PDF response content-type:', contentType);
            
            if (contentType && contentType.includes('application/pdf')) {
              const blob = await response.blob();
              console.log('PDF blob size:', blob.size, 'bytes');
              const blobUrl = URL.createObjectURL(blob);
              console.log('PDF blob URL created, setting pdfUrl:', blobUrl);
              setPdfUrl(blobUrl);
              // isLoadingPdf는 Document의 onLoadSuccess에서 false로 설정
              // 여기서는 false로 설정하지 않음 (Document가 파싱할 때까지 대기)
              setLoadError(null);
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              return;
            } else {
              console.warn('Response is not PDF:', contentType);
            }
          } else {
            console.error('Failed to fetch PDF:', response.status, response.statusText);
            setLoadError(`파일을 불러올 수 없습니다 (${response.status})`);
            onLoadError(new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`));
            setPdfUrl(absoluteUrl); // fallback으로 원본 URL 사용
            setIsLoadingPdf(false);
            isLoadingPdfRef.current = false;
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }
        } catch (error) {
          console.error('Error fetching PDF:', error);
          setLoadError('네트워크 오류가 발생했습니다');
          // fetch 실패 시 원본 URL 사용 (PDF.js가 직접 처리하도록)
          setPdfUrl(absoluteUrl);
          setIsLoadingPdf(false);
          isLoadingPdfRef.current = false;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
        setLoadError('PDF를 불러오는 중 오류가 발생했습니다');
        onLoadError(error as Error);
        setIsLoadingPdf(false);
        isLoadingPdfRef.current = false;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    };
    
    loadPdf();
    
    // cleanup: blob URL 해제 및 타임아웃 클리어
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [url, onLoadError]);

  // 라이브러리 로딩 체크 (useEffect 이후)
  if (isLoading || !Document || !Page) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mb-2"></div>
        <p className="text-purple-600 text-xs font-medium">PDF 라이브러리 로딩 중...</p>
      </div>
    );
  }
  
  // pdfUrl이 설정되면 Document 렌더링 시작 (Document의 loading prop이 로딩 상태 표시)
  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mb-2"></div>
        <p className="text-purple-600 text-xs font-medium">PDF 파일 로딩 중...</p>
        {loadError && (
          <p className="text-rose-500 text-xs mt-2">{loadError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center overflow-auto py-4">
      <Document
        file={pdfUrl}
        onLoadSuccess={(data: { numPages: number }) => {
          console.log('PDF Document loaded successfully:', data);
          setIsLoadingPdf(false);
          isLoadingPdfRef.current = false;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          onLoadSuccess(data);
        }}
        onLoadError={(error: Error) => {
          console.error('PDF Document load error:', error);
          console.error('PDF URL:', pdfUrl);
          console.error('Original URL:', url);
          setIsLoadingPdf(false);
          isLoadingPdfRef.current = false;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          setLoadError('PDF 파일을 읽을 수 없습니다. 파일이 손상되었거나 지원되지 않는 형식일 수 있습니다.');
          onLoadError(error);
        }}
        loading={
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mb-2"></div>
            <p className="text-purple-600 text-xs font-medium">PDF 파싱 중...</p>
          </div>
        }
        error={
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="mb-4 text-5xl opacity-50">⚠️</div>
            <p className="text-purple-600 text-sm mb-2 font-medium">PDF를 불러올 수 없습니다</p>
            {loadError && (
              <p className="text-rose-500 text-xs mb-2">{loadError}</p>
            )}
            <p className="text-purple-500 text-xs mb-4 break-all">{pdfUrl.substring(0, 100)}...</p>
            <div className="flex gap-2">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 text-sm bg-gradient-to-r from-purple-300 to-pink-300 hover:from-purple-400 hover:to-pink-400 text-purple-800 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
              >
                새 탭에서 열기
              </a>
              <a
                href={pdfUrl}
                download
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 text-sm bg-gradient-to-r from-purple-300 to-pink-300 hover:from-purple-400 hover:to-pink-400 text-purple-800 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
              >
                다운로드
              </a>
            </div>
          </div>
        }
        options={documentOptions}
      >
        {/* 모든 페이지 렌더링 */}
        {Array.from(new Array(numPages), (el, index) => (
          <Page
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-lg mb-4"
            onLoadError={(error: Error) => {
              console.error(`PDF Page ${index + 1} load error:`, error);
              onLoadError(error);
            }}
          />
        ))}
      </Document>
    </div>
  );
}
