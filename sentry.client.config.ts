import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const tracesSampleRate = process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
  ? Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
  : 0.1;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate,
  sendDefaultPii: false,
  beforeSend(event) {
    // 개인정보 패턴 (이메일 등) 마스킹
    if (event.user) {
      if (event.user.email) event.user.email = '[filtered]';
      if (event.user.ip_address) event.user.ip_address = '[filtered]';
    }
    return event;
  },
});
