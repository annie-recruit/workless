import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;
const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
  ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
  : 0.1;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate,
  sendDefaultPii: false,
  beforeSend(event) {
    // 서버 로그에서 민감한 데이터 제거
    if (event.request && event.request.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    if (event.user) {
      if (event.user.email) event.user.email = '[filtered]';
    }
    return event;
  },
});
