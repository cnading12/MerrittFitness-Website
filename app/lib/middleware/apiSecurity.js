// lib/middleware/apiSecurity.js
// PRODUCTION-READY API Security Middleware

import { headers } from 'next/headers';

// Simple in-memory rate limiting (use Redis in production)
const rateLimitStore = new Map();

// Rate limiting configurations
const RATE_LIMITS = {
  default: { max: 100, window: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  booking: { max: 10, window: 15 * 60 * 1000 },  // 10 booking attempts per 15 minutes
  payment: { max: 5, window: 15 * 60 * 1000 },   // 5 payment attempts per 15 minutes
  webhook: { max: 1000, window: 60 * 1000 },     // 1000 webhook calls per minute
};

// CORS configuration
const CORS_CONFIG = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://merrittfitness.com', 'https://www.merrittfitness.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// Get client IP address
function getClientIP(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  return cfConnectingIP || forwardedFor?.split(',')[0]?.trim() || realIP || '127.0.0.1';
}

// Rate limiting function
function checkRateLimit(ip, endpoint, limitType = 'default') {
  const limit = RATE_LIMITS[limitType] || RATE_LIMITS.default;
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  
  // Get existing requests for this IP/endpoint
  let requests = rateLimitStore.get(key) || [];
  
  // Remove expired requests
  requests = requests.filter(time => now - time < limit.window);
  
  // Check if limit exceeded
  if (requests.length >= limit.max) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.ceil((requests[0] + limit.window) / 1000),
    };
  }
  
  // Add current request
  requests.push(now);
  rateLimitStore.set(key, requests);
  
  return {
    allowed: true,
    remaining: limit.max - requests.length,
    resetTime: Math.ceil((now + limit.window) / 1000),
  };
}

// Main security middleware
export function withApiSecurity(handler, options = {}) {
  return async function secureHandler(request, context) {
    const startTime = Date.now();
    const ip = getClientIP(request);
    const method = request.method;
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Apply CORS headers
    const corsHeaders = applyCORS(request);
    
    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          ...corsHeaders,
          ...SECURITY_HEADERS,
        },
      });
    }

    try {
      // Rate limiting
      const limitType = options.rateLimit || 'default';
      const rateLimit = checkRateLimit(ip, pathname, limitType);
      
      if (!rateLimit.allowed) {
        console.warn(`Rate limit exceeded for IP ${ip} on ${pathname}`);
        
        return new Response(
          JSON.stringify({
            error: 'Too Many Requests',
            message: 'Please slow down and try again later.',
            retryAfter: rateLimit.resetTime,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(rateLimit.resetTime),
              'X-RateLimit-Limit': String(RATE_LIMITS[limitType].max),
              'X-RateLimit-Remaining': String(rateLimit.remaining),
              'X-RateLimit-Reset': String(rateLimit.resetTime),
              ...corsHeaders,
              ...SECURITY_HEADERS,
            },
          }
        );
      }

      // Input validation for suspicious patterns
      const suspiciousPatterns = [
        /(\b(script|javascript|vbscript|onload|onerror)\b)/gi,
        /(<[^>]*>)/gi, // HTML tags
        /(union|select|insert|delete|drop|create|alter)\s/gi, // SQL keywords
        /(\.\.\/|\.\.\\)/gi, // Path traversal
      ];

      let requestBody = '';
      if (method === 'POST') {
        try {
          requestBody = await request.text();
          // Reset request stream for handler
          request = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: requestBody,
          });
        } catch (e) {
          // If body can't be read, continue
        }
      }

      // Check for suspicious patterns in request body and URL
      const checkContent = `${pathname} ${requestBody}`;
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(checkContent)) {
          console.warn(`Suspicious request detected from IP ${ip}: ${pathname}`);
          
          return new Response(
            JSON.stringify({
              error: 'Bad Request',
              message: 'Invalid request detected.',
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
                ...SECURITY_HEADERS,
              },
            }
          );
        }
      }

      // Call the actual handler
      const response = await handler(request, context);
      
      // Add security headers to response
      const responseHeaders = new Headers(response.headers);
      
      // Add CORS headers
      Object.entries(corsHeaders).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });
      
      // Add security headers
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });
      
      // Add rate limit headers
      responseHeaders.set('X-RateLimit-Limit', String(RATE_LIMITS[limitType].max));
      responseHeaders.set('X-RateLimit-Remaining', String(rateLimit.remaining));
      responseHeaders.set('X-RateLimit-Reset', String(rateLimit.resetTime));
      
      // Log successful request
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ ${method} ${pathname} - ${response.status} - ${duration}ms - ${ip}`);
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error (in production, send to monitoring service)
      console.error(`❌ API Error ${pathname}:`, {
        error: error.message,
        ip,
        method,
        duration,
        timestamp: new Date().toISOString(),
      });
      
      // Don't expose internal errors in production
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal Server Error';
      
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: errorMessage,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
            ...SECURITY_HEADERS,
          },
        }
      );
    }
  };
}

// CORS helper function
function applyCORS(request) {
  const origin = request.headers.get('origin');
  const corsHeaders = {};

  // Check if origin is allowed
  if (origin && CORS_CONFIG.origin.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  } else if (process.env.NODE_ENV === 'development') {
    // Allow all origins in development
    corsHeaders['Access-Control-Allow-Origin'] = '*';
  }

  corsHeaders['Access-Control-Allow-Methods'] = CORS_CONFIG.methods.join(', ');
  corsHeaders['Access-Control-Allow-Headers'] = CORS_CONFIG.allowedHeaders.join(', ');
  corsHeaders['Access-Control-Max-Age'] = String(CORS_CONFIG.maxAge);

  if (CORS_CONFIG.credentials) {
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  }

  return corsHeaders;
}

// Utility function to clean up old rate limit entries (run periodically)
export function cleanupRateLimit() {
  const now = Date.now();
  const maxWindow = Math.max(...Object.values(RATE_LIMITS).map(limit => limit.window));
  
  for (const [key, requests] of rateLimitStore.entries()) {
    const filteredRequests = requests.filter(time => now - time < maxWindow);
    if (filteredRequests.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, filteredRequests);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimit, 5 * 60 * 1000);
}