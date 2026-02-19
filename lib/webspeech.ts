/**
 * Web Speech API 실시간 음성 인식
 * 
 * 특징:
 * - 브라우저 내장 API (무료)
 * - 실시간 스트리밍
 * - 한국어 지원
 * - 중간 결과 + 최종 결과
 */

export class WebSpeechRealtimeClient {
  private recognition: any = null;
  private onTranscript?: (transcript: string, isFinal: boolean) => void;
  private onError?: (error: Error) => void;
  private isListening = false;

  constructor(
    callbacks: {
      onTranscript?: (transcript: string, isFinal: boolean) => void;
      onError?: (error: Error) => void;
    }
  ) {
    this.onTranscript = callbacks.onTranscript;
    this.onError = callbacks.onError;
  }

  /**
   * 음성 인식 시작
   */
  async connect(language: string = 'ko-KR'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Web Speech API 지원 확인
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
          const error = new Error('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome, Edge, Safari를 사용해주세요.');
          this.onError?.(error);
          reject(error);
          return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = language;
        this.recognition.continuous = true; // 연속 인식
        this.recognition.interimResults = true; // 중간 결과 받기
        this.recognition.maxAlternatives = 1;

        // 결과 수신
        this.recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            const isFinal = result.isFinal;

            console.log(`[WebSpeech] ${isFinal ? 'Final' : 'Interim'}:`, transcript);
            this.onTranscript?.(transcript, isFinal);
          }
        };

        // 오류 처리
        this.recognition.onerror = (event: any) => {
          console.error('[WebSpeech] 오류:', event.error);
          
          // 무시해도 되는 오류들
          if (event.error === 'no-speech') {
            console.log('[WebSpeech] 음성이 감지되지 않았습니다. (정상)');
            return;
          }
          
          if (event.error === 'aborted') {
            console.log('[WebSpeech] 음성 인식이 중단되었습니다. (정상)');
            return;
          }
          
          // network 오류는 경고만 하고 재시도
          if (event.error === 'network') {
            console.warn('[WebSpeech] 네트워크 오류 발생. 재시도 중...');
            if (this.isListening) {
              setTimeout(() => {
                try {
                  this.recognition?.start();
                } catch (e) {
                  console.error('[WebSpeech] 재시도 실패:', e);
                }
              }, 1000);
            }
            return;
          }
          
          // 치명적인 오류만 전달
          const error = new Error(`음성 인식 오류: ${event.error}`);
          this.onError?.(error);
        };

        // 종료 시 자동 재시작 (continuous mode 유지)
        this.recognition.onend = () => {
          console.log('[WebSpeech] 세션 종료');
          if (this.isListening && this.recognition) {
            console.log('[WebSpeech] 자동 재시작 중...');
            setTimeout(() => {
              try {
                if (this.isListening && this.recognition) {
                  this.recognition.start();
                  console.log('[WebSpeech] 재시작 완료');
                }
              } catch (error) {
                console.error('[WebSpeech] 재시작 실패:', error);
                // 이미 시작된 경우는 무시
                if (!(error as Error).message.includes('already')) {
                  console.error('[WebSpeech] 치명적인 재시작 오류');
                }
              }
            }, 100); // 100ms 대기 후 재시작
          }
        };

        // 시작 준비 완료 이벤트
        this.recognition.onstart = () => {
          console.log('[WebSpeech] 음성 인식 활성화됨');
        };

        // 시작
        try {
          this.recognition.start();
          this.isListening = true;
          console.log('[WebSpeech] 음성 인식 시작 요청 (언어:', language + ')');
          resolve();
        } catch (error) {
          console.error('[WebSpeech] 시작 실패:', error);
          reject(error);
        }
      } catch (error) {
        console.error('[WebSpeech] 초기화 실패:', error);
        this.onError?.(error as Error);
        reject(error);
      }
    });
  }

  /**
   * 음성 인식 중지
   */
  disconnect(): void {
    if (this.recognition) {
      console.log('[WebSpeech] 음성 인식 중지');
      this.isListening = false;
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('[WebSpeech] 중지 실패:', error);
      }
      this.recognition = null;
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.isListening && this.recognition !== null;
  }
}
