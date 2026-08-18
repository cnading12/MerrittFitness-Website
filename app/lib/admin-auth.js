// app/lib/admin-auth.js
//
// Shared secret checking for the /api/admin/* and /api/cron/* routes.
//
// Two things this centralizes:
//
//  1. **Constant-time comparison.** The routes each did `provided !== expected`
//     with plain `!==`, which short-circuits on the first differing byte. Over
//     enough samples that timing difference leaks the secret one character at
//     a time. `crypto.timingSafeEqual` compares the full buffer every time.
//     (`timingSafeEqual` throws on length mismatch, and the lengths themselves
//     differ observably, so both sides are hashed to a fixed 32 bytes first —
//     that makes every comparison the same width regardless of input length.)
//
//  2. **Fail closed.** A missing env var is a 500, never an implicit allow.
//
// Both are defense-in-depth: the real protection is that these secrets are
// long random strings. But an admin endpoint that can re-run billing, and a
// cron endpoint that charges every recurring renter, are worth the care.

import { createHash, timingSafeEqual } from 'crypto';

function digest(value) {
  return createHash('sha256').update(String(value), 'utf8').digest();
}

// True iff `provided` equals `expected`, in time independent of their contents.
export function secretsMatch(provided, expected) {
  if (typeof expected !== 'string' || expected.length === 0) return false;
  return timingSafeEqual(digest(provided ?? ''), digest(expected));
}

// Checks the `x-admin-secret` header against ADMIN_API_SECRET.
// Returns { ok: true } or { ok: false, error, status }.
export function requireAdminAuth(request) {
  const expected = process.env.ADMIN_API_SECRET;
  if (!expected) {
    console.error('❌ ADMIN_API_SECRET is not configured');
    return { ok: false, error: 'ADMIN_API_SECRET not configured', status: 500 };
  }
  const provided = request.headers.get('x-admin-secret') || '';
  if (!secretsMatch(provided, expected)) {
    console.warn('🚫 Admin endpoint called with an invalid x-admin-secret');
    return { ok: false, error: 'Unauthorized', status: 401 };
  }
  return { ok: true };
}

// Checks the `Authorization: Bearer <CRON_SECRET>` header Vercel Cron sends.
// Returns { ok: true } or { ok: false, error, status }.
export function requireCronAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('❌ CRON_SECRET is not configured');
    return { ok: false, error: 'CRON_SECRET not configured', status: 500 };
  }
  const provided = request.headers.get('authorization') || '';
  if (!secretsMatch(provided, `Bearer ${secret}`)) {
    console.warn('🚫 Cron endpoint called without a valid Authorization header');
    return { ok: false, error: 'Unauthorized', status: 401 };
  }
  return { ok: true };
}
