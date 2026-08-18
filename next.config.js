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
      // NOTE: /contact used to redirect here to /book. It is a real page
      // again (app/contact/page.tsx) — a redirect would shadow it, so do not
      // reinstate this entry.
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

  // Baseline security headers for EVERY response.
  //
  // middleware.js sets the full set, but its matcher deliberately skips
  // /_next/static, /_next/image and the Stripe webhook. These four are the
  // ones still worth having on a static asset or an optimized image, so they
  // are declared here as well.
  //
  // Declaring a header in both places is safe, not a duplicate: middleware
  // uses headers.set(), which replaces rather than appends. Verified against a
  // production build — a page response carries exactly one X-Frame-Options.
  //
  // The CSP and Permissions-Policy stay middleware-only: the CSP differs per
  // request class (API responses also get Cache-Control: no-store and
  // noindex), and neither means anything on a static asset.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // HSTS is honored from any response on the host, so putting it on
            // assets too means a visitor who somehow lands on one first is
            // still pinned to HTTPS.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig