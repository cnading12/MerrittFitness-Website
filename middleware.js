// middleware.js
// FIXED VERSION - Excludes webhook endpoints

import { NextResponse } from 'next/server'

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

  // Add security headers
  response.headers.set('X-Robots-Tag', 'index, follow');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

  // Get user agent for security checks
  const userAgent = request.headers.get('user-agent') || '';

  // Block suspicious requests (basic protection)
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
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
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