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

  // 외부(보드 등)에서 드롭된 파일 처리
  useEffect(() => {
    const handleGlobalFilesDropped = (e: any) => {
      if (e.detail && e.detail.files) {
        setFiles(prev => [...prev, ...Array.from(e.detail.files as FileList)]);
      }
    };
    window.addEventListener('workless:files-dropped', handleGlobalFilesDropped);
    return () => window.removeEventListener('workless:files-dropped', handleGlobalFilesDropped);
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
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* 상단 가이드 영역 - 가로 배열 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-white/50 border-2 border-dashed border-gray-200 rounded-2xl font-galmuri11">
        {/* 위젯 기능 */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-gray-800 font-bold uppercase tracking-tight text-xs mb-1">
            <PixelIcon name="widgets" size={16} />
            위젯 가이드
          </h3>
          <div className="space-y-1.5 pl-1 text-[11px] text-gray-500">
            <div className="flex items-center gap-2">
              <PixelIcon name="calendar" size={12} className="flex-shrink-0" />
              <span><strong>캘린더:</strong> 날짜 기반 일정 관리</span>
            </div>
            <div className="flex items-center gap-2">
              <PixelIcon name="map" size={12} className="flex-shrink-0" />
              <span><strong>미니맵:</strong> 보드 전체 뷰</span>
            </div>
            <div className="flex items-center gap-2">
              <PixelIcon name="file" size={12} className="flex-shrink-0" />
              <span><strong>뷰어:</strong> PDF/이미지 표시</span>
            </div>
            <div className="flex items-center gap-2">
              <PixelIcon name="database" size={12} className="flex-shrink-0" />
              <span><strong>데이터베이스:</strong> 테이블 뷰</span>
            </div>
            <div className="flex items-center gap-2">
              <PixelIcon name="microphone" size={12} className="flex-shrink-0" />
              <span><strong>회의록:</strong> 실시간 녹음</span>
            </div>
          </div>
        </div>

        {/* 카드 기능 */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-gray-800 font-bold uppercase tracking-tight text-xs mb-1">
            <PixelIcon name="card" size={16} />
            카드 가이드
          </h3>
          <div className="space-y-1.5 pl-1 text-[11px] text-gray-500">
            <div className="flex items-center gap-2">
              <PixelIcon name="link" size={12} className="flex-shrink-0" />
              <span>카드 연결로 관계 시각화</span>
            </div>
            <div className="flex items-center gap-2">
              <PixelIcon name="flag" size={12} className="flex-shrink-0" />
              <span>깃발로 북마크 저장</span>
            </div>
            <div className="flex items-center gap-2">
              <PixelIcon name="folder" size={12} className="flex-shrink-0" />
              <span>그룹으로 분류 정리</span>
            </div>
          </div>
        </div>

        {/* 스마트 기능 */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-gray-800 font-bold uppercase tracking-tight text-xs mb-1">
            <PixelIcon name="blur" size={16} />
            AI 분석 가이드
          </h3>
          <div className="space-y-2 pl-1 text-[11px] text-gray-500">
            <div className="flex items-start gap-2">
              <PixelIcon name="blur" size={12} className="mt-0.5 flex-shrink-0" />
              <span className="leading-tight">3개 이상 연결된 카드 그룹에 자동으로 블롭 배경 생성</span>
            </div>
            <div className="flex items-start gap-2">
              <PixelIcon name="target" size={12} className="mt-0.5 flex-shrink-0" />
              <span className="leading-tight">선택한 카드들을 AI가 분석해 실행 가능한 계획 생성</span>
            </div>
          </div>
        </div>

        {/* 사용 팁 */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-gray-800 font-bold uppercase tracking-tight text-xs mb-1">
            <PixelIcon name="lightbulb" size={16} />
            빠른 시작 팁
          </h3>
          <div className="pl-1 text-[11px] text-gray-500 space-y-1.5">
            <p className="leading-tight">• 하단 입력창에 자유롭게 기록하세요.</p>
            <p className="leading-tight">• @를 입력해 다른 기록을 멘션하세요.</p>
            <p className="leading-tight">• 이미지나 PDF를 드래그해서 넣으세요.</p>
          </div>
        </div>
      </div>

      {/* 중앙 입력 폼 영역 - 토스트 디자인으로 변경 */}
      <div className="fixed bottom-8 right-8 z-[100] w-full max-w-md px-4 animate-slide-up font-galmuri11">
        <div className="bg-white border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative p-1 overflow-visible">
          {/* 픽셀 코너 장식 */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />

          <form onSubmit={handleSubmit} className="flex flex-col" data-tutorial-target="memory-input">
            {/* 제목 입력 (작게) */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목 (선택)"
              className="w-full px-3 py-1 text-xs font-bold border-b border-gray-100 focus:outline-none focus:border-indigo-300 transition-colors"
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
                className={`w-full transition-all flex flex-col ${isDragging ? 'bg-indigo-50/50' : 'bg-white'}`}
                style={{ height: `${Math.min(editorHeight, 300)}px` }}
              >
                {/* 툴바 (슬림하게) */}
                <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-100 bg-gray-50/30">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCommand('bold')}
                    className="w-6 h-6 flex items-center justify-center text-[10px] rounded hover:bg-gray-200 font-bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCommand('italic')}
                    className="w-6 h-6 flex items-center justify-center text-[10px] rounded hover:bg-gray-200 italic font-serif"
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
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200"
                  >
                    <PixelIcon name="link" size={12} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setIsMentionPanelOpen(!isMentionPanelOpen)}
                    className="w-6 h-6 flex items-center justify-center text-[10px] rounded hover:bg-gray-200"
                  >
                    @
                  </button>
                  <div className="h-4 w-px bg-gray-200 mx-1" />

                  {/* 파일/음성 버튼도 툴바에 통합 */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    <PixelIcon name="attachment" size={12} />
                  </button>

                  {!isRecording && !isProcessing ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={loading}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      <PixelIcon name="microphone" size={12} />
                    </button>
                  ) : isRecording ? (
                    <button
                      type="button"
                      onClick={() => voiceRecorderRef.current?.stop()}
                      className="px-2 h-6 flex items-center gap-1 bg-red-50 text-red-600 rounded text-[10px] animate-pulse"
                    >
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {formatTime(recordingTime)}
                    </button>
                  ) : (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <ProcessingLoader size={10} variant="inline" tone="indigo" />
                    </div>
                  )}

                  <div className="flex-1" />

                  {/* 저장 버튼을 툴바 오른쪽에 배치 */}
                  <button
                    type="submit"
                    disabled={loading || !content.trim()}
                    className="px-3 py-1 text-[10px] bg-indigo-600 text-white rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:bg-indigo-700 disabled:bg-gray-300 disabled:shadow-none transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                  >
                    {loading ? '...' : '기록하기'}
                  </button>
                </div>

                {/* 입력 영역 */}
                <div className="relative flex-1 flex flex-col overflow-hidden">
                  {!getEditorText() && !isEditorFocused && (
                    <div className="absolute top-2.5 left-3 text-[11px] text-gray-400 pointer-events-none">
                      새로운 생각을 기록하세요...
                    </div>
                  )}
                  <div
                    ref={editorRef}
                    contentEditable={!loading}
                    className="flex-1 px-3 py-2 text-[13px] outline-none overflow-y-auto min-h-[50px]"
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

                  {/* 파일 입력을 위해 숨겨진 input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.md,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* 리사이즈 핸들 (상단으로 변경하여 끌어올리기 느낌) */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                className="absolute -top-1.5 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center group z-10"
              >
                <div className="w-8 h-1 bg-gray-400/30 rounded-full group-hover:bg-gray-400/60 transition-colors"></div>
              </div>
            </div>

            {/* 멘션 검색 패널 (인라인으로 표시되도록 조정) */}
            {isMentionPanelOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-4 border-gray-900 shadow-xl overflow-hidden z-20">
                <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-gray-100 bg-gray-50">
                  <span className="text-xs text-gray-500 font-bold">@</span>
                  <input
                    type="text"
                    value={mentionSearch}
                    onChange={(e) => setMentionSearch(e.target.value)}
                    placeholder="기억 검색..."
                    className="flex-1 text-xs bg-transparent focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {mentionMatches.length === 0 ? (
                    <div className="px-3 py-3 text-[10px] text-gray-400 text-center">결과 없음</div>
                  ) : (
                    mentionMatches.map(memory => (
                      <button
                        key={memory.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertMention(memory)}
                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-[11px] flex items-center gap-2 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-indigo-500 font-bold">@</span>
                        <span className="truncate flex-1">
                          {memory.title || stripHtmlClient(memory.content).slice(0, 40)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </form>

          {/* 드래그 오버레이 */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-indigo-50/90 border-2 border-indigo-500 border-dashed pointer-events-none z-30">
              <div className="text-center">
                <div className="text-xs font-bold text-indigo-600">파일을 놓으세요</div>
              </div>
            </div>
          )}
        </div>

        {/* 첨부 파일 목록 (토스트 바 위에 작게 표시) */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 px-2 py-1 bg-gray-900 text-white rounded text-[10px] shadow-sm"
              >
                <PixelIcon name={file.type.startsWith('image/') ? 'image' : 'attachment'} size={10} />
                <span className="truncate max-w-[100px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 조건부 제안 (입력창 근처 토스트로) */}
      {suggestions.length > 0 && (
        <div className="fixed bottom-32 right-8 w-full max-w-md z-[90] animate-slide-up font-galmuri11 pr-4">
          <div className="bg-amber-50 border-4 border-amber-900 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
            <h3 className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-2">
              <PixelIcon name="lightbulb" size={14} />
              이런 건 어때요?
            </h3>
            <ul className="space-y-1">
              {suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-[10px] text-amber-800">• {suggestion}</li>
              ))}
            </ul>
            <button
              onClick={() => setSuggestions([])}
              className="mt-2 text-[9px] text-amber-600 font-bold hover:underline"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 연결 제안 토스트 (기존 스타일 유지하되 일관성 보완) */}
      {showConnectionModal && connectionSuggestions.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
          <div className="bg-white border-4 border-gray-900 p-5 min-w-[350px] max-w-[450px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />

            <div className="flex items-start gap-3">
              <div className="mt-1"><PixelIcon name="link" size={20} /></div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-gray-800 mb-1 uppercase tracking-tight">기록 연결 제안</h3>
                <p className="text-[11px] text-gray-600 mb-3 leading-snug">AI가 찾은 관련 기록들입니다. 원하는 것만 선택하세요.</p>

                <div className="bg-gray-50 border-2 border-gray-200 p-2 mb-4 max-h-48 overflow-y-auto">
                  <div className="space-y-1.5">
                    {connectionSuggestions.map((suggestion) => (
                      <label
                        key={suggestion.id}
                        className="flex items-start gap-2 p-2 bg-white border border-gray-100 hover:border-indigo-300 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedConnectionIds.has(suggestion.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedConnectionIds);
                            if (e.target.checked) newSet.add(suggestion.id);
                            else newSet.delete(suggestion.id);
                            setSelectedConnectionIds(newSet);
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[10px] text-gray-800 font-bold truncate">{suggestion.content}</p>
                          <p className="text-[9px] text-gray-500 line-clamp-1">{suggestion.reason}</p>
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
                    className="flex-1 py-2 text-[10px] font-bold border-2 border-gray-300 hover:bg-gray-50 active:translate-y-0.5"
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
                        const selectedIds = Array.from(selectedConnectionIds);
                        for (const relatedId of selectedIds) {
                          await fetch('/api/memories/link', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              memoryId1: newMemoryId,
                              memoryId2: relatedId,
                              isAIGenerated: true,
                            }),
                          });
                        }
                        setShowConnectionModal(false);
                        setConnectionSuggestions([]);
                        setSelectedConnectionIds(new Set());
                        onMemoryCreated();
                      } catch (error) {
                        console.error('Failed to create connections:', error);
                        setShowConnectionModal(false);
                        setConnectionSuggestions([]);
                        onMemoryCreated(newMemory || undefined);
                      }
                    }}
                    className="flex-1 py-2 text-[10px] font-bold bg-indigo-600 text-white border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:bg-indigo-700 active:translate-y-0.5 active:shadow-none"
                  >
                    연결하기 ({selectedConnectionIds.size}개)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 성공 토스트 */}
      {toast.type === 'success' && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
          <div className="bg-green-500 text-white border-4 border-gray-900 p-4 min-w-[250px] shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] relative">
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
            <div className="flex items-center gap-3">
              <PixelIcon name="success" size={20} />
              <p className="text-xs font-black uppercase tracking-wider">{toast.message || '저장 완료!'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
