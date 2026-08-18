// app/lib/rate-limit.js — per-IP throttling for the public API routes.
//
// These endpoints are anonymous and expensive: /api/booking-request stores
// megabytes of uploaded documents, /api/inquiry sends two Resend emails per
// call, and the calendar routes draw on a finite Google API quota. The limiter
// is what bounds abuse of all of them, so its behavior is pinned here:
//
//   1. Requests up to the limit pass; the next one is refused with a 429 and
//      a Retry-After header.
//   2. Counting is per client IP — one abusive caller must not lock out
//      everyone else.
//   3. Counting is per bucket — tripping the booking limit must not also
//      close the inquiry form.
//   4. The window expires, so a refused caller recovers on its own.
//   5. The 429 body says nothing about the limit or the window.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

const { rateLimit, enforceRateLimit, clientIpFrom, __resetRateLimits } =
  await import('../app/lib/rate-limit.js');

function requestFrom(ip, extraHeaders = {}) {
  return new Request('https://example.com/api/thing', {
    method: 'POST',
    headers: ip ? { 'x-forwarded-for': ip, ...extraHeaders } : extraHeaders,
  });
}

test('allows requests up to the limit, then refuses', () => {
  __resetRateLimits();
  const opts = { bucket: 'test-a', limit: 3, windowMs: 60_000 };
  const req = requestFrom('1.1.1.1');

  assert.equal(rateLimit(req, opts).allowed, true);
  assert.equal(rateLimit(req, opts).allowed, true);
  assert.equal(rateLimit(req, opts).allowed, true);

  const refused = rateLimit(req, opts);
  assert.equal(refused.allowed, false, 'the request past the limit must be refused');
  assert.ok(refused.retryAfterSeconds > 0, 'a refusal must tell the caller when to retry');
});

test('one abusive IP does not throttle everyone else', () => {
  __resetRateLimits();
  const opts = { bucket: 'test-b', limit: 2, windowMs: 60_000 };

  rateLimit(requestFrom('9.9.9.9'), opts);
  rateLimit(requestFrom('9.9.9.9'), opts);
  assert.equal(rateLimit(requestFrom('9.9.9.9'), opts).allowed, false);

  assert.equal(
    rateLimit(requestFrom('2.2.2.2'), opts).allowed,
    true,
    'a different client must still be served'
  );
});

test('buckets are independent — one route hitting its limit does not close another', () => {
  __resetRateLimits();
  const booking = { bucket: 'booking-request', limit: 1, windowMs: 60_000 };
  const inquiry = { bucket: 'inquiry', limit: 1, windowMs: 60_000 };
  const req = requestFrom('3.3.3.3');

  rateLimit(req, booking);
  assert.equal(rateLimit(req, booking).allowed, false, 'booking bucket is spent');
  assert.equal(rateLimit(req, inquiry).allowed, true, 'inquiry bucket is untouched');
});

test('the window expires, so a refused caller recovers', async () => {
  __resetRateLimits();
  const opts = { bucket: 'test-c', limit: 1, windowMs: 30 };
  const req = requestFrom('4.4.4.4');

  assert.equal(rateLimit(req, opts).allowed, true);
  assert.equal(rateLimit(req, opts).allowed, false);

  await new Promise((r) => setTimeout(r, 45));
  assert.equal(rateLimit(req, opts).allowed, true, 'the counter must reset after the window');
});

test('enforceRateLimit returns null while allowed and a 429 Response once over', async () => {
  __resetRateLimits();
  const opts = { bucket: 'test-d', limit: 1, windowMs: 60_000 };
  const req = requestFrom('5.5.5.5');

  assert.equal(enforceRateLimit(req, opts), null, 'an allowed request must not be blocked');

  const blocked = enforceRateLimit(req, opts);
  assert.ok(blocked instanceof Response);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get('Retry-After'), 'Retry-After tells the client when to come back');

  const body = await blocked.json();
  // The response must not disclose the limit or the window — that is a map of
  // exactly how to stay just under it.
  assert.doesNotMatch(JSON.stringify(body), /\d+\s*(per|\/)\s*(minute|second|hour)|limit:|windowMs/i);
});

test('extra headers (CORS) survive onto the 429', () => {
  __resetRateLimits();
  const opts = { bucket: 'test-e', limit: 1, windowMs: 60_000 };
  const req = requestFrom('6.6.6.6');
  enforceRateLimit(req, opts);

  const blocked = enforceRateLimit(req, opts, { 'Access-Control-Allow-Origin': 'https://merrittwellness.net' });
  assert.equal(blocked.headers.get('Access-Control-Allow-Origin'), 'https://merrittwellness.net');
});

test('client IP comes from the RIGHTMOST x-forwarded-for entry', () => {
  // The leftmost entry is caller-forgeable: under the "append" behavior most
  // proxies default to, a request arriving with the header already set puts
  // the attacker's value at the front. Trusting it would let anyone mint a
  // fresh bucket per request. The rightmost entry is the one our closest
  // proxy added.
  assert.equal(clientIpFrom(requestFrom('1.2.3.4, 10.0.0.1, 10.0.0.2')), '10.0.0.2');
});

test('a forged x-forwarded-for prefix cannot mint fresh buckets', () => {
  // The concrete bypass this prevents: vary the spoofed prefix each request
  // and never hit the limit.
  __resetRateLimits();
  const opts = { bucket: 'test-spoof', limit: 2, windowMs: 60_000 };

  rateLimit(requestFrom('9.9.9.1, 10.0.0.5'), opts);
  rateLimit(requestFrom('9.9.9.2, 10.0.0.5'), opts);
  assert.equal(
    rateLimit(requestFrom('9.9.9.3, 10.0.0.5'), opts).allowed,
    false,
    'all three share the same real client, so the third must be refused'
  );
});

test('x-real-ip is preferred over x-forwarded-for', () => {
  // The platform sets x-real-ip and a caller cannot influence it.
  const request = new Request('https://example.com/api/thing', {
    method: 'POST',
    headers: { 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '8.8.8.8' },
  });
  assert.equal(clientIpFrom(request), '8.8.8.8');
});

test('requests with no forwarded IP still get counted rather than skipped', () => {
  __resetRateLimits();
  const opts = { bucket: 'test-f', limit: 1, windowMs: 60_000 };

  assert.equal(rateLimit(requestFrom(null), opts).allowed, true);
  assert.equal(
    rateLimit(requestFrom(null), opts).allowed,
    false,
    'an unidentifiable caller must not get an unlimited pass'
  );
});
