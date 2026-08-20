// middleware.js — the security headers on every page response.
//
// This app takes card payments and stores government ID photos, so the header
// set is part of its defenses rather than decoration. What's pinned here:
//
//   1. A Content-Security-Policy exists and locks down the directives that
//      still matter even with 'unsafe-inline' scripts: where the page may
//      connect, where forms may post, who may frame us, and <base>/<object>.
//   2. Stripe and the Google embeds are allowed — the CSP must not break
//      checkout or the calendar.
//   3. X-XSS-Protection is disabled (`0`), not enabled. The legacy auditor it
//      turns on was itself exploitable, which is why browsers dropped it.
//   4. HSTS is set.
//   5. Stripe webhooks bypass the middleware entirely — signature
//      verification needs the raw body untouched.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

// The policy is imported directly rather than through middleware.js, because
// `next/server` only resolves inside the Next build. middleware.js is a thin
// wrapper that applies exactly this header set.
const { securityHeaders, buildCsp, isWebhookPath } =
  await import('../app/lib/security-headers.js');

function headerFor(name) {
  const headers = securityHeaders();
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : null;
}

function cspOf() {
  return buildCsp();
}

test('a Content-Security-Policy is set on page responses', () => {
  assert.ok(cspOf().length > 0, 'every page response must carry a CSP');
});

test('CSP confines network egress, form posts, base URI and plugins', () => {
  const csp = cspOf();
  // These are the directives that still constrain an injected script even
  // though script-src has to allow inline (pages are statically prerendered,
  // so a per-request nonce cannot be stamped into the cached HTML).
  assert.match(csp, /connect-src 'self'/, 'an injected script must not be able to phone home');
  assert.match(csp, /form-action 'self'/, 'forms must only post back to us');
  assert.match(csp, /base-uri 'self'/, '<base> rewriting would hijack every relative URL');
  assert.match(csp, /object-src 'none'/, 'no plugins');
  assert.match(csp, /frame-ancestors 'none'/, 'nobody may frame the payment page');
  assert.match(csp, /default-src 'self'/);
});

test('CSP permits every origin Stripe requires', () => {
  // Straight from Stripe's CSP guidance. Getting any of these wrong breaks
  // checkout or silently degrades fraud detection, so each is pinned.
  const csp = cspOf();
  const directive = (name) => csp.split(';').find((d) => d.trim().startsWith(name)) || '';

  const script = directive('script-src');
  assert.ok(script.includes('https://js.stripe.com'), 'Stripe.js must load');
  assert.ok(
    script.includes('https://*.js.stripe.com'),
    'Stripe.js starts Payment Element frames on sharded origins — omitting this breaks card fields and the ACH flow'
  );

  const frame = directive('frame-src');
  assert.ok(frame.includes('https://js.stripe.com'));
  assert.ok(frame.includes('https://*.js.stripe.com'));
  assert.ok(frame.includes('https://hooks.stripe.com'), '3-D Secure frames');
  assert.ok(
    frame.includes('https://m.stripe.network'),
    'Stripe Radar fraud signals — blocking this degrades fraud detection SILENTLY'
  );

  const connect = directive('connect-src');
  assert.ok(
    connect.includes('https://*.stripe.com'),
    'covers api/q/errors.stripe.com; narrowing to api.stripe.com alone produces violations on every payment'
  );
});

test('CSP permits the Google Calendar and Maps embeds', () => {
  // These fail QUIETLY — the iframes render blank with only a console
  // violation — so they are easy to drop when tightening the policy. The
  // calendar embed is on the home page and /book; the map is on the home page.
  const csp = cspOf();
  const frame = csp.split(';').find((d) => d.trim().startsWith('frame-src')) || '';
  assert.ok(frame.includes('https://calendar.google.com'), 'the "What\'s On" calendar embed must load');
  assert.ok(frame.includes('https://www.google.com'), 'the Maps embed must load');
  assert.match(csp, /style-src[^;]*https:\/\/fonts\.googleapis\.com/, 'Google Fonts must load');
});

test('CSP does not combine a nonce with unsafe-inline', () => {
  // Browsers IGNORE 'unsafe-inline' whenever a nonce or hash is present. With
  // statically prerendered HTML carrying no nonce attributes, that combination
  // blocks every script on the site — a blank, non-interactive page including
  // checkout. See the long comment in middleware.js.
  const csp = cspOf();
  const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) || '';
  if (scriptSrc.includes("'unsafe-inline'")) {
    assert.ok(
      !scriptSrc.includes('nonce-') && !scriptSrc.includes("'strict-dynamic'"),
      "a nonce or 'strict-dynamic' alongside 'unsafe-inline' would block every script on the site"
    );
  }
});

test('X-XSS-Protection is explicitly disabled', () => {
  // `1; mode=block` enables a legacy filter that could be induced to create
  // vulnerabilities. Every current recommendation is to send `0`.
  assert.equal(headerFor('X-XSS-Protection'), '0');
});

test('HSTS, referrer policy, frame options and permissions policy are set', () => {
  assert.match(headerFor('Strict-Transport-Security') || '', /max-age=\d{7,}/);
  assert.equal(headerFor('X-Frame-Options'), 'DENY');
  // The booking id in the URL is the app's only credential; don't hand full
  // URLs to third-party origins.
  assert.match(headerFor('Referrer-Policy') || '', /strict-origin/);
  assert.match(headerFor('Permissions-Policy') || '', /camera=\(\)/);
});

test('X-Content-Type-Options is not duplicated here', () => {
  // It is set in next.config.js so it also covers /_next/static and
  // /_next/image, which the middleware matcher skips. Setting it in both
  // places emits the header twice.
  assert.equal(headerFor('X-Content-Type-Options'), null);
});

test('Stripe webhook paths are recognized as bypass paths', () => {
  // The webhook handler verifies a signature over the RAW body. Anything the
  // middleware does to that request risks breaking verification, which would
  // silently stop every paid booking from being confirmed.
  assert.equal(isWebhookPath('/api/webhooks/stripe'), true);
  assert.equal(isWebhookPath('/api/stripe-webhook'), true);
  assert.equal(isWebhookPath('/api/booking-request'), false);
  assert.equal(isWebhookPath('/book'), false);
});

test('the webhook health check is uncacheable', async () => {
  // /api/webhooks/* is the one path the middleware skips (Stripe signs the raw
  // body), so it never receives the Cache-Control: no-store that every other
  // API response gets. The GET on that route is how you confirm the server is
  // using the service-role key BEFORE enabling RLS — and a cached answer
  // reports a stale value with total confidence, which is worse than no health
  // check at all. It must set the headers itself.
  const { GET } = await import('../app/api/webhooks/stripe/route.js');
  const response = await GET();

  assert.match(response.headers.get('cache-control') || '', /no-store/);

  const body = await response.json();
  assert.equal(
    typeof body.configuration.supabaseUsingServiceRole,
    'boolean',
    'the RLS-gating field must always be present'
  );
  // Length only — never the key itself. It separates "absent" from "present
  // but empty", which read the same in the boolean but have different fixes.
  assert.equal(typeof body.configuration.serviceRoleKeyLength, 'number');

  // Variable NAMES only, JSON-quoted so a trailing space or zero-width
  // character in the name is visible. A name is not a secret; a value is.
  assert.ok(Array.isArray(body.configuration.supabaseEnvKeys));
  for (const key of body.configuration.supabaseEnvKeys) {
    assert.match(key, /^".*"$/, 'env key names must be JSON-quoted to expose whitespace');
  }

  const serialized = JSON.stringify(body);
  for (const secret of [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.STRIPE_SECRET_KEY,
    process.env.RESEND_API_KEY,
  ]) {
    if (secret) {
      assert.ok(!serialized.includes(secret), 'the health check must never echo a secret value');
    }
  }
});
