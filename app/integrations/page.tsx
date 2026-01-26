'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ProcessingLoader from '@/components/ProcessingLoader';
import PixelIcon from '@/components/PixelIcon';

const SHORTCUT_URL = '/shortcuts/Send to Workless.shortcut';
const SHORTCUT_DOWNLOAD_URL = 'https://workless-production.up.railway.app/shortcuts/Send%20to%20Workless.shortcut';

export default function IntegrationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchApiKey();
    }
  }, [session]);

  const fetchApiKey = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/api-key');
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
      }
    } catch (error) {
      console.error('Failed to fetch API key:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/user/api-key', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
      } else {
        alert('API 키 생성 실패');
      }
    } catch (error) {
      console.error('Failed to generate API key:', error);
      alert('API 키 생성 중 오류 발생');
    } finally {
      setGenerating(false);
    }
  };

  const regenerateApiKey = async () => {
    if (!confirm('기존 API 키가 무효화됩니다. 계속하시겠습니까?')) return;
    
    setGenerating(true);
    try {
      const res = await fetch('/api/user/api-key', { method: 'PUT' });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
        alert('새 API 키가 생성되었습니다!');
      } else {
        alert('API 키 재생성 실패');
      }
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
      alert('API 키 재생성 중 오류 발생');
    } finally {
      setGenerating(false);
    }
  };

  const copyApiKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-indigo-50 flex items-center justify-center">
        <ProcessingLoader size={64} variant="overlay" tone="indigo" label="로딩 중..." />
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-indigo-50 font-galmuri11">
      {/* 헤더 */}
      <header className="bg-indigo-600 border-b-2 border-indigo-500">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-black text-white mb-2 tracking-tighter uppercase">
                단축어 연동
              </h1>
              <div className="flex items-center gap-3">
                <div className="h-0.5 w-12 bg-white"></div>
                <p className="text-white/90 text-sm">
                  어디서든 Workless로 메모 보내기
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-white text-indigo-600 font-bold hover:bg-indigo-50 transition-colors"
              style={{ borderRadius: '2px' }}
            >
              ← 홈으로
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Step 1: API 키 생성 */}
        <section className="mb-12">
          <div className="bg-white border-2 border-indigo-200 p-8" style={{ borderRadius: '2px' }}>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-500 flex items-center justify-center flex-shrink-0" style={{ borderRadius: '2px' }}>
                <span className="text-2xl font-black text-white">1</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">API 키 발급</h2>
                <p className="text-gray-600 text-sm">
                  단축어에서 사용할 개인 API 키를 생성하세요
                </p>
              </div>
            </div>

            {!apiKey ? (
              <button
                onClick={generateApiKey}
                disabled={generating}
                className="w-full py-4 bg-indigo-500 text-white font-bold hover:bg-indigo-600 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                style={{ borderRadius: '2px' }}
              >
                {generating ? (
                  <>
                    <ProcessingLoader size={20} variant="inline" tone="indigo" />
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <PixelIcon name="key" size={20} />
                    <span>API 키 생성하기</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 border-2 border-gray-300 p-4" style={{ borderRadius: '2px' }}>
                  <div className="flex items-center justify-between gap-4">
                    <code className="text-sm text-gray-800 font-mono break-all flex-1">
                      {apiKey}
                    </code>
                    <button
                      onClick={copyApiKey}
                      className="px-4 py-2 bg-orange-400 text-white font-bold hover:bg-orange-500 transition-colors flex-shrink-0"
                      style={{ borderRadius: '2px' }}
                    >
                      {copied ? '✓ 복사됨' : '복사'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={regenerateApiKey}
                  disabled={generating}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  API 키 재발급 (기존 키 무효화)
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: 단축어 설치 */}
        <section className="mb-12">
          <div className="bg-white border-2 border-orange-200 p-8" style={{ borderRadius: '2px' }}>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-orange-400 flex items-center justify-center flex-shrink-0" style={{ borderRadius: '2px' }}>
                <span className="text-2xl font-black text-white">2</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">단축어 만들기</h2>
                <p className="text-gray-600 text-sm">
                  아래 코드를 복사해서 Shortcuts 앱에 붙여넣으세요
                </p>
              </div>
            </div>

            {apiKey && (
              <div className="space-y-4">
                {/* 복사 가능한 설정 코드 */}
                <div className="bg-gray-900 text-green-400 p-6 font-mono text-sm overflow-x-auto" style={{ borderRadius: '2px' }}>
                  <div className="space-y-2">
                    <div className="text-gray-500">{'// 1. Shortcuts 앱 열기'}</div>
                    <div className="text-gray-500">{'// 2. + 버튼 → 새로운 단축어'}</div>
                    <div className="text-gray-500">{'// 3. 아래 설정 따라하기:'}</div>
                    <div className="mt-4 text-white">
                      <div>텍스트: <span className="text-yellow-400">{apiKey}</span></div>
                      <div>↓</div>
                      <div>변수 설정: API_KEY</div>
                      <div>↓</div>
                      <div>현재 날짜</div>
                      <div>↓</div>
                      <div>텍스트: ios-shortcut:[현재 날짜]</div>
                      <div>↓</div>
                      <div>사전:</div>
                      <div className="pl-4">
                        <div>text: 단축어 입력</div>
                        <div>source: ios-shortcut</div>
                        <div>title: iOS Share</div>
                        <div>dedupeKey: 위 텍스트</div>
                      </div>
                      <div>↓</div>
                      <div>URL 콘텐츠 가져오기:</div>
                      <div className="pl-4">
                        <div>URL: workless-production.up.railway.app api inbox</div>
                        <div>Method: POST</div>
                        <div>Headers:</div>
                        <div className="pl-4">
                          <div>Authorization: Bearer [API_KEY]</div>
                          <div>{'Content-Type: application/json'}</div>
                        </div>
                        <div>Body: 위 사전</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 p-4" style={{ borderRadius: '2px' }}>
                  <p className="text-sm text-indigo-900 font-bold mb-2">💡 빠른 설정:</p>
                  <ol className="text-sm text-indigo-800 space-y-1 pl-4">
                    <li>1. Shortcuts 앱 → 새 단축어</li>
                    <li>2. 위 설정 따라 액션 추가</li>
                    <li>3. 이름: &quot;Send to Workless&quot;</li>
                    <li>4. 공유 시트 활성화</li>
                    <li>5. 완료!</li>
                  </ol>
                </div>

                <button
                  onClick={() => {
                    const apiUrl = 'https://workless-production.up.railway.app/api/inbox';
                    const config = `API_KEY="${apiKey}"
URL="${apiUrl}"

단축어 구성:
1. 텍스트: ${apiKey}
2. 변수 설정: API_KEY
3. 현재 날짜
4. 텍스트: ios-shortcut:[현재 날짜]
5. 사전 (text, source, title, dedupeKey)
6. URL 콘텐츠 가져오기 (POST)
   - Authorization: Bearer [API_KEY]
   - Body: 위 사전`;
                    
                    navigator.clipboard.writeText(config);
                    alert('설정이 클립보드에 복사되었습니다!');
                  }}
                  className="w-full py-3 bg-orange-400 text-white font-bold hover:bg-orange-500 transition-colors"
                  style={{ borderRadius: '2px' }}
                >
                  📋 설정 복사하기
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Step 3: 사용 방법 */}
        <section className="mb-12">
          <div className="bg-white border-2 border-indigo-200 p-8" style={{ borderRadius: '2px' }}>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-500 flex items-center justify-center flex-shrink-0" style={{ borderRadius: '2px' }}>
                <span className="text-2xl font-black text-white">3</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">사용 방법</h2>
                <p className="text-gray-600 text-sm">
                  다양한 방법으로 Workless에 메모를 보낼 수 있습니다
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* 사용 방법 1 */}
              <div className="border-l-4 border-orange-400 pl-4">
                <h3 className="font-bold text-gray-900 mb-2">✨ 어디서든 텍스트 공유</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Safari, 메모, 메일 등 어떤 앱에서든:
                </p>
                <ol className="text-sm text-gray-600 space-y-1 pl-4">
                  <li>1. 텍스트 선택</li>
                  <li>2. 공유 버튼 클릭</li>
                  <li>3. "Send to Workless" 선택</li>
                  <li>4. 자동으로 Workless에 저장됨!</li>
                </ol>
              </div>

              {/* 사용 방법 2 */}
              <div className="border-l-4 border-indigo-400 pl-4">
                <h3 className="font-bold text-gray-900 mb-2">⚡️ 빠른 메모</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Spotlight로 즉시 메모:
                </p>
                <ol className="text-sm text-gray-600 space-y-1 pl-4">
                  <li>1. ⌘ + Space (Spotlight)</li>
                  <li>2. "Send to Workless" 입력</li>
                  <li>3. 메모 작성 후 완료</li>
                </ol>
              </div>

              {/* 사용 방법 3 */}
              <div className="border-l-4 border-orange-400 pl-4">
                <h3 className="font-bold text-gray-900 mb-2">🔗 URL과 함께 저장</h3>
                <p className="text-sm text-gray-700 mb-2">
                  웹페이지와 함께 메모:
                </p>
                <ol className="text-sm text-gray-600 space-y-1 pl-4">
                  <li>1. Safari에서 공유 버튼</li>
                  <li>2. "Send to Workless" 선택</li>
                  <li>3. URL과 선택한 텍스트가 함께 저장됨</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* 보안 안내 */}
        <section>
          <div className="bg-gray-50 border-2 border-gray-300 p-6" style={{ borderRadius: '2px' }}>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>🔒</span>
              <span>보안 안내</span>
            </h3>
            <ul className="text-sm text-gray-700 space-y-2 pl-6">
              <li>• API 키는 비밀번호처럼 안전하게 보관하세요</li>
              <li>• API 키가 노출되었다면 즉시 재발급하세요</li>
              <li>• 단축어는 여러분의 기기에서만 실행됩니다</li>
              <li>• 데이터는 안전하게 암호화되어 전송됩니다</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
