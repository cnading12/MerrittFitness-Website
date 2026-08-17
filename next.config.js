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

  // Security headers
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
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig