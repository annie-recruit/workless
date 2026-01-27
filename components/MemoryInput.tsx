'use client';

import { useState, useRef, useEffect } from 'react';
import { Memory } from '@/types';
import PixelIcon from './PixelIcon';
import ProcessingLoader from './ProcessingLoader';

interface MemoryInputProps {
  onMemoryCreated: (memory?: Memory) => void;
}

export default function MemoryInput({ onMemoryCreated }: MemoryInputProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [isMentionPanelOpen, setIsMentionPanelOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [editorHeight, setEditorHeight] = useState(120);
  const [isResizing, setIsResizing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address?: string; accuracy?: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [connectionSuggestions, setConnectionSuggestions] = useState<Array<{ id: string; content: string; reason: string }>>([]);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<Set<string>>(new Set());
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [newMemoryId, setNewMemoryId] = useState<string | null>(null);
  const [newMemory, setNewMemory] = useState<Memory | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | null; message?: string }>({ type: null });
  const voiceRecorderRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const mentionRangeRef = useRef<Range | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 자식 요소로 이동할 때 false가 되지 않도록 체크
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  // 위치 정보 가져오기
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // 역지오코딩으로 주소 가져오기 (선택)
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            const address = data.display_name || `${data.address?.road || ''} ${data.address?.city || data.address?.town || ''}`.trim();

            setLocation({
              latitude,
              longitude,
              address: address || undefined,
              accuracy,
            });
          } catch (error) {
            // 역지오코딩 실패해도 위치 정보는 저장
            setLocation({
              latitude,
              longitude,
              accuracy,
            });
          }
        },
        (error: GeolocationPositionError) => {
          // GeolocationPositionError의 code와 message를 사용하여 더 자세한 에러 정보 제공
          let errorMessage = '위치 정보를 가져올 수 없습니다';

          if (error) {
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = '위치 정보 접근이 거부되었습니다';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = '위치 정보를 사용할 수 없습니다';
                break;
              case error.TIMEOUT:
                errorMessage = '위치 정보 요청 시간이 초과되었습니다';
                break;
              default:
                errorMessage = error.message || '위치 정보를 가져올 수 없습니다';
                break;
            }
            // 개발 중 디버깅을 위해서만 콘솔 경고 출력 (에러 오버레이 방지)
            if (process.env.NODE_ENV === 'development') {
              console.warn('위치 정보 가져오기 실패:', {
                code: error.code,
                message: error.message,
                error,
              });
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn('위치 정보 가져오기 실패: 알 수 없는 에러');
            }
          }

          setLocationError(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationError('이 브라우저는 위치 정보를 지원하지 않습니다');
    }
  }, []);

  // 리사이즈 핸들러
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newHeight = e.clientY - rect.top;
      if (newHeight >= 100 && newHeight <= 600) {
        setEditorHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const getEditorHtml = () => editorRef.current?.innerHTML || '';
  const getEditorText = () => (editorRef.current?.innerText || '').trim();

  const stripHtmlClient = (html: string) => {
    if (!html) return '';
    if (typeof document === 'undefined') {
      return html.replace(/<[^>]*>/g, '').trim();
    }
    // HTML 엔티티 디코딩
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const decoded = tempDiv.textContent || tempDiv.innerText || '';
    return decoded.replace(/<[^>]*>/g, '').trim();
  };

  const updateEditorHtml = (html: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
    setContent(html);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleTranscriptionComplete = (script: string, summary: string) => {
    // 노션 AI 회의록 스타일로 포맷팅
    const formattedContent = `# 회의록

## 회의 스크립트
${script}

---

${summary}`;

    const html = formattedContent.replace(/\n/g, '<br/>');
    const nextHtml = getEditorHtml()
      ? `${getEditorHtml()}<br/><br/>${html}`
      : html;

    updateEditorHtml(nextHtml);
    setIsRecording(false);
    setIsProcessing(false);
    setRecordingTime(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks: Blob[] = [];
      let timer: NodeJS.Timeout | null = null;
      let currentTime = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);

        stream.getTracks().forEach(track => track.stop());
        if (timer) clearInterval(timer);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      currentTime = 0;

      timer = setInterval(() => {
        currentTime++;
        setRecordingTime(currentTime);
      }, 1000);

      // 중지 함수 저장
      voiceRecorderRef.current = {
        start: () => { },
        stop: () => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setIsRecording(false);
            setIsProcessing(true);
            if (timer) clearInterval(timer);
          }
        }
      };
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      alert('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.script && data.summary) {
          handleTranscriptionComplete(data.script, data.summary);
        } else {
          alert('음성을 텍스트로 변환하지 못했습니다.');
          setIsProcessing(false);
        }
      } else {
        const error = await res.json();
        alert(error.error || '음성 변환 실패');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('음성 변환 실패:', error);
      alert('음성 변환 중 오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const execCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setContent(getEditorHtml());
    ensureSafeLinks();
  };

  const ensureSafeLinks = () => {
    if (!editorRef.current) return;
    editorRef.current.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.trim().toLowerCase().startsWith('javascript:')) {
        link.removeAttribute('href');
      }
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
  };

  const getRangeFromOffsets = (root: HTMLElement, start: number, end: number) => {
    const range = document.createRange();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let currentOffset = 0;
    let startNode: Text | null = null;
    let endNode: Text | null = null;
    let startOffset = 0;
    let endOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const nextOffset = currentOffset + (node.textContent?.length || 0);
      if (!startNode && start >= currentOffset && start <= nextOffset) {
        startNode = node;
        startOffset = start - currentOffset;
      }
      if (end >= currentOffset && end <= nextOffset) {
        endNode = node;
        endOffset = end - currentOffset;
        break;
      }
      currentOffset = nextOffset;
    }

    if (!startNode || !endNode) return null;
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  };

  const saveSelection = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    if (!editorRef.current.contains(selection.anchorNode)) {
      return;
    }

    mentionRangeRef.current = selection.getRangeAt(0).cloneRange();
  };

  const handleMentionTrigger = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    if (!editorRef.current.contains(selection.anchorNode)) {
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    range.selectNodeContents(editorRef.current);
    range.setEnd(selection.anchorNode as Node, selection.anchorOffset);
    const textBeforeCursor = range.toString();
    const lastAt = textBeforeCursor.lastIndexOf('@');
    if (lastAt === -1) {
      setIsMentionPanelOpen(false);
      setMentionSearch('');
      mentionRangeRef.current = null;
      return;
    }

    const query = textBeforeCursor.slice(lastAt + 1);
    if (query.includes(' ') || query.includes('\n')) {
      setIsMentionPanelOpen(false);
      setMentionSearch('');
      mentionRangeRef.current = null;
      return;
    }

    const mentionRange = getRangeFromOffsets(editorRef.current, lastAt, textBeforeCursor.length);
    if (!mentionRange) {
      setIsMentionPanelOpen(false);
      setMentionSearch('');
      mentionRangeRef.current = null;
      return;
    }

    mentionRangeRef.current = mentionRange;
    setMentionSearch(query);
    setIsMentionPanelOpen(true);
  };

  const insertMention = (memory: Memory) => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    // mentionRangeRef가 있으면 사용, 없으면 selection에서 가져오되 rangeCount 체크
    let range = mentionRangeRef.current;
    if (!range && selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }
    if (!range) return;
    range.deleteContents();

    const plainTitle = memory.title || stripHtmlClient(memory.content || '').slice(0, 24) || '기억';
    const mentionEl = document.createElement('a');
    mentionEl.textContent = `@${plainTitle}`; // @ 포함하여 텍스트로 표시
    mentionEl.setAttribute('data-memory-id', memory.id);
    mentionEl.setAttribute('href', `#memory-${memory.id}`);
    mentionEl.className = 'mention';

    const space = document.createTextNode(' ');
    range.insertNode(mentionEl);
    mentionEl.after(space);

    const currentSelection = window.getSelection();
    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.collapse(true);
    currentSelection?.removeAllRanges();
    currentSelection?.addRange(newRange);

    setMentionSearch('');
    setIsMentionPanelOpen(false);
    setContent(getEditorHtml());
  };

  const extractMentionIds = (html: string) => {
    const ids = new Set<string>();
    const regex = /data-memory-id="([^"]+)"/g;
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(html)) !== null) {
      ids.add(match[1]);
    }
    return Array.from(ids);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plainText = getEditorText();
    const htmlContent = getEditorHtml();
    if (!plainText) return;

    setLoading(true);
    setSuggestions([]);

    try {
      const formData = new FormData();
      if (title) {
        formData.append('title', title);
      }
      formData.append('content', htmlContent);
      formData.append('relatedMemoryIds', JSON.stringify(extractMentionIds(htmlContent)));

      // 위치 정보 추가
      if (location) {
        formData.append('location', JSON.stringify(location));
      }

      // 파일 추가
      files.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch('/api/memories', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setTitle('');
        updateEditorHtml('');
        setFiles([]);

        // 연결 제안이 있으면 토스트 표시
        if (data.connectionSuggestions && data.connectionSuggestions.length > 0) {
          setConnectionSuggestions(data.connectionSuggestions);
          setSelectedConnectionIds(new Set(data.connectionSuggestions.map((s: any) => s.id)));
          setNewMemoryId(data.memory.id);
          setNewMemory(data.memory);
          setShowConnectionModal(true);
        } else {
          // 성공 토스트 표시
          setToast({ type: 'success', message: '기억이 저장되었습니다!' });
          onMemoryCreated(data.memory);
          // 2초 후 토스트 닫기
          setTimeout(() => {
            setToast({ type: null });
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Failed to save memory:', error);
      alert('기억 저장에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const mentionMatches = isMentionPanelOpen
    ? memories
      .filter(m => stripHtmlClient(m.content || '').toLowerCase().includes(mentionSearch.toLowerCase()))
      .slice(0, 6)
    : [];

  return (
    <div className="w-full max-w-7xl mx-auto flex gap-6">
      {/* 왼쪽 가이드 사이드바 */}
      <div className="w-56 flex-shrink-0 space-y-4 text-xs text-gray-500 font-galmuri11 pt-2">
        {/* 위젯 기능 */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-gray-700 font-bold uppercase tracking-tight text-[10px] mb-3">
            <PixelIcon name="widgets" size={14} />
            위젯
          </h3>
          <div className="space-y-2 pl-1">
            <div className="flex items-start gap-2">
              <PixelIcon name="calendar" size={12} className="mt-0.5 flex-shrink-0" />
              <span className="leading-tight"><strong>캘린더:</strong> 날짜 기반 일정 관리</span>
            </div>
            <div className="flex items-start gap-2">
              <PixelIcon name="map" size={12} className="mt-0.5 flex-shrink-0" />
              <span className="leading-tight"><strong>미니맵:</strong> 보드 전체 뷰</span>
            </div>
            <div className="flex items-start gap-2">
              <PixelIcon name="file" size={12} className="mt-0.5 flex-shrink-0" />
              <span className="leading-tight"><strong>뷰어:</strong> PDF/이미지 표시</span>
            </div>
            <div className="flex items-start gap-2">
              <PixelIcon name="database" size={12} className="mt-0.5 flex-shrink-0" />
              <span className="leading-tight"><strong>데이터베이스:</strong> 테이블 뷰</span>
            </div>
            <div className="flex items-start gap-2">
              <PixelIcon name="microphone" size={12} className="mt-0.5 flex-shrink-0" />
              <span className="leading-tight"><strong>회의록:</strong> 실시간 녹음</span>
            </div>
          </div>
        </div>

        {/* 메모리 카드 기능 */}
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <h3 className="flex items-center gap-2 text-gray-700 font-bold uppercase tracking-tight text-[10px] mb-3">
            <PixelIcon name="card" size={14} />
            카드 기능
          </h3>
          <div className="space-y-2 pl-1">
            <div className="flex items-start gap-2">
              <PixelIcon name="link" size={12} className="mt-0.5 flex-shrink-0" />
              <span className="leading-tight">카드 연결로 관계 시각화</span>
            </div>
            <div className="flex items-start gap-2">
              <PixelIcon name="flag" size={12} className="mt-0.5 flex-shrink-0" />
              <span className="leading-tight">깃발로 북마크 저장</span>
            </div>
            <div className="flex items-start gap-2">
              <PixelIcon name="folder" size={12} className="mt-0.5 flex-shrink-0" />
              <span className="leading-tight">그룹으로 분류 정리</span>
            </div>
          </div>
        </div>
      </div>

      {/* 중앙 입력 폼 영역 */}
      <div className="flex-1">
        <form onSubmit={handleSubmit} className="space-y-4" data-tutorial-target="memory-input">
        {/* 제목 입력 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 (선택)"
          className="w-full px-3 py-1.5 text-sm font-medium border-b-2 border-gray-200 focus:outline-none focus:border-indigo-500 transition-colors mb-2"
        />

        <div
          ref={containerRef}
          className="relative"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div
            className={`w-full border transition-all flex flex-col ${isDragging
              ? 'border-indigo-500 bg-indigo-50 border-dashed'
              : 'border-gray-200 focus-within:border-indigo-500'
              }`}
            style={{ minHeight: `${editorHeight}px` }}
          >
            {/* 툴바 */}
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b-2 border-gray-200 bg-white/70">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCommand('bold')}
                className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-100 font-semibold"
                title="굵게"
              >
                B
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCommand('italic')}
                className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-100 italic"
                title="기울임"
              >
                I
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const url = prompt('링크 URL을 입력해주세요');
                  if (url) execCommand('createLink', url);
                }}
                className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-100"
                title="하이퍼링크"
              >
                <PixelIcon name="link" size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setIsMentionPanelOpen(!isMentionPanelOpen);
                }}
                className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-100"
                title="@태그"
              >
                @
              </button>
            </div>

            {/* 입력 영역 */}
            <div className="relative flex-1 flex flex-col">
              {!getEditorText() && !isEditorFocused && (
                <div className="absolute top-3 left-4 text-gray-400 pointer-events-none">
                  아무 말이나 입력하세요...
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable={!loading}
                className="flex-1 px-4 py-3 text-base outline-none overflow-y-auto"
                style={{ minHeight: `${editorHeight - 100}px` }}
                onInput={() => {
                  setContent(getEditorHtml());
                  saveSelection();
                  handleMentionTrigger();
                }}
                onKeyUp={() => {
                  saveSelection();
                  handleMentionTrigger();
                }}
                onClick={() => {
                  saveSelection();
                  handleMentionTrigger();
                }}
                onFocus={() => setIsEditorFocused(true)}
                onBlur={() => setIsEditorFocused(false)}
                suppressContentEditableWarning
              />

              {/* 하단 버튼 영역 */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                <div className="flex items-center gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.md,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
                    title="파일 첨부"
                  >
                    <PixelIcon name="attachment" size={16} />
                  </button>
                  {!isRecording && !isProcessing ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={loading}
                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
                      title="회의 녹음"
                    >
                      <PixelIcon name="microphone" size={16} />
                    </button>
                  ) : isRecording ? (
                    <button
                      type="button"
                      onClick={() => voiceRecorderRef.current?.stop()}
                      className="px-2 py-1 text-xs text-red-600 hover:text-red-900 hover:bg-red-100 rounded transition-colors flex items-center gap-1"
                      title="녹음 중지"
                    >
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                      {formatTime(recordingTime)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-2 py-1 text-xs text-gray-400 rounded flex items-center gap-1"
                    >
                      <ProcessingLoader size={14} variant="inline" tone="indigo" />
                    </button>
                  )}
                </div>

                {/* 저장 버튼 */}
                <button
                  type="submit"
                  disabled={loading || !content.trim()}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? '저장 중...' : '기억하기'}
                </button>
              </div>
            </div>

            {/* 리사이즈 핸들 */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
              className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-indigo-200/30 transition-colors flex items-center justify-center group"
              style={{ zIndex: 10 }}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full group-hover:bg-gray-400 transition-colors"></div>
            </div>
          </div>

          {/* 멘션 검색 패널 */}
          {isMentionPanelOpen && (
            <div className="mt-2 w-full bg-white border border-gray-300">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">@</span>
                <input
                  type="text"
                  value={mentionSearch}
                  onChange={(e) => setMentionSearch(e.target.value)}
                  placeholder="기억 검색..."
                  className="flex-1 text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {mentionMatches.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-400">검색 결과가 없습니다</div>
                ) : (
                  mentionMatches.map(memory => (
                    <button
                      key={memory.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertMention(memory)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex flex-col gap-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-blue-500">@</span>
                        <span className="flex-1 truncate font-medium">
                          {memory.title || stripHtmlClient(memory.content).slice(0, 60)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 드래그 오버레이 */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-indigo-50/90 border border-indigo-500 border-dashed pointer-events-none">
              <div className="text-center">
                <div className="mb-2 flex justify-center">
                  <PixelIcon name="attachment" size={48} className="text-indigo-500" />
                </div>
                <div className="text-lg font-semibold text-indigo-600">
                  파일을 여기에 놓아주세요
                </div>
                <div className="text-sm text-indigo-500 mt-1">
                  이미지, PDF, 문서 등
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 첨부 파일 목록 */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded text-xs"
              >
                <span className="truncate max-w-[150px] flex items-center gap-1">
                  <PixelIcon name={file.type.startsWith('image/') ? 'image' : 'attachment'} size={14} />
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-red-500 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </form>

      {/* 조건부 제안 */}
      {suggestions.length > 0 && (
        <div className="mt-6 p-4 bg-orange-50 border border-orange-300">
          <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-1">
            <PixelIcon name="lightbulb" size={16} />
            이런 건 어때요?
          </h3>
          <ul className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-sm text-amber-800">
                • {suggestion}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setSuggestions([])}
            className="mt-3 text-xs text-amber-600 hover:text-amber-800"
          >
            닫기
          </button>
        </div>
      )}

      {/* 연결 제안 토스트 */}
      {showConnectionModal && connectionSuggestions.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-white rounded-xl shadow-2xl p-5 min-w-[400px] max-w-[500px] border border-gray-200">
            <div className="flex items-start gap-3 mb-4">
              <PixelIcon name="link" size={24} />
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-800 mb-1">
                  이 기록들을 함께 연결할까요?
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  AI가 찾은 관련 기록들입니다. 원하는 것만 선택하세요.
                </p>

                <div className="bg-gradient-to-br from-orange-50 to-indigo-50 border border-indigo-200 p-3 mb-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {connectionSuggestions.map((suggestion) => (
                      <label
                        key={suggestion.id}
                        className="flex items-start gap-2 p-2 border border-gray-200 rounded-lg hover:bg-white/60 cursor-pointer bg-white/40"
                      >
                        <input
                          type="checkbox"
                          checked={selectedConnectionIds.has(suggestion.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedConnectionIds);
                            if (e.target.checked) {
                              newSet.add(suggestion.id);
                            } else {
                              newSet.delete(suggestion.id);
                            }
                            setSelectedConnectionIds(newSet);
                          }}
                          className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <p className="text-xs text-gray-800 mb-0.5 line-clamp-1">
                            {suggestion.content}...
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {suggestion.reason}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowConnectionModal(false);
                      setConnectionSuggestions([]);
                      onMemoryCreated(newMemory || undefined);
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    건너뛰기
                  </button>
                  <button
                    onClick={async () => {
                      if (selectedConnectionIds.size === 0 || !newMemoryId) {
                        setShowConnectionModal(false);
                        setConnectionSuggestions([]);
                        onMemoryCreated(newMemory || undefined);
                        return;
                      }

                      try {
                        // 선택된 기록들과 링크만 생성
                        const selectedIds = Array.from(selectedConnectionIds);

                        // 각 선택된 기록과 링크 생성 (AI 제안이므로 isAIGenerated=true)
                        for (const relatedId of selectedIds) {
                          const linkRes = await fetch('/api/memories/link', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              memoryId1: newMemoryId,
                              memoryId2: relatedId,
                              isAIGenerated: true,  // AI가 제안한 연결
                            }),
                          });

                          if (!linkRes.ok) {
                            console.error(`링크 생성 실패: ${relatedId}`);
                          }
                        }

                        setShowConnectionModal(false);
                        setConnectionSuggestions([]);
                        setSelectedConnectionIds(new Set());
                        onMemoryCreated();
                      } catch (error) {
                        console.error('Failed to create connections:', error);
                        alert('연결 생성에 실패했습니다');
                        setShowConnectionModal(false);
                        setConnectionSuggestions([]);
                        onMemoryCreated(newMemory || undefined);
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm bg-indigo-500 text-white border border-indigo-600 hover:bg-indigo-600 transition-colors"
                  >
                    연결하기 ({selectedConnectionIds.size}개)
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowConnectionModal(false);
                  setConnectionSuggestions([]);
                  onMemoryCreated(newMemory || undefined);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 성공 토스트 */}
      {toast.type === 'success' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
          <div className="bg-green-500 text-white border border-green-600 p-4 min-w-[300px]">
            <div className="flex items-center gap-3">
              <PixelIcon name="success" size={24} />
              <div>
                <p className="text-sm font-semibold">{toast.message || '완료되었습니다!'}</p>
              </div>
              <button
                onClick={() => setToast({ type: null })}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* 오른쪽 가이드 사이드바 */}
      <div className="w-56 flex-shrink-0 space-y-4 text-xs text-gray-500 font-galmuri11 pt-2">
        {/* 블롭 생성 */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-gray-700 font-bold uppercase tracking-tight text-[10px] mb-3">
            <PixelIcon name="blur" size={14} />
            블롭
          </h3>
          <div className="pl-1">
            <p className="leading-tight">
              3개 이상 연결된 카드 그룹에 자동으로 배경 생성
            </p>
          </div>
        </div>

        {/* 액션 프로젝트 */}
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <h3 className="flex items-center gap-2 text-gray-700 font-bold uppercase tracking-tight text-[10px] mb-3">
            <PixelIcon name="target" size={14} />
            액션 프로젝트
          </h3>
          <div className="pl-1">
            <p className="leading-tight">
              선택한 카드들을 AI가 분석해 실행 가능한 단계별 계획 생성
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
