// middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  // Create response
  const response = NextResponse.next()
  
  // Add security headers
  response.headers.set('X-Robots-Tag', 'index, follow')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  // Get user agent for security checks
  const userAgent = request.headers.get('user-agent') || ''
  
  // Block suspicious requests (basic protection)
  const suspiciousPatterns = [
    'sqlmap', 'nikto', 'scanner', 'hack'
  ]
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    userAgent.toLowerCase().includes(pattern)
  )
  
  if (isSuspicious) {
    console.log('🚫 Blocked suspicious request:', userAgent)
    return new Response('Access Denied', { status: 403 })
  }
  
  // Log API requests for monitoring
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    console.log('📊 API request from:', ip, 'to:', request.nextUrl.pathname)
  }
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}