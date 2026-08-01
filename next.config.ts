import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // TLS terminates at nginx; the app still emits HSTS so the browser
          // pins https regardless of proxy config.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Clickjacking guard. frame-ancestors 'self' still allows the OBS
          // embed use case (OBS browser sources send no ancestor origin and
          // are not subject to CSP frame-ancestors the way iframes are).
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
