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
//   The client IP comes from x-forwarded-for, which is only trustworthy
//   because Vercel overwrites it at the edge. If this app is ever served from
//   somewhere that passes the header through unchecked, the limiter can be
//   evaded by spoofing it, and it must be revisited.

// bucketName -> Map<clientKey, { count, resetAt }>
const buckets = new Map();

// Hard cap on tracked clients per bucket, so a flood of unique IPs can't grow
// the map without bound. When exceeded we drop the whole bucket: the limiter
// briefly forgets everyone rather than leaking memory. Expired entries are
// pruned first, so this only trips under genuinely large fan-out.
const MAX_TRACKED_CLIENTS = 5000;

// Best-effort client identity. Vercel sets x-forwarded-for at the edge and
// the leftmost entry is the real client; anything a caller appends lands to
// the right of it and is ignored here.
export function clientIpFrom(request) {
  const forwarded = request.headers?.get?.('x-forwarded-for') || '';
  const first = forwarded.split(',')[0]?.trim();
  if (first) return first;
  return (
    request.headers?.get?.('x-real-ip') ||
    request.headers?.get?.('cf-connecting-ip') ||
    'unknown'
  );
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
      if (store.size >= MAX_TRACKED_CLIENTS) store.clear();
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
