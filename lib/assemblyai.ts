/**
 * AssemblyAI Universal Streaming (v3) 실시간 음성 인식
 * 
 * 특징:
 * - WebSocket 기반 실시간 스트리밍
 * - 초당 과금 ($0.0025/분)
 * - 무료: 333시간/월
 * - 낮은 지연 시간 (<500ms)
 * - Immutable transcription
 */

export interface TurnEvent {
  type: 'Turn';
  turn_order: number;
  turn_is_formatted: boolean;
  end_of_turn: boolean;
  transcript: string;
  end_of_turn_confidence: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    word_is_final: boolean;
  }>;
}

export interface BeginEvent {
  type: 'Begin';
  id: string;
  expires_at: number;
}

export interface TerminationEvent {
  type: 'Termination';
  audio_duration_seconds: number;
  session_duration_seconds: number;
}

export type StreamingMessage = TurnEvent | BeginEvent | TerminationEvent;

export class AssemblyAIRealtimeClient {
  private socket: WebSocket | null = null;
  private token: string;
  private onTranscript?: (transcript: string, isFinal: boolean) => void;
  private onError?: (error: Error) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(
    token: string,
    callbacks: {
      onTranscript?: (transcript: string, isFinal: boolean) => void;
      onError?: (error: Error) => void;
    }
  ) {
    this.token = token;
    this.onTranscript = callbacks.onTranscript;
    this.onError = callbacks.onError;
  }

  /**
   * WebSocket 연결 시작
   */
  async connect(sampleRate: number = 16000): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Universal Streaming v3 엔드포인트 (한국어 설정 추가)
        const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=${sampleRate}&encoding=pcm_s16le&format_turns=true&language_code=ko&token=${this.token}`;
        
        console.log('[AssemblyAI] WebSocket 연결 시도 (한국어):', wsUrl.split('token=')[0] + 'token=***');
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('[AssemblyAI] WebSocket 연결 성공');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[AssemblyAI] 수신 메시지:', data);

            if (data.type === 'Begin') {
              console.log('[AssemblyAI] 세션 시작:', data.id);
            } else if (data.type === 'Turn') {
              // Turn 이벤트 - transcript 업데이트
              if (data.transcript) {
                const isFinal = data.end_of_turn || data.turn_is_formatted;
                this.onTranscript?.(data.transcript, isFinal);
              }
            } else if (data.type === 'Termination') {
              console.log('[AssemblyAI] 세션 종료:', data.audio_duration_seconds, '초 처리됨');
            }
          } catch (error) {
            console.error('[AssemblyAI] 메시지 파싱 실패:', error, event.data);
          }
        };

        this.socket.onerror = (event) => {
          console.error('[AssemblyAI] WebSocket 오류 상세:', {
            type: event.type,
            timeStamp: event.timeStamp,
            readyState: this.socket?.readyState
          });
          this.onError?.(new Error('WebSocket connection error'));
          reject(event);
        };

        this.socket.onclose = (event) => {
          console.log('[AssemblyAI] WebSocket 연결 종료:', event.code, event.reason);
          
          // 비정상 종료 시 재연결 시도
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[AssemblyAI] 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            setTimeout(() => this.connect(sampleRate), 1000 * this.reconnectAttempts);
          }
        };
      } catch (error) {
        console.error('[AssemblyAI] 연결 실패:', error);
        reject(error);
      }
    });
  }

  /**
   * 오디오 데이터 전송 (바이너리)
   */
  sendAudio(audioData: ArrayBuffer): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Universal Streaming v3는 바이너리 데이터를 직접 전송
      this.socket.send(audioData);
    } catch (error) {
      console.error('[AssemblyAI] 오디오 전송 실패:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * 연결 종료
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[AssemblyAI] 연결 종료 요청');
      
      // 정상 종료 메시지 전송
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'Terminate' }));
      }
      
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}
