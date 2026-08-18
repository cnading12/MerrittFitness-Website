// middleware.js
//
// Applies the security headers to every page response. The policy itself —
// and the reasoning behind each header — lives in app/lib/security-headers.js
// so it can be unit tested without the Next runtime (see
// tests/security-headers.test.mjs).

import { NextResponse } from 'next/server'

import { securityHeaders, isWebhookPath } from './app/lib/security-headers.js'

export function middleware(request) {
  // CRITICAL: Skip middleware for webhook endpoints.
  // Stripe verifies a signature over the raw request body; anything done to
  // that request risks breaking verification, which would silently stop paid
  // bookings from ever being confirmed.
  if (isWebhookPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  for (const [name, value] of Object.entries(securityHeaders())) {
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
