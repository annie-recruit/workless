const withPWA = require('next-pwa');

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Turbopack 비활성화 (PWA 호환성)
  turbopack: {},
};

module.exports = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
