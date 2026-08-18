// app/lib/auth.js
//
// Shared-secret checks for the admin and cron endpoints.
//
// These routes are guarded by a single static secret in a header, so the
// comparison itself has to be constant-time. A plain `provided !== expected`
// bails at the first differing byte, and the time that takes is measurable
// across enough samples — which turns a 256-bit secret into something an
// attacker can walk one character at a time. `timingSafeEqual` always reads
// every byte.
//
// Two details that matter for it to actually be constant-time:
//   - `timingSafeEqual` THROWS if the buffers differ in length, and that throw
//     is itself an instant length oracle. We hash both sides to a fixed 32
//     bytes first, so the comparison always sees equal-length input and the
//     length of the guess leaks nothing.
//   - Every check fails closed when the secret is unset, so a missing env var
//     can never mean "no auth required".

import { createHash, timingSafeEqual } from 'node:crypto';

function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest();
}

// Constant-time string equality, safe for values of differing length.
export function secretsMatch(provided, expected) {
  if (typeof expected !== 'string' || expected.length === 0) return false;
  return timingSafeEqual(sha256(provided ?? ''), sha256(expected));
}

// Admin endpoints: `x-admin-secret: $ADMIN_API_SECRET`.
// Returns { ok: true } or { ok: false, error, status }.
export function requireAdminAuth(request) {
  const provided = request.headers.get('x-admin-secret') || '';
  const expected = process.env.ADMIN_API_SECRET;

  if (!expected) {
    // Fail closed: an unconfigured secret locks the endpoint rather than
    // opening it.
    console.error('❌ ADMIN_API_SECRET is not configured — admin endpoint refused');
    return { ok: false, error: 'ADMIN_API_SECRET not configured', status: 500 };
  }
  if (!secretsMatch(provided, expected)) {
    return { ok: false, error: 'Unauthorized', status: 401 };
  }
  return { ok: true };
}

// Vercel Cron: `Authorization: Bearer $CRON_SECRET`.
export function requireCronAuth(request) {
  const provided = request.headers.get('authorization') || '';
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    console.error('❌ CRON_SECRET is not configured — cron endpoint refused');
    return { ok: false, error: 'CRON_SECRET not configured', status: 500 };
  }
  if (!secretsMatch(provided, `Bearer ${expected}`)) {
    return { ok: false, error: 'Unauthorized', status: 401 };
  }
  return { ok: true };
}
