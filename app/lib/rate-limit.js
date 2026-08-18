// app/lib/rate-limit.js
//
// Per-IP request throttling for the public API routes.
//
// WHAT THIS DEFENDS AGAINST
//   - /api/booking-request accepts up to ~18 MB of base64 (ID photo + COI) per
//     anonymous call and writes it to the database. Unthrottled, that is a
//     cheap way to fill the Supabase project or run up its bill.
//   - /api/inquiry sends two Resend emails per anonymous call — an email-bomb
//     and a sender-reputation problem, not just a cost one.
//   - /api/check-availability and /api/recurring-conflicts each hit the Google
//     Calendar API, which has a hard daily quota. Exhaust it and real renters
//     see "calendar unavailable".
//   - /api/validate-promo answers "is this a valid discount code?", which is a
//     guessing oracle unless the guess rate is capped.
//
// HONEST LIMITATIONS — read before trusting this for anything
//   State lives in module scope on a serverless instance. That means limits are
//   per warm instance, not global: an attacker whose requests land on several
//   instances gets a multiple of the nominal limit, and every cold start
//   resets the window. This raises the bar against scripted abuse from one
//   host; it is NOT a defense against a distributed flood. For that, either
//   move the counters to Redis (Upstash) or enable rate limiting at the
//   Vercel edge/WAF layer.
//
//   Client identity comes from proxy headers, which are only as trustworthy
//   as the proxy in front of the app. See clientIpFrom below for exactly which
//   header and which entry is trusted, and why.

// bucketName -> Map<clientKey, { count, resetAt }>
const buckets = new Map();

// Hard cap on tracked clients per bucket, so a flood of unique IPs can't grow
// the map without bound. Expired entries are pruned first; if that isn't
// enough, the oldest entries are evicted. This only trips under genuinely
// large fan-out.
const MAX_TRACKED_CLIENTS = 5000;

// Best-effort client identity.
//
// WHICH x-forwarded-for ENTRY TO TRUST — this is the whole security of the
// limiter, so the reasoning matters:
//
// The header is a comma-separated chain, `client, proxy1, proxy2`. The
// LEFTMOST entry is the original client, but it is also the part a caller can
// forge — under the "append" behavior most proxies default to, a request that
// arrives already carrying `X-Forwarded-For: <random>` ends up with that
// forged value at the front. Trusting it would let an attacker mint a fresh
// bucket per request and bypass every limit here.
//
// The RIGHTMOST entry is the one added by the proxy closest to us, which a
// caller cannot forge. That is what we use.
//
// On Vercel specifically this distinction is currently moot: the platform
// OVERWRITES x-forwarded-for with the observed client IP rather than
// appending to it, precisely to stop spoofing, so the header holds exactly
// one value. We take the rightmost entry anyway — it is the choice that stays
// correct if the app ever moves behind a proxy that appends, and it costs
// nothing today.
//
// x-real-ip is set by the platform and cannot be influenced by the caller, so
// it is preferred outright when present.
export function clientIpFrom(request) {
  const realIp = request.headers?.get?.('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  const forwarded = request.headers?.get?.('x-forwarded-for') || '';
  const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 0) return parts[parts.length - 1];

  // No proxy headers at all (local dev, a direct hit). Everything shares one
  // bucket — the safe direction to fail, since an unidentifiable caller must
  // not get an unlimited pass.
  return 'unknown';
}

function pruneExpired(bucket, now) {
  for (const [key, entry] of bucket) {
    if (entry.resetAt <= now) bucket.delete(key);
  }
}

// Fixed-window counter. Returns { allowed, remaining, retryAfterSeconds }.
//
// `limit` requests are permitted per `windowMs` per client per bucket. A
// fixed window (rather than a sliding one) is deliberate: it costs one integer
// per client and the burst it permits at a window boundary — 2x the limit — is
// irrelevant at the limits used here.
export function rateLimit(request, { bucket = 'default', limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const key = clientIpFrom(request);

  let store = buckets.get(bucket);
  if (!store) {
    store = new Map();
    buckets.set(bucket, store);
  }

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    if (store.size >= MAX_TRACKED_CLIENTS) {
      pruneExpired(store, now);
      // Still oversized after dropping expired windows: evict oldest-first.
      // Map preserves insertion order, so the earliest keys are the least
      // recently created. Evicting a few beats clearing the whole bucket,
      // which would briefly forget every client currently being throttled.
      if (store.size >= MAX_TRACKED_CLIENTS) {
        const excess = store.size - MAX_TRACKED_CLIENTS + 1;
        let dropped = 0;
        for (const key of store.keys()) {
          store.delete(key);
          if (++dropped >= excess) break;
        }
      }
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, remaining: limit - entry.count, retryAfterSeconds: 0 };
}

// Standard 429. Deliberately vague — it names no limit and no window, so a
// caller learns only that they should slow down.
export function tooManyRequestsResponse(result, extraHeaders = {}) {
  return Response.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds || 60),
        ...extraHeaders,
      },
    }
  );
}

// Convenience wrapper: returns a ready-to-send 429 Response when the caller is
// over the limit, or null when the request should proceed.
export function enforceRateLimit(request, options = {}, extraHeaders = {}) {
  const result = rateLimit(request, options);
  if (result.allowed) return null;
  console.warn(`🚦 Rate limit hit on "${options.bucket || 'default'}" from ${clientIpFrom(request)}`);
  return tooManyRequestsResponse(result, extraHeaders);
}

// Test-only: drop all counters so cases don't bleed into each other.
export function __resetRateLimits() {
  buckets.clear();
}
