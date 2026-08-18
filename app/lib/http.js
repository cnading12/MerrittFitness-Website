// app/lib/http.js
//
// Shared HTTP concerns for the API routes: CORS and request-size guarding.
//
// CORS
// ----
// Every API route used to answer with `Access-Control-Allow-Origin: *`, which
// let any website on the internet read the responses — booking records, Stripe
// client secrets, pricing. Nothing in this app needs that: the booking flow is
// same-origin, and same-origin requests don't consult CORS at all.
//
// So instead of a wildcard we reflect the caller's Origin only when it is one
// of ours. An unknown origin gets no ACAO header, and the browser refuses to
// hand the response body to the calling page.
//
// Note what CORS is and isn't: it stops a malicious page from READING our
// responses. It does not stop the request being SENT. These routes take no
// cookies and no ambient credentials, so a cross-site POST that can't read the
// answer achieves nothing — but rate limiting, not CORS, is what bounds it.

const ALLOWED_ORIGINS = new Set([
  'https://merrittwellness.net',
  'https://www.merrittwellness.net',
  'https://merrittfitness.net',
  'https://www.merrittfitness.net',
]);

// Vercel preview deployments get a generated *.vercel.app hostname, and local
// development runs on localhost. Both are allowed only OUTSIDE production.
const NON_PRODUCTION_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const VERCEL_PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;

  // NEXT_PUBLIC_SITE_URL lets a self-hosted or renamed deployment authorize
  // its own origin without editing this list.
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && origin === configured.replace(/\/$/, '')) return true;

  if (process.env.NODE_ENV !== 'production') {
    return NON_PRODUCTION_ORIGIN.test(origin) || VERCEL_PREVIEW_ORIGIN.test(origin);
  }
  return VERCEL_PREVIEW_ORIGIN.test(origin) && process.env.VERCEL_ENV === 'preview';
}

// Headers to merge into a route's response. Returns an empty object (no ACAO
// at all) for same-origin requests and for origins we don't recognize.
export function corsHeaders(request, { methods = 'POST, OPTIONS' } = {}) {
  const origin = request?.headers?.get?.('origin');
  if (!isAllowedOrigin(origin)) return { Vary: 'Origin' };

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// Standard preflight response.
export function corsPreflightResponse(request, options) {
  return new Response(null, { status: 204, headers: corsHeaders(request, options) });
}

// Copy CORS headers onto an existing Response without rebuilding it.
export function withCors(response, request, options) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, options))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Reject an oversized body before it is buffered into memory.
//
// This is a backstop, not the real limit: the per-field caps in each route's
// zod schema decide what is actually acceptable, and Vercel already refuses
// request bodies over its own platform limit. The point here is to avoid
// reading a deliberately huge payload into the function's heap just to have
// zod reject it a moment later. Content-Length is attacker-controlled and may
// be absent for chunked uploads, so this catches the honest-but-huge and the
// lazy-attacker cases only.
export function requestTooLarge(request, maxBytes) {
  const declared = Number(request?.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return Response.json(
      { success: false, error: 'Request body too large' },
      { status: 413 }
    );
  }
  return null;
}
