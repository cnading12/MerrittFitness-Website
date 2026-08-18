// middleware.js
//
// Security headers for every response, plus the Stripe-webhook bypass.
//
// The webhook bypass is load-bearing: Stripe signs the RAW request body, so
// anything that touches the body or the response stream on that path breaks
// signature verification. Leave it first.

import { NextResponse } from 'next/server'

// Content-Security-Policy.
//
// Built as an object so each directive can carry its own justification.
//
// Note on `'unsafe-inline'` in script-src: every marketing page injects
// JSON-LD structured data through `dangerouslySetInnerHTML`, and Next's App
// Router emits inline hydration scripts. Removing it means switching to a
// per-request nonce, which forces every page out of static rendering and into
// dynamic — a real cost for an SEO-driven venue site. The XSS exposure it
// leaves is small here because React escapes all interpolated values and the
// structured-data blocks are built from static site data, not renter input.
// If that ever changes (a page rendering renter-supplied HTML), move to a
// nonce: generate one here, pass it through a request header, and read it in
// the layouts that emit inline scripts.
//
// Everything else is locked down, and the directives that actually stop the
// attacks this site is exposed to — clickjacking of the payment page, a
// injected <base> rewriting form targets, a form posted to an attacker's
// domain, an injected plugin/object — carry no such caveat.
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],

  // Stripe.js must load from Stripe's own CDN — it is the only permitted
  // third-party script origin.
  'script-src': ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],

  // Stripe injects styles for its Payment Element; Google Fonts serves the
  // site's typeface stylesheet; Tailwind emits inline style attributes.
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],

  // next/image emits data: and blob: URLs; Unsplash is the configured remote
  // image host (see next.config.js remotePatterns).
  'img-src': ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],

  // XHR/fetch targets: the site's own API and Stripe's.
  'connect-src': ["'self'", 'https://api.stripe.com', 'https://js.stripe.com'],

  // Stripe renders its card/bank fields inside iframes it owns.
  'frame-src': ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],

  // No Flash/Java/plugin content anywhere.
  'object-src': ["'none'"],

  // Blocks an injected <base href> from silently repointing every relative
  // URL on the page — including the form that submits a renter's ID photo.
  'base-uri': ["'self'"],

  // A form on this site may only post to this site. Without it, an injected
  // form tag can exfiltrate whatever the renter types.
  'form-action': ["'self'"],

  // Clickjacking defense, and the modern replacement for X-Frame-Options:
  // nobody may frame the booking or payment pages.
  'frame-ancestors': ["'none'"],

  // Any http:// subresource that slipped in gets fetched over https instead
  // of failing or downgrading the page.
  'upgrade-insecure-requests': [],
};

const CSP_HEADER = Object.entries(CSP_DIRECTIVES)
  .map(([directive, values]) => (values.length ? `${directive} ${values.join(' ')}` : directive))
  .join('; ');

// Browser features this site never uses. Denying them means an injected
// script (or an embedded third party) cannot prompt a renter for their
// camera, microphone, or location under the venue's domain.
const PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'interest-cohort=()',
  'payment=(self "https://js.stripe.com")',
].join(', ');

export function middleware(request) {
  // CRITICAL: Skip middleware for webhook endpoints
  // Webhooks need raw request bodies and can't have any interference
  if (request.nextUrl.pathname.startsWith('/api/webhooks/') ||
      request.nextUrl.pathname.startsWith('/api/stripe-webhook')) {
    console.log('⚡ Bypassing middleware for webhook:', request.nextUrl.pathname);
    return NextResponse.next();
  }

  // Create response
  const response = NextResponse.next();

  const isApi = request.nextUrl.pathname.startsWith('/api/');

  // Add security headers
  response.headers.set('Content-Security-Policy', CSP_HEADER);
  response.headers.set('Permissions-Policy', PERMISSIONS_POLICY);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Pin the site to HTTPS for two years, subdomains included. Vercel already
  // redirects http→https, but the redirect itself is one plaintext request an
  // active network attacker can intercept; HSTS removes that first hop after
  // the browser's initial visit.
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  if (isApi) {
    // API responses carry booking data and PII — never let a shared cache or
    // a CDN hold on to them.
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    // Keep API endpoints out of search results; the marketing pages below
    // still opt in explicitly.
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  } else {
    response.headers.set('X-Robots-Tag', 'index, follow');
  }

  // Note: X-XSS-Protection was removed. The header is deprecated, ignored by
  // every current browser, and its legacy filter introduced vulnerabilities of
  // its own — the CSP above is what actually does this job now.

  // Get user agent for security checks
  const userAgent = request.headers.get('user-agent') || '';

  // Block obvious scanner user agents. This is cosmetic — any real attacker
  // sets a normal UA — but it trims the noise in the logs.
  const suspiciousPatterns = [
    'sqlmap', 'nikto', 'scanner', 'hack'
  ];

  const isSuspicious = suspiciousPatterns.some(pattern =>
    userAgent.toLowerCase().includes(pattern)
  );

  if (isSuspicious) {
    console.log('🚫 Blocked suspicious request:', userAgent);
    return new Response('Access Denied', { status: 403 });
  }

  // Log API requests for monitoring (but not webhooks)
  if (isApi) {
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    console.log('📊 API request from:', ip, 'to:', request.nextUrl.pathname);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - webhooks (Stripe and other webhook endpoints)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/stripe-webhook).*)',
  ],
};
