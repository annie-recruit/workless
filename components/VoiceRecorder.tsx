'use client';

import { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
  onTranscriptionComplete: (script: string, summary: string) => void;
  onStateChange?: (isRecording: boolean, isProcessing: boolean, time: number) => void;
}

export default function VoiceRecorder({ onTranscriptionComplete, onStateChange }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      onStateChange?.(true, false, 0);

      // 타이머 시작
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          onStateChange?.(true, false, newTime);
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      alert('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onStateChange?.(false, true, recordingTime);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
          onTranscriptionComplete(data.script, data.summary);
          onStateChange?.(false, false, 0);
        } else {
          alert('음성을 텍스트로 변환하지 못했습니다.');
          onStateChange?.(false, false, 0);
        }
      } else {
        const error = await res.json();
        alert(error.error || '음성 변환 실패');
        onStateChange?.(false, false, 0);
      }
    } catch (error) {
      console.error('음성 변환 실패:', error);
      alert('음성 변환 중 오류가 발생했습니다.');
      onStateChange?.(false, false, 0);
    } finally {
      setIsProcessing(false);
    }
  };

  // 외부에서 녹음 제어를 위한 메서드 노출
  useEffect(() => {
    // 컴포넌트가 마운트되면 녹음 시작
    startRecording();
    
    return () => {
      // 언마운트 시 녹음 중지
      if (isRecording) {
        stopRecording();
      }
    };
  }, []);

  return null; // 인라인 컴포넌트이므로 UI 렌더링 안 함
}
