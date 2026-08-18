// middleware.js
//
// Applies the security headers to every page response. The policy itself —
// and the reasoning behind each header — lives in app/lib/security-headers.js
// so it can be unit tested without the Next runtime (see
// tests/security-headers.test.mjs).

import { NextResponse } from 'next/server'

import {
  securityHeaders,
  isWebhookPath,
  isNoindexPath,
} from './app/lib/security-headers.js'

export function middleware(request) {
  // CRITICAL: Skip middleware for webhook endpoints.
  // Stripe verifies a signature over the raw request body; anything done to
  // that request risks breaking verification, which would silently stop paid
  // bookings from ever being confirmed.
  if (isWebhookPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // CANONICAL HOST: www.merrittwellness.net.
  //
  // Do NOT add a www -> apex redirect here. The apex already redirects to www
  // at the platform level:
  //
  //   curl -sSIL <apex>
  //   HTTP/2 307
  //   location: https://www.merrittwellness.net/
  //   HTTP/2 200
  //
  // A middleware redirect in the other direction would bounce every request
  // between the two hosts forever and take the whole site down. An earlier
  // revision of this file did exactly that, on the mistaken belief that www
  // was the dead host; it was caught before it shipped. If the canonical host
  // is ever moved to the apex, change the platform redirect FIRST and
  // BASE_URL in lib/site-schema.ts to match — never add a redirect here.

  const isApi = request.nextUrl.pathname.startsWith('/api/');

  // Indexing. API routes were already excluded; this also covers the
  // mid-booking pages (/book/payment, /book/success, /book/payment-complete),
  // which robots.txt disallows but which an `X-Robots-Tag: index, follow`
  // would have overridden for any crawler arriving by link or shared receipt.
  // See isNoindexPath for the full reasoning.
  const noindex = isNoindexPath(request.nextUrl.pathname);

  const response = NextResponse.next();
  for (const [name, value] of Object.entries(securityHeaders({ isApi, noindex }))) {
    response.headers.set(name, value);
  }

  // Note: no user-agent blocklist.
  //
  // The previous version 403'd any request whose UA contained "sqlmap",
  // "nikto", "scanner" or "hack". That stopped nobody — a scanner's UA is a
  // command-line flag away from anything — while blocking legitimate visitors
  // whose UA happened to contain "hack" as a substring. Rate limiting and
  // input validation are what actually bound abuse here.

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
