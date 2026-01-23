'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasBlock, MeetingRecorderBlockConfig } from '@/types';

interface MeetingRecorderBlockProps {
  blockId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  config: MeetingRecorderBlockConfig;
  onUpdate: (blockId: string, updates: Partial<CanvasBlock>) => void;
  onDelete: (blockId: string) => void;
  isDragging?: boolean;
  isClicked?: boolean;
  zIndex?: number;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export default function MeetingRecorderBlock({
  blockId,
  x,
  y,
  width = 600,
  height = 400,
  config,
  onUpdate,
  onDelete,
  isDragging = false,
  isClicked = false,
  zIndex = 10,
  onPointerDown,
}: MeetingRecorderBlockProps) {
  const [isRecording, setIsRecording] = useState(config.isRecording || false);
  const [isPaused, setIsPaused] = useState(config.isPaused || false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(config.recordingTime || 0);
  const [script, setScript] = useState(config.script || '');
  const [summary, setSummary] = useState(config.summary || '');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0));

  // 녹음 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 오디오 레벨 분석
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // 20개 바를 위한 샘플링
    const samples = 20;
    const step = Math.floor(bufferLength / samples);
    const levels: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j];
      }
      levels.push(sum / step / 255); // 0-1 정규화
    }
    
    setAudioLevels(levels);
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, []);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Web Audio API 설정 (파형 시각화용)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await transcribeAudio(audioBlob);
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      mediaRecorder.start(1000); // 1초마다 데이터 수집
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(pausedTimeRef.current);
      startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;

      // 오디오 레벨 분석 시작
      analyzeAudio();

      // 타이머 시작
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
        onUpdate(blockId, {
          config: { ...config, isRecording: true, isPaused: false, recordingTime: elapsed },
        });
      }, 1000);
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      alert('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
    }
  }, [blockId, config, onUpdate, analyzeAudio]);

  // 녹음 일시정지
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      // MediaRecorder의 pause() 메서드가 지원되는지 확인
      if (typeof mediaRecorderRef.current.pause === 'function') {
        try {
          mediaRecorderRef.current.pause();
        } catch (error) {
          // pause가 지원되지 않는 경우, 녹음을 중지하고 재개 시 새로 시작
          console.warn('pause() not supported, using stop/resume workaround');
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            // 스트림은 유지
          }
        }
      } else {
        // pause가 없는 경우, 녹음을 중지하고 재개 시 새로 시작
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }
      
      setIsPaused(true);
      pausedTimeRef.current = recordingTime;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // 오디오 분석 중지
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setAudioLevels(new Array(20).fill(0));

      onUpdate(blockId, {
        config: { ...config, isRecording: true, isPaused: true, recordingTime },
      });
    }
  }, [blockId, config, recordingTime, onUpdate]);

  // 녹음 재개
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && streamRef.current) {
      // pause/resume이 지원되는 경우
      if (typeof mediaRecorderRef.current.resume === 'function' && mediaRecorderRef.current.state === 'paused') {
        try {
          mediaRecorderRef.current.resume();
          setIsPaused(false);
          startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;

          timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setRecordingTime(elapsed);
            onUpdate(blockId, {
              config: { ...config, isRecording: true, isPaused: false, recordingTime: elapsed },
            });
          }, 1000);

          onUpdate(blockId, {
            config: { ...config, isRecording: true, isPaused: false },
          });
          return;
        } catch (error) {
          console.warn('resume() failed, restarting recording');
        }
      }
      
      // pause/resume이 지원되지 않는 경우, 새로 녹음 시작
      // 기존 오디오 청크는 유지하고 계속 추가
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await transcribeAudio(audioBlob);
        }
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsPaused(false);
      startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;

      // 오디오 분석 재개
      analyzeAudio();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
        onUpdate(blockId, {
          config: { ...config, isRecording: true, isPaused: false, recordingTime: elapsed },
        });
      }, 1000);

      onUpdate(blockId, {
        config: { ...config, isRecording: true, isPaused: false },
      });
    }
  }, [blockId, config, onUpdate, analyzeAudio]);

  // 녹음 완료
  const completeRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      onUpdate(blockId, {
        config: { ...config, isRecording: false, isPaused: false, recordingTime: 0 },
      });
    }
  }, [blockId, config, onUpdate]);

  // 음성 변환
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
          setScript(data.script);
          setSummary(data.summary);
          
          onUpdate(blockId, {
            config: {
              ...config,
              script: data.script,
              summary: data.summary,
              createdAt: Date.now(),
            },
          });
        } else {
          alert('음성을 텍스트로 변환하지 못했습니다.');
        }
      } else {
        const error = await res.json();
        alert(error.error || '음성 변환 실패');
      }
    } catch (error) {
      console.error('음성 변환 실패:', error);
      alert('음성 변환 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div
      className="absolute bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: isDragging ? 10000 : zIndex,
        opacity: isDragging ? 0.85 : 1,
        transition: 'none',
        willChange: isDragging ? 'transform' : 'auto',
        pointerEvents: isDragging ? 'none' : 'auto',
        contain: 'layout style paint',
      }}
      onPointerDown={onPointerDown}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🎙️</span>
          <span className="text-xs font-semibold text-gray-700">미팅 레코더</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(blockId);
          }}
          className="text-gray-400 hover:text-gray-600 text-xs"
          title="삭제"
        >
          ×
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex h-[calc(100%-40px)]">
        {/* 녹음 컨트롤 패널 */}
        <div className="w-1/2 border-r border-gray-200 p-6 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
          {/* 배경 장식 */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-indigo-400 rounded-full blur-3xl"></div>
          </div>
          
          {/* 오디오 파형 시각화 */}
          <div className="relative mb-6 w-full max-w-xs">
            <div className="h-24 flex items-end justify-center gap-1.5 px-4">
              {audioLevels.map((level, index) => (
                <div
                  key={index}
                  className="flex-1 bg-gradient-to-t from-indigo-500 via-blue-400 to-cyan-300 rounded-t transition-all duration-75 ease-out"
                  style={{
                    height: `${Math.max(4, level * 100)}%`,
                    minHeight: '4px',
                    opacity: isRecording && !isPaused ? 0.7 + level * 0.3 : 0.3,
                    boxShadow: isRecording && !isPaused && level > 0.3 
                      ? `0 -2px 8px rgba(99, 102, 241, ${level * 0.5})` 
                      : 'none',
                  }}
                />
              ))}
            </div>
            {/* 마이크 아이콘 (클릭 가능) */}
            {!isRecording && !isProcessing ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startRecording();
                }}
                className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                title="녹음 시작"
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95 ${
                  isRecording && !isPaused ? 'animate-pulse scale-110' : 'scale-100'
                }`}
                style={{
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
                }}>
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </div>
                {/* 펄스 효과 */}
                <div className="absolute inset-0 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-20 animate-ping pointer-events-none"></div>
              </button>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg transition-all ${
                  isRecording && !isPaused ? 'animate-pulse scale-110' : 'scale-100'
                }`}>
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* 컨트롤 버튼들 */}
          <div className="flex flex-col items-center gap-4 relative z-10">
            {isProcessing ? (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-xl">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (isRecording || isPaused) ? (
              <div className="flex items-center gap-3">
                {/* 일시정지/재개 버튼 */}
                {isPaused ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resumeRecording();
                    }}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    title="재개"
                    style={{
                      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pauseRecording();
                    }}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    title="일시정지"
                    style={{
                      boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  </button>
                )}

                {/* 완료 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    completeRecording();
                  }}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  title="완료"
                  style={{
                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </button>
              </div>
            ) : null}

            {/* 녹음 시간 */}
            {(isRecording || isPaused) && (
              <div className="text-3xl font-mono font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                {formatTime(recordingTime)}
              </div>
            )}

            {/* 상태 표시 */}
            {isProcessing && (
              <div className="text-sm font-medium text-gray-600 bg-white/60 px-4 py-2 rounded-full">
                처리 중...
              </div>
            )}
          </div>
        </div>

        {/* 노트패드 (스크립트/요약) */}
        <div className="w-1/2 p-4 overflow-y-auto bg-gradient-to-br from-amber-50 to-yellow-50">
          <div className="h-full">
            {script || summary ? (
              <div className="space-y-4">
                {summary && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span>📋</span> 회의 요약
                    </h3>
                    <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded border border-amber-200 shadow-sm">
                      {summary}
                    </div>
                  </div>
                )}
                {script && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span>📝</span> 전체 스크립트
                    </h3>
                    <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded border border-amber-200 shadow-sm max-h-48 overflow-y-auto">
                      {script}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                {isRecording || isPaused ? (
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎙️</div>
                    <div>녹음 중...</div>
                    <div className="text-xs mt-1">완료 버튼을 누르면</div>
                    <div className="text-xs">자동으로 변환됩니다</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-2xl mb-2">📝</div>
                    <div>녹음 버튼을 눌러</div>
                    <div className="text-xs mt-1">미팅을 시작하세요</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
