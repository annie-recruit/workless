/**
 * 클라이언트 사이드 API 유틸리티
 *
 * 반복되는 fetch 패턴을 추상화하여:
 * - JSON 헤더 자동 설정
 * - 응답 파싱 + 에러 핸들링 통합
 * - 타입 안전한 반환값
 */

import { JSON_HEADERS } from './constants';

/** API 에러를 나타내는 클래스 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 공통 fetch 래퍼 — 성공 시 JSON 파싱, 실패 시 ApiError throw */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    let errorData: unknown;
    try {
      errorData = await res.json();
    } catch {
      errorData = await res.text().catch(() => null);
    }
    const message =
      (errorData as any)?.error ?? `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, errorData);
  }

  return res.json() as Promise<T>;
}

/** GET 요청 */
export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url);
}

/** POST 요청 (JSON body) */
export function apiPost<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

/** PUT 요청 (JSON body) */
export function apiPut<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

/** DELETE 요청 */
export function apiDelete<T = void>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' });
}
