'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasBlock, MeetingRecorderBlockConfig } from '@/types';
import PixelIcon from './PixelIcon';
import LottiePlayer from './LottiePlayer';
import ProcessingLoader from './ProcessingLoader';

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

  // 상태 결정
  const state: 'processing' | 'recording' | 'idle' = isProcessing
    ? 'processing'
    : isRecording
      ? 'recording'
      : 'idle';
  const isStateRecording = !isProcessing && isRecording;
  const isStateProcessing = isProcessing;

  return (
    <div
      data-meeting-recorder-block={blockId}
      className={`absolute bg-white border-[3px] border-black overflow-hidden ${
        isHighlighted ? 'outline outline-2 outline-indigo-500/35' : ''
      }`}
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
        ...(isHighlighted
          ? { backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.06), rgba(99, 102, 241, 0.06))' }
          : null),
      }}
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
                    title="녹음 시작"
                  >
                    <img
                      src="/assets/icons/mic_pixel.png"
                      width={40}
                      height={40}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      style={{ imageRendering: 'pixelated' }}
                    />
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
                  tone="orange"
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
              style={{ minWidth: '18px', minHeight: '18px' }}
            >
              <PixelIcon name="stop" size={8} className="text-white" />
            </button>
          )}
        </div>

        {/* 노트패드 (스크립트/요약) */}
        <div className="w-1/2 p-4 overflow-y-auto bg-white">
          <div className="h-full">
            {script || summary ? (
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
                {script && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <PixelIcon name="file" size={16} className="text-gray-600" />
                      전체 스크립트
                    </h3>
                    <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-white p-3 border-[2px] border-black max-h-48 overflow-y-auto">
                      {script}
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
                    <ProcessingLoader size={32} variant="panel" tone="orange" label="음성을 텍스트로 변환 중..." />
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
