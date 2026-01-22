'use client';

import { useEffect } from 'react';
import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

export default function WebVitals() {
  useEffect(() => {
    // 개발 환경에서만 콘솔에 출력
    const logMetric = (metric: Metric) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Web Vitals] ${metric.name}:`, {
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
        });
      }
      
      // 프로덕션에서는 분석 도구로 전송 가능
      // 예: Google Analytics, Sentry 등
      if (process.env.NODE_ENV === 'production') {
        // gtag('event', metric.name, {
        //   value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        //   event_label: metric.id,
        //   non_interaction: true,
        // });
      }
    };

    onCLS(logMetric);
    onFID(logMetric);
    onFCP(logMetric);
    onLCP(logMetric);
    onTTFB(logMetric);
    onINP(logMetric);
  }, []);

  return null;
}
