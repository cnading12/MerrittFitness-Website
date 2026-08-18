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

  // Canonical host: everything lives on the apex domain.
  //
  // Every canonical URL, the sitemap, the JSON-LD graph, and metadataBase all
  // use https://merrittwellness.net with no www. The Google Business Profile,
  // however, points at https://www.merrittwellness.net/ — a host that does
  // not currently resolve — so the "Website" button on the Maps listing is a
  // dead link, and the www URLs Google has indexed go nowhere.
  //
  // This redirect makes www consolidate into the apex the moment the hostname
  // is actually pointed at this deployment. It cannot fix the dead link on
  // its own: until www.merrittwellness.net is added as a domain in Vercel
  // (and its DNS record exists), no request ever reaches this middleware.
  // See SEO_CHANGES.md.
  const host = request.headers.get('host') || '';
  if (host.startsWith('www.')) {
    const canonical = request.nextUrl.clone();
    canonical.host = host.slice(4);
    canonical.port = '';
    canonical.protocol = 'https';
    return NextResponse.redirect(canonical, 308);
  }

  // Create response
  const response = NextResponse.next();

  // Indexing.
  //
  // This used to unconditionally set `X-Robots-Tag: index, follow` on EVERY
  // response, including the checkout and confirmation pages that robots.txt
  // disallows and every /api/ route. An HTTP header beats robots.txt for any
  // crawler that reaches the URL another way (a link, a redirect, a shared
  // receipt), so the header was actively inviting thin transactional pages
  // into the index. The default — no header at all — already means
  // "index, follow", so the only directive worth sending is the negative one.
  const NOINDEX_PREFIXES = ['/api/', '/book/payment', '/book/success'];
  if (NOINDEX_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // Add security headers
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