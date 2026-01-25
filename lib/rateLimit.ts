// Rate limiting utility for API endpoints
// 키 기준으로 60 req/min 제한
// TODO(Scale): 현재는 인메모리(Map) 기반이라 서버 인스턴스가 늘어나면 제한이 공유되지 않음.
//              Redis/Upstash 같은 외부 스토어로 전환해 전역 rate limit을 적용하는 지점을 마련해야 함.

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// 주기적으로 만료된 항목 정리 (메모리 누수 방지)
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // 1분마다 정리

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
}

/**
 * Rate limit 체크
 * @param key - 제한 대상 키 (API 키, IP 등)
 * @param limit - 분당 최대 요청 수 (기본: 60)
 * @param windowMs - 시간 윈도우 (기본: 60000ms = 1분)
 */
export function checkRateLimit(
    key: string,
    limit: number = 60,
    windowMs: number = 60000
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        // 새 윈도우 시작
        const resetTime = now + windowMs;
        rateLimitStore.set(key, { count: 1, resetTime });
        return {
            allowed: true,
            remaining: limit - 1,
            resetTime,
        };
    }

    // 기존 윈도우 내
    if (entry.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime,
        };
    }

    // 카운트 증가
    entry.count++;
    rateLimitStore.set(key, entry);

    return {
        allowed: true,
        remaining: limit - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Rate limit 리셋 (테스트용)
 */
export function resetRateLimit(key: string): void {
    rateLimitStore.delete(key);
}
