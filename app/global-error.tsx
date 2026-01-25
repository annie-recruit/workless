'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [eventId, setEventId] = useState<string | undefined>();

  useEffect(() => {
    const id = Sentry.withScope((scope) => {
      if (error.digest) scope.setTag('next.error.digest', error.digest);
      scope.setLevel('error');
      return Sentry.captureException(error);
    });

    if (typeof id === 'string') {
      const t = window.setTimeout(() => setEventId(id), 0);
      return () => window.clearTimeout(t);
    }
  }, [error]);

  return (
    <html lang="ko">
      <body className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-2xl border border-red-100 bg-white shadow-sm p-6">
          <h1 className="text-xl font-semibold text-gray-900">치명적인 오류가 발생했어요</h1>
          <p className="mt-2 text-sm text-gray-600">
            아래 오류 ID를 알려주면 빠르게 확인할게요.
          </p>

          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm">
            <div className="text-gray-700">
              <span className="font-medium">오류 메시지:</span> {error.message || '(메시지 없음)'}
            </div>
            {error.digest ? (
              <div className="mt-1 text-gray-700">
                <span className="font-medium">Digest:</span> {error.digest}
              </div>
            ) : null}
            {eventId ? (
              <div className="mt-1 text-gray-700">
                <span className="font-medium">Sentry Event ID:</span> {eventId}
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
            >
              다시 시도
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
            >
              새로고침
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
