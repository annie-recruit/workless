'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasBlock, MeetingRecorderBlockConfig } from '@/types';
import PixelIcon from './PixelIcon';
import LottiePlayer from './LottiePlayer';
import ProcessingLoader from './ProcessingLoader';
import { WebSpeechRealtimeClient } from '@/lib/webspeech';

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
  isHighlighted?: boolean;
  isSelected?: boolean;
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
  isHighlighted = false,
  isSelected = false,
}: MeetingRecorderBlockProps) {
  const [isRecording, setIsRecording] = useState(config.isRecording || false);
  const [isPaused, setIsPaused] = useState(config.isPaused || false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(config.recordingTime || 0);
  const [script, setScript] = useState(config.script || '');
  const [summary, setSummary] = useState(config.summary || '');
  const [liveScript, setLiveScript] = useState(''); // 실시간 스크립트 (최종 결과만)
  const [interimScript, setInterimScript] = useState(''); // 중간 결과 (임시)

  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0));
  const [isHovered, setIsHovered] = useState(false);
  const speechClientRef = useRef<WebSpeechRealtimeClient | null>(null); // Web Speech API 클라이언트

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

  // 녹음 시작 (Web Speech API 실시간 스트리밍)
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Web Audio API 설정 (파형 시각화용)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Web Speech API 클라이언트 초기화
      const client = new WebSpeechRealtimeClient({
        onTranscript: (text, isFinal) => {
          console.log(`[WebSpeech ${isFinal ? 'Final' : 'Interim'}]`, text);
          
          if (isFinal) {
            // 최종 결과만 실제 스크립트에 추가
            setLiveScript((prev) => prev + (prev ? '\n' : '') + text);
            setInterimScript(''); // 중간 결과 초기화
          } else {
            // 중간 결과는 임시로만 표시
            setInterimScript(text);
          }
        },
        onError: (error) => {
          console.error('[MeetingRecorder] WebSpeech 오류:', error);
        },
      });

      await client.connect('ko-KR'); // 한국어 설정
      speechClientRef.current = client;

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
      if (error instanceof Error && error.message.includes('음성 인식')) {
        alert(error.message);
      } else {
        alert('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
      }
    }
  }, [blockId, config, onUpdate, analyzeAudio]);

  // 녹음 일시정지 (Web Speech API 일시 중지)
  const pauseRecording = useCallback(() => {
    setIsPaused(true);
    pausedTimeRef.current = recordingTime;

    // Web Speech API 중지
    if (speechClientRef.current) {
      speechClientRef.current.disconnect();
    }

    // 타이머 중지
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
  }, [blockId, config, recordingTime, onUpdate]);

  // 녹음 재개
  const resumeRecording = useCallback(async () => {
    if (!streamRef.current || !audioContextRef.current) return;

    setIsPaused(false);
    startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;

    // Web Speech API 재시작
    try {
      const client = new WebSpeechRealtimeClient({
        onTranscript: (text, isFinal) => {
          console.log(`[WebSpeech ${isFinal ? 'Final' : 'Interim'}]`, text);
          
          if (isFinal) {
            // 최종 결과만 실제 스크립트에 추가
            setLiveScript((prev) => prev + (prev ? '\n' : '') + text);
            setInterimScript(''); // 중간 결과 초기화
          } else {
            // 중간 결과는 임시로만 표시
            setInterimScript(text);
          }
        },
        onError: (error) => {
          console.error('[MeetingRecorder] WebSpeech 오류:', error);
        },
      });

      await client.connect('ko-KR');
      speechClientRef.current = client;
    } catch (error) {
      console.error('[MeetingRecorder] 재개 실패:', error);
    }

    // 오디오 분석 재개
    analyzeAudio();

    // 타이머 재시작
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
  }, [blockId, config, onUpdate, analyzeAudio]);

  // 녹음 완료
  const completeRecording = useCallback(async () => {
    setIsRecording(false);
    setIsPaused(false);

    // Web Speech API 연결 종료
    if (speechClientRef.current) {
      speechClientRef.current.disconnect();
      speechClientRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 스트림 정리
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

    // 요약 생성
    if (liveScript) {
      setIsProcessing(true);
      
      try {
        const response = await fetch('/api/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script: liveScript }),
        });

        const data = await response.json();
        
        if (data.summary) {
          setScript(liveScript);
          setSummary(data.summary);

          onUpdate(blockId, {
            config: {
              ...config,
              script: liveScript,
              summary: data.summary,
              isRecording: false,
              isPaused: false,
              recordingTime: 0,
              createdAt: Date.now(),
            },
          });
        }
      } catch (error) {
        console.error('[MeetingRecorder] 요약 생성 실패:', error);
        // 요약 실패해도 스크립트는 저장
        setScript(liveScript);
        onUpdate(blockId, {
          config: {
            ...config,
            script: liveScript,
            isRecording: false,
            isPaused: false,
            recordingTime: 0,
          },
        });
      } finally {
        setIsProcessing(false);
        setLiveScript(''); // 실시간 스크립트 초기화
        setInterimScript(''); // 중간 결과 초기화
      }
    } else {
      onUpdate(blockId, {
        config: { ...config, isRecording: false, isPaused: false, recordingTime: 0 },
      });
    }
  }, [blockId, config, onUpdate, liveScript]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (speechClientRef.current) {
        speechClientRef.current.disconnect();
      }
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

  // 상태 결정
  const state: 'processing' | 'recording' | 'idle' = isProcessing
    ? 'processing'
    : isRecording
      ? 'recording'
      : 'idle';
  const isStateRecording = !isProcessing && isRecording;
  const isStateProcessing = isProcessing;

  const scale = isHovered ? 1.05 : 1;

  return (
    <div
      data-meeting-recorder-block={blockId}
      className={`absolute bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden ${isHighlighted || isSelected ? 'border-[3px] border-blue-400' : 'border-[3px] border-black'
        }`}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: isDragging ? 10000 : zIndex,
        opacity: isDragging ? 0.85 : 1,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        willChange: isDragging ? 'transform' : 'auto',
        pointerEvents: isDragging ? 'none' : 'auto',
        contain: isDragging ? 'layout style paint' : 'none',
        transformOrigin: 'center center',
        overflow: 'visible',
        ...(isHighlighted
          ? { backgroundImage: 'linear-gradient(rgba(96, 165, 250, 0.15), rgba(96, 165, 250, 0.15))' }
          : null),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={onPointerDown}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b-[3px] border-black bg-white">
        <div className="flex items-center gap-1.5">
          <PixelIcon name="meeting-recorder" size={18} />
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
        {/* 녹음 컨트롤 패널 - 상태 중심 디자인 */}
        <div className="w-1/2 border-r-[3px] border-black p-8 flex flex-col items-center justify-center bg-white relative overflow-hidden">
          {/* 중앙 아이콘 영역 - 애니메이션을 배경 레이어로 */}
          <div className="relative flex flex-col items-center" style={{ minHeight: '200px' }}>
            {/* 버튼과 애니메이션을 감싸는 컨테이너 */}
            <div className="relative flex items-center justify-center" style={{ width: '160px', height: '160px' }}>
              {/* Lottie 애니메이션 배경 레이어 - 녹음 중일 때만 표시 (원형 마스킹) */}
              {isStateRecording && !isPaused && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    width: '160px',
                    height: '160px',
                    opacity: 1,
                  }}
                >
                  <div
                    className="relative w-full h-full overflow-hidden"
                    style={{
                      borderRadius: '50%',
                      filter: 'brightness(0)',
                    }}
                  >
                    <LottiePlayer
                      path="/lottie/audio-wave.json"
                      loop={true}
                      autoplay={true}
                      className="w-full h-full"
                      style={{
                        transform: 'scale(1.8)',
                        transformOrigin: 'center',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Lottie 애니메이션 배경 레이어 - 일시정지 시 (opacity 30%) */}
              {isStateRecording && isPaused && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    width: '160px',
                    height: '160px',
                    opacity: 0.3,
                  }}
                >
                  <div
                    className="relative w-full h-full overflow-hidden"
                    style={{
                      borderRadius: '50%',
                      filter: 'brightness(0)',
                    }}
                  >
                    <LottiePlayer
                      path="/lottie/audio-wave.json"
                      loop={false}
                      autoplay={false}
                      stillFrame={0}
                      className="w-full h-full"
                      style={{
                        transform: 'scale(1.8)',
                        transformOrigin: 'center',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 네모 버튼 - 녹음 시작/일시정지 (애니메이션 위에 배치) */}
              <div className="relative z-10">
                {state === 'idle' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRecording();
                    }}
                    className="w-20 h-20 border-[3px] border-black bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
                    style={{
                      clipPath: 'polygon(3px 0, calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px), 0 3px, 3px 3px)'
                    }}
                    title="녹음 시작"
                  >
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="#000000" xmlns="http://www.w3.org/2000/svg">
                      <path d="M25.905 10.67h-1.53V3.05h-1.52v13.71H9.145V3.05h-1.53v7.62H6.1V9.14H4.575v12.19H6.1v-9.14h1.52v7.62h1.53v1.52h1.52v1.53h3.05v1.52H9.145v1.52h4.57v1.53h-6.1v1.52h16.76v-1.52h-6.09V25.9h4.57v-1.52h-4.57v-1.52h3.05v-1.53h1.52v-1.52h1.52v-7.62h1.53v9.14h1.52V9.14h-1.52Zm-9.14 16.76h-1.53v-4.57h1.53Z"/>
                      <path d="M24.375 21.33h1.53v1.53h-1.53Z"/>
                      <path d="m7.615 30.48 0 -1.53 -1.52 0 0 1.53 -1.52 0 0 1.52 22.85 0 0 -1.52 -1.52 0 0 -1.53 -1.53 0 0 1.53 -16.76 0z"/>
                      <path d="M22.855 22.86h1.52v1.52h-1.52Z"/>
                      <path d="M21.335 1.52h1.52v1.53h-1.52Z"/>
                      <path d="M19.805 10.67h1.53v1.52h-1.53Z"/>
                      <path d="M19.805 4.57h1.53V6.1h-1.53Z"/>
                      <path d="M18.285 13.71h1.52v1.53h-1.52Z"/>
                      <path d="M18.285 7.62h1.52v1.52h-1.52Z"/>
                      <path d="M15.235 10.67h1.53v1.52h-1.53Z"/>
                      <path d="M15.235 4.57h1.53V6.1h-1.53Z"/>
                      <path d="M12.185 13.71h1.53v1.53h-1.53Z"/>
                      <path d="M12.185 7.62h1.53v1.52h-1.53Z"/>
                      <path d="M10.665 0h10.67v1.52h-10.67Z"/>
                      <path d="M10.665 10.67h1.52v1.52h-1.52Z"/>
                      <path d="M10.665 4.57h1.52V6.1h-1.52Z"/>
                      <path d="M9.145 1.52h1.52v1.53h-1.52Z"/>
                      <path d="M7.615 22.86h1.53v1.52h-1.53Z"/>
                      <path d="M6.095 21.33h1.52v1.53h-1.52Z"/>
                    </svg>
                  </button>
                ) : isStateRecording ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPaused) {
                        resumeRecording();
                      } else {
                        pauseRecording();
                      }
                    }}
                    className="w-20 h-20 border-[3px] border-black bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
                    style={{
                      clipPath: 'polygon(3px 0, calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px), 0 3px, 3px 3px)'
                    }}
                    title={isPaused ? '재개' : '일시정지'}
                  >
                    {isPaused ? (
                      <PixelIcon name="play" size={40} className="text-black" />
                    ) : (
                      <PixelIcon name="pause" size={40} className="text-black" />
                    )}
                  </button>
                ) : null}
              </div>
            </div>

            {/* 타이머 - 애니메이션 아래에 표시 (보조 정보) */}
            {isStateRecording && (
              <div className="text-sm font-mono text-gray-500 mt-4 relative z-10">
                {formatTime(recordingTime)}
              </div>
            )}

            {/* Processing 상태 표시 */}
            {isStateProcessing && (
              <div className="mt-4 relative z-10">
                <ProcessingLoader
                  size={32}
                  variant="panel"
                  tone="graphite"
                  label="처리 중..."
                />
              </div>
            )}
          </div>

          {/* 주황색 버튼 - 우측 하단에 작게 배치 (현재 크기의 1/9) */}
          {isStateRecording && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                completeRecording();
              }}
              className="absolute bottom-4 right-4 w-[calc(64px/3)] h-[calc(64px/3)] border-[2px] border-black bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-colors z-20"
              title="녹음 종료"
              style={{ 
                minWidth: '18px', 
                minHeight: '18px',
                clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
              }}
            >
              <PixelIcon name="stop" size={8} className="text-white" />
            </button>
          )}
        </div>

        {/* 노트패드 (스크립트/요약) */}
        <div className="w-1/2 p-4 overflow-y-auto bg-white">
          <div className="h-full">
            {script || summary || liveScript || interimScript ? (
              <div className="space-y-4">
                {summary && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <PixelIcon name="clipboard" size={16} className="text-gray-600" />
                      회의 요약
                    </h3>
                    <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-white p-3 border-[2px] border-black">
                      {summary}
                    </div>
                  </div>
                )}
                {(script || liveScript || interimScript) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <PixelIcon name="file" size={16} className="text-gray-600" />
                      {script ? '전체 스크립트' : '실시간 스크립트'}
                      {!script && (liveScript || interimScript) && (
                        <span className="text-[10px] text-orange-500 font-normal animate-pulse">● 실시간</span>
                      )}
                    </h3>
                    <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-white p-3 border-[2px] border-black max-h-48 overflow-y-auto">
                      {script || liveScript}
                      {interimScript && (
                        <span className="text-gray-400">{liveScript ? '\n' : ''}{interimScript}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                {isStateRecording ? (
                  <div className="text-center">
                    <div className="mb-2 flex justify-center">
                      <PixelIcon name="meeting-recorder" size={32} className="text-gray-400" />
                    </div>
                    <div>녹음 중...</div>
                    <div className="text-xs mt-1">종료 버튼을 누르면</div>
                    <div className="text-xs">자동으로 변환됩니다</div>
                  </div>
                ) : isStateProcessing ? (
                  <div className="text-center">
                    <ProcessingLoader size={32} variant="panel" tone="graphite" label="음성을 텍스트로 변환 중..." />
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mb-2 flex justify-center">
                      <PixelIcon name="file" size={32} className="text-gray-400" />
                    </div>
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
