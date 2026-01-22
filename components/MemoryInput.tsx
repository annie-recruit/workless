'use client';

import { useState, useRef, useEffect } from 'react';
import { Memory } from '@/types';

interface MemoryInputProps {
  onMemoryCreated: () => void;
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

  const stripHtmlClient = (html: string) => html.replace(/<[^>]*>/g, '').trim();

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
        start: () => {},
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
    const range = mentionRangeRef.current || selection?.getRangeAt(0);
    if (!range) return;
    range.deleteContents();

    const plainTitle = memory.title || stripHtmlClient(memory.content || '').slice(0, 24) || '기억';
    const mentionEl = document.createElement('a');
    mentionEl.textContent = `@${plainTitle}`;
    mentionEl.setAttribute('data-memory-id', memory.id);
    mentionEl.setAttribute('href', `#memory-${memory.id}`);
    mentionEl.className = 'mention inline-flex items-center px-1 py-0.5 rounded bg-blue-50 text-blue-700';

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
        onMemoryCreated();

        // 조건부 제안 표시
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
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
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 제목 입력 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 (선택)"
          className="w-full px-3 py-1.5 text-sm font-medium border-b border-gray-200 focus:outline-none focus:border-blue-400 transition-colors mb-2"
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
            className={`w-full border-2 rounded-xl transition-all flex flex-col ${
              isDragging 
                ? 'border-blue-500 bg-blue-50 border-dashed' 
                : 'border-gray-200 focus-within:border-blue-400'
            }`}
            style={{ minHeight: `${editorHeight}px` }}
          >
            {/* 툴바 */}
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-white/70 rounded-t-xl">
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
                🔗
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
                    📎
                  </button>
                  {!isRecording && !isProcessing ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={loading}
                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
                      title="회의 녹음"
                    >
                      🎤
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
                      <span className="animate-spin text-xs">⏳</span>
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
              className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-blue-200/30 transition-colors rounded-b-xl flex items-center justify-center group"
              style={{ zIndex: 10 }}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full group-hover:bg-gray-400 transition-colors"></div>
            </div>
          </div>

          {/* 멘션 검색 패널 */}
          {isMentionPanelOpen && (
            <div className="mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-sm">
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
            <div className="absolute inset-0 flex items-center justify-center bg-blue-50/90 border-2 border-blue-500 border-dashed rounded-2xl pointer-events-none">
              <div className="text-center">
                <div className="text-4xl mb-2">📎</div>
                <div className="text-lg font-semibold text-blue-600">
                  파일을 여기에 놓아주세요
                </div>
                <div className="text-sm text-blue-500 mt-1">
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
                <span className="truncate max-w-[150px]">
                  {file.type.startsWith('image/') ? '🖼️' : '📎'} {file.name}
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
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">
            💡 이런 건 어때요?
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

    </div>
  );
}
