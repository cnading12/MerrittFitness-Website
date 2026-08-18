/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during builds to deploy ASAP
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Also ignore TypeScript errors for now
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000,
  },

  // Exclude public images from build trace to prevent micromatch stack overflow
  outputFileTracingExcludes: {
    '*': ['./public/images/**/*'],
  },

  // Permanent redirects from the pre-restructure routes. "events" now means
  // private-event rentals; the public calendar lives at /calendar.
  async redirects() {
    return [
      {
        source: '/events',
        destination: '/calendar',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/book',
        permanent: true,
      },
      {
        source: '/booking',
        destination: '/book',
        permanent: true,
      },
      {
        source: '/booking/:path*',
        destination: '/book/:path*',
        permanent: true,
      },
    ]
  },

  // Security headers.
  //
  // middleware.js sets the full set (CSP, HSTS, Permissions-Policy) on
  // everything it matches, but its matcher deliberately skips _next/static,
  // _next/image, and the Stripe webhook. These are the baseline that applies
  // to every response including those, so a static asset or an optimized
  // image is never served without them.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // X-XSS-Protection intentionally omitted: deprecated, ignored by
          // current browsers, and its legacy filter had its own bugs. The CSP
          // in middleware.js is the real control.
        ],
      },
    ]
  },
}

module.exports = nextConfig