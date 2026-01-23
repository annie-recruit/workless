const withPWA = require('next-pwa');

// 개발 환경에서 NEXTAUTH_URL 자동 설정
if (process.env.NODE_ENV === 'development' && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Turbopack 비활성화 (PWA 호환성)
  turbopack: {},
  // 외부 이미지 도메인 허용 (Google 프로필 이미지용)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  // 환경 변수 설정
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined),
  },
};

// 번들 분석기 설정 (조건부 로드)
let config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);

if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  config = withBundleAnalyzer(config);
}

module.exports = config;
