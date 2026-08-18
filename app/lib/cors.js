// app/lib/cors.js
//
// Cross-origin policy for the API routes.
//
// Several routes previously answered every request with
// `Access-Control-Allow-Origin: *`, which let any website on the internet
// call them from a visitor's browser — including /api/payment/create-intent
// (creates Stripe PaymentIntents) and /api/booking-request (writes booking
// rows and uploaded ID documents). Nothing here uses cookie authentication,
// so this was not a classic CSRF hole, but the wildcard turned every endpoint
// into a public API that third-party pages could drive and read.
//
// The booking flow is entirely same-origin: the app's own pages call its own
// routes, and same-origin requests do not need CORS headers at all. So the
// policy is an allowlist — the production site, any Vercel preview
// deployment for this project, and localhost during development. An origin
// that isn't on the list simply gets no CORS headers back, and the browser
// blocks the response.

const PRODUCTION_ORIGINS = [
  'https://merrittwellness.net',
  'https://www.merrittwellness.net',
];

// Set NEXT_PUBLIC_SITE_URL when the canonical domain differs (staging, a
// domain change). Same env var the email templates already read.
function configuredOrigin() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

// Vercel sets VERCEL_URL to the deployment's own hostname, so preview
// deployments can call their own API without hard-coding every preview URL.
function vercelOrigin() {
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
}

export function isAllowedOrigin(origin) {
  if (!origin) return false;

  const allowed = [
    ...PRODUCTION_ORIGINS,
    configuredOrigin(),
    vercelOrigin(),
  ].filter(Boolean);

  if (allowed.includes(origin)) return true;

  // Local development only — never in a production deployment.
  if (process.env.NODE_ENV !== 'production') {
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  }

  return false;
}

// Headers to merge into a route's response.
//
// Returns {} for a same-origin request (no Origin header, or an origin that
// matches the request's own host) — those need no CORS headers — and {} for a
// disallowed origin, which is what makes the browser reject the response.
//
// `Vary: Origin` is always set on cross-origin-capable routes so a CDN can't
// serve one origin's allow header to another.
export function corsHeaders(request, { methods = 'POST, OPTIONS' } = {}) {
  const origin = request?.headers?.get('origin') || '';

  if (!origin || !isAllowedOrigin(origin)) {
    return { Vary: 'Origin' };
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// Standard preflight response for a route.
export function corsPreflight(request, options) {
  return new Response(null, { status: 204, headers: corsHeaders(request, options) });
}
