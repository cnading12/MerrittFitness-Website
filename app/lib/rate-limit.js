// app/lib/rate-limit.js
//
// Per-IP request throttling for the public API routes. Before this existed
// every endpoint was unbounded: /api/booking-request accepted ~18 MB of
// base64 uploads per anonymous request and wrote them to the database, and
// /api/inquiry sent two Resend emails per anonymous request — both cheap to
// abuse into a database-storage bill, a burned Resend quota, or a mailbox
// full of junk leads.
//
// Implementation is a fixed-window counter held in module memory. That is a
// deliberate trade-off: Vercel runs each serverless instance in its own
// process, so a client spread across N warm instances effectively gets N
// windows, and a cold start resets the count. It is therefore NOT a defense
// against a distributed attacker — it is a cheap ceiling that stops casual
// scripted abuse and accidental retry storms without adding Redis/Upstash
// infrastructure. If abuse ever gets serious, swap `hit()`'s body for a
// shared store (the call sites don't change) and/or turn on Vercel's WAF.
//
// Limits are intentionally generous: a real renter filling out the booking
// form makes a handful of requests, so these thresholds only bite on
// automated traffic.

// One bucket per key. Entries are pruned lazily (see sweep below) so the map
// cannot grow without bound on a long-lived instance.
const buckets = new Map();

// Hard ceiling on tracked keys. A single instance seeing more unique IPs than
// this is already anomalous; dropping the oldest entries bounds memory rather
// than letting the map become the DoS.
const MAX_TRACKED_KEYS = 10000;

// Prune expired buckets at most this often, so a burst of requests doesn't
// pay for a full map scan every time.
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = 0;

function sweep(now) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still oversized after dropping expired windows: evict oldest-first.
  // Map preserves insertion order, so the first keys are the least recent.
  if (buckets.size > MAX_TRACKED_KEYS) {
    const excess = buckets.size - MAX_TRACKED_KEYS;
    let dropped = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++dropped >= excess) break;
    }
  }
}

// Best-effort client identity.
//
// On Vercel, x-forwarded-for is appended to by the platform's proxy, so the
// LAST entry is the one Vercel itself observed and the only one a client
// cannot forge; earlier entries are attacker-controlled when the request
// arrives with the header already set. x-real-ip is set by the platform and
// is preferred when present.
export function clientKey(request) {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  // No proxy headers at all (local dev, direct hit). Everything shares one
  // bucket, which is the safe direction to fail.
  return 'unknown';
}

// Record a request against `key` and report whether it is allowed.
// Returns { allowed, remaining, retryAfterSeconds }.
export function hit(key, { limit, windowMs }) {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

// Named limits, one per route family. `name` is part of the bucket key so a
// renter who has been submitting booking forms can still check availability.
export const LIMITS = {
  // Writes a bookings row and up to ~18 MB of base64 documents.
  'booking-request': { limit: 10, windowMs: 60 * 60 * 1000 },
  // Sends two emails per call.
  inquiry: { limit: 8, windowMs: 60 * 60 * 1000 },
  // Guessing oracle for the promo dictionary — the tightest limit here.
  'promo-validate': { limit: 15, windowMs: 60 * 60 * 1000 },
  // Creates Stripe objects.
  payment: { limit: 30, windowMs: 60 * 60 * 1000 },
  // Read-only, but each call costs a Google Calendar API quota unit.
  availability: { limit: 120, windowMs: 60 * 60 * 1000 },
  // Read-only booking lookup by UUID; also blunts UUID enumeration.
  'booking-read': { limit: 120, windowMs: 60 * 60 * 1000 },
  // Wrong-secret attempts against the admin endpoints.
  admin: { limit: 20, windowMs: 60 * 60 * 1000 },
};

// Route-handler convenience wrapper. Returns a 429 Response when the caller
// is over the limit, or null when the request should proceed.
//
//   const limited = enforceRateLimit(request, 'inquiry');
//   if (limited) return limited;
//
export function enforceRateLimit(request, name, options = {}) {
  const config = LIMITS[name];
  if (!config) throw new Error(`Unknown rate limit: ${name}`);

  const key = `${name}:${options.key || clientKey(request)}`;
  const result = hit(key, config);
  if (result.allowed) return null;

  console.warn(`🚫 Rate limit hit for ${key} (${config.limit}/${config.windowMs}ms)`);
  return Response.json(
    {
      error: 'Too many requests',
      message:
        options.message ||
        'You have made too many requests. Please wait a few minutes and try again, or contact manager@merrittwellness.net.',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'Cache-Control': 'no-store',
      },
    }
  );
}

// Test-only: drop all state so cases don't leak counts into each other.
export function __resetRateLimits() {
  buckets.clear();
  lastSweep = 0;
}
