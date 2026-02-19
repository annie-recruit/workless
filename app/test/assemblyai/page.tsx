'use client';

import { useState, useRef, useEffect } from 'react';
import { AssemblyAIRealtimeClient } from '@/lib/assemblyai';

export default function AssemblyAITest() {
  const [isRecording, setIsRecording] = useState(false);
  const [liveScript, setLiveScript] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  
  const clientRef = useRef<AssemblyAIRealtimeClient | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startRecording = async () => {
    try {
      setError('');
      setLiveScript('');
      setSummary('');

      // 마이크 접근
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // API 키 가져오기
      const response = await fetch('/api/assemblyai/token');
      const { token } = await response.json();

      // AssemblyAI 클라이언트 초기화
      const client = new AssemblyAIRealtimeClient(token, {
        onTranscript: (text, isFinal) => {
          console.log(`[${isFinal ? 'Final' : 'Partial'}]`, text);
          
          setLiveScript((prev) => {
            if (isFinal) {
              // 최종 결과는 새 줄로 추가
              return prev + (prev ? '\n' : '') + text;
            } else {
              // 부분 결과는 마지막 줄 업데이트
              const lines = prev.split('\n');
              if (lines.length > 0 && !lines[lines.length - 1].endsWith('.')) {
                lines[lines.length - 1] = text;
                return lines.join('\n');
              }
              return prev + (prev ? ' ' : '') + text;
            }
          });
        },
        onError: (err) => {
          console.error('AssemblyAI Error:', err);
          setError(err.message);
        },
      });

      await client.connect(16000);
      clientRef.current = client;

      // 오디오 프로세싱 설정
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (!client.isConnected()) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Float32 to Int16 변환
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // 바이너리로 직접 전송
        client.sendAudio(int16Data.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      processorRef.current = processor;

      setIsRecording(true);
    } catch (err: any) {
      console.error('Start Recording Error:', err);
      setError(err.message || '녹음 시작 실패');
    }
  };

  const stopRecording = async () => {
    try {
      // AssemblyAI 연결 종료
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }

      // 오디오 컨텍스트 정리
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // 스트림 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      setIsRecording(false);

      // 요약 생성
      if (liveScript) {
        const response = await fetch('/api/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script: liveScript }),
        });

        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (err: any) {
      console.error('Stop Recording Error:', err);
      setError(err.message || '녹음 중지 실패');
    }
  };

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 정리
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">AssemblyAI 실시간 스트리밍 테스트</h1>
        <p className="text-gray-600 mb-8">
          실시간 음성 인식 테스트 (초당 약 0.004원)
        </p>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-4 mb-6">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
              >
                🎤 녹음 시작
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
              >
                ⏹ 녹음 중지
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-semibold">오류: {error}</p>
            </div>
          )}

          {isRecording && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-600 font-semibold">● 녹음 중...</p>
            </div>
          )}
        </div>

        {liveScript && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>📝 실시간 스크립트</span>
              {isRecording && (
                <span className="text-sm text-green-500 font-normal animate-pulse">
                  ● LIVE
                </span>
              )}
            </h2>
            <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap max-h-96 overflow-y-auto">
              {liveScript}
            </div>
          </div>
        )}

        {summary && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">📊 AI 요약</h2>
            <div className="p-4 bg-yellow-50 rounded-lg whitespace-pre-wrap">
              {summary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
