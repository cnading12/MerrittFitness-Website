// tests/security-hardening.test.mjs
//
// Locks in the security controls added in the hardening pass. Each case here
// corresponds to a real weakness that was found and fixed — the point is that
// a future refactor cannot quietly undo one of them.
//
// No network, no database: the rate limiter and CORS helper are pure, the
// promo route is exercised with hand-built Request objects, and the
// source-level invariants are asserted by reading the files.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon_test';

const repoRoot = path.resolve(import.meta.dirname, '..');
const read = (rel) => readFileSync(path.join(repoRoot, rel), 'utf8');

const { hit, clientKey, enforceRateLimit, LIMITS, __resetRateLimits } =
  await import('../app/lib/rate-limit.js');
const { isAllowedOrigin, corsHeaders } = await import('../app/lib/cors.js');
const { secretsMatch } = await import('../app/lib/admin-auth.js');
const { esc } = await import('../app/lib/email.js');

function requestWith(headers = {}) {
  return new Request('https://merrittwellness.net/api/test', { headers });
}

// ---------------------------------------------------------------------------

describe('promo codes are not exposed to the client', () => {
  // THE BUG: app/book/page.tsx is a client component, so its copy of the promo
  // dictionary shipped in the public JS bundle. One of those codes comps a
  // booking to $0, skips Stripe entirely, and auto-confirms onto the live
  // venue calendar — so "view source" was a free booking.
  const CODES = ['COLESTEST', 'MerrittMagic', 'MerrittSponsor100'];

  test('no promo code appears in any client component', () => {
    for (const file of ['app/book/page.tsx', 'app/recurring/page.tsx']) {
      let source;
      try {
        source = read(file);
      } catch {
        continue; // page may not exist
      }
      for (const code of CODES) {
        assert.ok(
          !source.includes(code),
          `${file} contains the promo code "${code}". Client components ship to ` +
          `the browser — promo codes belong only in app/lib/booking-pricing.js, ` +
          `behind /api/promo/validate.`
        );
      }
    }
  });

  test('the promo dictionary still lives server-side', () => {
    const pricing = read('app/lib/booking-pricing.js');
    assert.ok(pricing.includes('VALID_PROMO_CODES'));
    for (const code of CODES) {
      assert.ok(pricing.includes(code), `booking-pricing.js should still define ${code}`);
    }
  });

  test('the validate route never returns a code the caller did not send', () => {
    const route = read('app/api/promo/validate/route.js');
    // The response body is built from `promo.*` fields only — no code strings.
    assert.ok(!/VALID_PROMO_CODES\s*\)/.test(route), 'route must not serialize the whole dictionary');
    assert.ok(
      route.includes('Object.keys(VALID_PROMO_CODES)') === false,
      'route must not enumerate promo codes'
    );
  });
});

describe('/api/promo/validate', () => {
  beforeEach(() => __resetRateLimits());

  const post = async (body, headers = {}) => {
    const { POST } = await import('../app/api/promo/validate/route.js');
    return POST(new Request('https://merrittwellness.net/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-real-ip': '203.0.113.9', ...headers },
      body: JSON.stringify(body),
    }));
  };

  test('a valid code returns its metadata but not the code itself', async () => {
    const res = await post({ code: 'MerrittMagic', totalHours: 4 });
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.valid, true);
    assert.equal(json.promo.partner, true);
    assert.equal(json.promo.discount, 0.2);
    assert.ok(!JSON.stringify(json).includes('MerrittMagic'), 'response must not echo the code');
  });

  test('the sponsored code is reported as sponsored', async () => {
    const res = await post({ code: 'COLESTEST', totalHours: 2 });
    const json = await res.json();
    assert.equal(json.valid, true);
    assert.equal(json.promo.sponsored, true);
  });

  test('an unknown code gets a generic rejection', async () => {
    const res = await post({ code: 'DEFINITELY-NOT-A-CODE', totalHours: 2 });
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.valid, false);
    assert.equal(json.error, 'Invalid promo code');
  });

  test('prototype keys are not treated as valid codes', async () => {
    // A bare `dict[code]` lookup would resolve "constructor" through the
    // prototype chain and hand back a function.
    for (const key of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      const res = await post({ code: key, totalHours: 2 });
      const json = await res.json();
      assert.equal(json.valid, false, `"${key}" must not validate`);
    }
  });

  test('brute-force attempts are rate limited', async () => {
    const { limit } = LIMITS['promo-validate'];
    let lastStatus = 200;
    for (let i = 0; i < limit + 3; i++) {
      const res = await post({ code: `guess-${i}`, totalHours: 2 });
      lastStatus = res.status;
    }
    assert.equal(lastStatus, 429, 'the limiter must eventually reject');
  });

  test('a malformed body is rejected without reaching the dictionary', async () => {
    const res = await post({ code: '' });
    assert.equal(res.status, 400);
  });
});

// ---------------------------------------------------------------------------

describe('rate limiter', () => {
  beforeEach(() => __resetRateLimits());

  test('allows up to the limit, then rejects', () => {
    const config = { limit: 3, windowMs: 60_000 };
    assert.equal(hit('k', config).allowed, true);
    assert.equal(hit('k', config).allowed, true);
    assert.equal(hit('k', config).allowed, true);
    const fourth = hit('k', config);
    assert.equal(fourth.allowed, false);
    assert.ok(fourth.retryAfterSeconds > 0, 'a rejection must say when to retry');
  });

  test('separate keys do not share a budget', () => {
    const config = { limit: 1, windowMs: 60_000 };
    assert.equal(hit('a', config).allowed, true);
    assert.equal(hit('b', config).allowed, true);
    assert.equal(hit('a', config).allowed, false);
  });

  test('a route name scopes the bucket, so one endpoint cannot starve another', () => {
    const req = requestWith({ 'x-real-ip': '198.51.100.4' });
    for (let i = 0; i < LIMITS.inquiry.limit; i++) enforceRateLimit(req, 'inquiry');
    assert.ok(enforceRateLimit(req, 'inquiry'), 'inquiry should now be limited');
    assert.equal(
      enforceRateLimit(req, 'availability'), null,
      'availability must still be allowed for the same IP'
    );
  });

  test('a 429 carries Retry-After', async () => {
    const req = requestWith({ 'x-real-ip': '198.51.100.5' });
    for (let i = 0; i < LIMITS.inquiry.limit; i++) enforceRateLimit(req, 'inquiry');
    const res = enforceRateLimit(req, 'inquiry');
    assert.equal(res.status, 429);
    assert.ok(Number(res.headers.get('Retry-After')) > 0);
  });

  test('clientKey trusts the LAST x-forwarded-for entry', () => {
    // Vercel appends the address it observed, so earlier entries are
    // client-supplied and spoofable. Trusting the first would let an attacker
    // mint a fresh bucket per request with a forged header.
    const req = requestWith({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.9.9.9' });
    assert.equal(clientKey(req), '9.9.9.9');
  });

  test('x-real-ip wins over x-forwarded-for', () => {
    const req = requestWith({ 'x-real-ip': '10.0.0.1', 'x-forwarded-for': '1.2.3.4' });
    assert.equal(clientKey(req), '10.0.0.1');
  });

  test('a request with no proxy headers still gets a bucket', () => {
    assert.equal(clientKey(requestWith()), 'unknown');
  });

  test('every public write route declares a limit', () => {
    for (const name of ['booking-request', 'inquiry', 'promo-validate', 'payment', 'admin']) {
      assert.ok(LIMITS[name], `missing rate limit config: ${name}`);
      assert.ok(LIMITS[name].limit > 0 && LIMITS[name].windowMs > 0);
    }
  });
});

describe('routes are wired to the rate limiter', () => {
  // Guards against a new route (or a rewritten old one) shipping unthrottled.
  const ROUTES = [
    'app/api/booking-request/route.js',
    'app/api/inquiry/route.js',
    'app/api/promo/validate/route.js',
    'app/api/check-availability/route.js',
    'app/api/recurring-conflicts/route.js',
    'app/api/payment/create-intent/route.js',
    'app/api/payment/create-recurring-setup/route.js',
    'app/api/payment/create-recurring-subscription/route.js',
    'app/api/booking/[id]/route.js',
    'app/api/admin/email-status/route.js',
    'app/api/admin/trigger-monthly-billing/route.js',
  ];

  for (const route of ROUTES) {
    test(`${route} calls enforceRateLimit`, () => {
      assert.ok(
        read(route).includes('enforceRateLimit'),
        `${route} must rate limit — it is reachable without authentication`
      );
    });
  }
});

// ---------------------------------------------------------------------------

describe('CORS', () => {
  // THE BUG: five routes answered every origin with
  // `Access-Control-Allow-Origin: *`, including Stripe PaymentIntent creation
  // and booking intake — any site could drive them from a visitor's browser.
  test('the production origins are allowed', () => {
    assert.ok(isAllowedOrigin('https://merrittwellness.net'));
    assert.ok(isAllowedOrigin('https://www.merrittwellness.net'));
  });

  test('an arbitrary origin is not', () => {
    assert.ok(!isAllowedOrigin('https://evil.example'));
    assert.ok(!isAllowedOrigin('https://merrittwellness.net.evil.example'));
    assert.ok(!isAllowedOrigin('http://merrittwellness.net'));
  });

  test('a disallowed origin gets no allow header', () => {
    const headers = corsHeaders(requestWith({ origin: 'https://evil.example' }));
    assert.equal(headers['Access-Control-Allow-Origin'], undefined);
    assert.equal(headers.Vary, 'Origin');
  });

  test('an allowed origin is echoed back, with Vary', () => {
    const headers = corsHeaders(requestWith({ origin: 'https://merrittwellness.net' }));
    assert.equal(headers['Access-Control-Allow-Origin'], 'https://merrittwellness.net');
    assert.equal(headers.Vary, 'Origin');
  });

  test('a same-origin request needs no CORS headers', () => {
    const headers = corsHeaders(requestWith());
    assert.equal(headers['Access-Control-Allow-Origin'], undefined);
  });

  test('no route hardcodes a wildcard origin', () => {
    const ROUTES = [
      'app/api/booking-request/route.js',
      'app/api/check-availability/route.js',
      'app/api/recurring-conflicts/route.js',
      'app/api/payment/create-intent/route.js',
      'app/api/payment/create-recurring-setup/route.js',
      'app/api/payment/create-recurring-subscription/route.js',
    ];
    for (const route of ROUTES) {
      assert.ok(
        !read(route).includes("'Access-Control-Allow-Origin': '*'"),
        `${route} must not send a wildcard CORS origin`
      );
    }
  });
});

// ---------------------------------------------------------------------------

describe('secret comparison', () => {
  // THE BUG: `provided !== expected` short-circuits on the first differing
  // byte, leaking the secret one character at a time under timing analysis.
  test('matching secrets compare equal', () => {
    assert.equal(secretsMatch('s3cret-value', 's3cret-value'), true);
  });

  test('non-matching secrets do not', () => {
    assert.equal(secretsMatch('s3cret-value', 's3cret-valuE'), false);
    assert.equal(secretsMatch('', 's3cret-value'), false);
  });

  test('a length mismatch is handled, not thrown', () => {
    // timingSafeEqual throws on unequal buffer lengths; hashing first avoids
    // both the throw and the length side channel.
    assert.equal(secretsMatch('short', 'a-much-longer-secret-value'), false);
    assert.equal(secretsMatch(undefined, 'secret'), false);
    assert.equal(secretsMatch(null, 'secret'), false);
  });

  test('an unset expected secret never matches', () => {
    assert.equal(secretsMatch('anything', ''), false);
    assert.equal(secretsMatch('anything', undefined), false);
  });

  test('admin and cron routes use the shared constant-time helper', () => {
    const ROUTES = [
      ['app/api/admin/email-status/route.js', 'requireAdminAuth'],
      ['app/api/admin/trigger-monthly-billing/route.js', 'requireAdminAuth'],
      ['app/api/cron/monthly-recurring-billing/route.js', 'requireCronAuth'],
      ['app/api/cron/supabase-keepalive/route.js', 'requireCronAuth'],
    ];
    for (const [route, fn] of ROUTES) {
      const source = read(route);
      assert.ok(source.includes(`import { ${fn} }`), `${route} must import ${fn}`);
      assert.ok(
        !/!==\s*expected/.test(source),
        `${route} must not compare secrets with !== (timing side channel)`
      );
    }
  });
});

// ---------------------------------------------------------------------------

describe('database credentials', () => {
  // THE BUG: every module authenticated with the Supabase anon key — a
  // publicly shareable credential whose only protection is RLS, which was off.
  test('no module builds its own anon-key client', () => {
    const MODULES = [
      'app/api/admin/email-status/route.js',
      'app/api/booking-request/route.js',
      'app/api/inquiry/route.js',
      'app/api/payment/create-intent/route.js',
      'app/api/payment/create-recurring-setup/route.js',
      'app/api/webhooks/stripe/route.js',
      'app/lib/recurring-billing.js',
      'app/lib/monthly-billing.js',
      'app/lib/email-log.js',
      'app/lib/booking-fulfillment.js',
      'app/lib/database.js',
    ];
    for (const mod of MODULES) {
      const source = read(mod);
      assert.ok(
        !/createClient\(\s*\n?\s*process\.env\.SUPABASE_URL,\s*\n?\s*process\.env\.SUPABASE_ANON_KEY/.test(source),
        `${mod} must use app/lib/supabase-server.js, not a direct anon-key client`
      );
    }
  });

  test('the shared client prefers the service-role key', async () => {
    const { resolveSupabaseKey, usingServiceRole } = await import('../app/lib/supabase-server.js');
    const original = process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_test';
      assert.equal(resolveSupabaseKey(), 'service_role_test');
      assert.equal(usingServiceRole(), true);

      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      assert.equal(resolveSupabaseKey(), process.env.SUPABASE_ANON_KEY);
      assert.equal(usingServiceRole(), false);
    } finally {
      if (original === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = original;
    }
  });

  test('the service-role key is never exposed as a NEXT_PUBLIC_ variable', () => {
    const envExample = read('.env.example');
    assert.ok(!envExample.includes('NEXT_PUBLIC_SUPABASE_SERVICE'));
    assert.ok(
      envExample.includes('SUPABASE_SERVICE_ROLE_KEY'),
      '.env.example must document the service-role key'
    );
  });

  test('an RLS migration exists and covers every table the app writes', () => {
    const migration = read('scripts/migrations/2026_enable_row_level_security.sql');
    for (const table of ['bookings', 'inquiries', 'email_events', 'cron_runs']) {
      assert.ok(
        migration.includes(`ALTER TABLE IF EXISTS ${table} ENABLE ROW LEVEL SECURITY`),
        `migration must enable RLS on ${table}`
      );
    }
    assert.ok(
      migration.includes('REVOKE ALL ON TABLE public.%I FROM anon, authenticated'),
      'migration must revoke anon/authenticated grants'
    );
  });
});

// ---------------------------------------------------------------------------

describe('security headers', () => {
  test('middleware sets a CSP with the directives that matter', () => {
    const source = read('middleware.js');
    for (const directive of [
      "'frame-ancestors': [\"'none'\"]",
      "'object-src': [\"'none'\"]",
      "'base-uri': [\"'self'\"]",
      "'form-action': [\"'self'\"]",
    ]) {
      assert.ok(source.includes(directive), `CSP must include ${directive}`);
    }
    assert.ok(source.includes('Content-Security-Policy'));
    assert.ok(source.includes('Strict-Transport-Security'));
    assert.ok(source.includes('Permissions-Policy'));
  });

  test('the CSP allows every origin Stripe needs', () => {
    // A CSP that is too tight breaks checkout instead of protecting it, and
    // the failure is quiet: the Radar fraud frame and Stripe's telemetry are
    // blocked without any user-visible error. ACH (the default for recurring
    // bookings) runs through Financial Connections on a *.js.stripe.com
    // frame, so that wildcard is load-bearing.
    const source = read('middleware.js');
    const required = [
      ['script-src', 'https://js.stripe.com'],
      ['script-src', 'https://*.js.stripe.com'],
      ['frame-src', 'https://*.js.stripe.com'],   // Financial Connections / ACH
      ['frame-src', 'https://hooks.stripe.com'],
      ['frame-src', 'https://m.stripe.network'],  // Radar fraud signals
      ['connect-src', 'https://*.stripe.com'],    // api / q / errors
      ['img-src', 'https://*.stripe.com'],        // card brand logos
    ];
    for (const [directive, origin] of required) {
      const block = source.slice(source.indexOf(`'${directive}'`));
      const end = block.indexOf('],') >= 0 ? block.indexOf('],') + 2 : block.length;
      assert.ok(
        block.slice(0, end).includes(origin),
        `CSP ${directive} must allow ${origin} or Stripe checkout breaks`
      );
    }
  });

  test('API responses are marked no-store and noindex', () => {
    const source = read('middleware.js');
    assert.ok(source.includes("'Cache-Control', 'no-store, max-age=0'"));
    assert.ok(source.includes("'X-Robots-Tag', 'noindex, nofollow'"));
  });

  test('the Stripe webhook bypass is still first in the middleware', () => {
    // Stripe signs the raw body; anything that touches this path breaks
    // signature verification and silently drops every payment confirmation.
    const source = read('middleware.js');
    const bypass = source.indexOf("startsWith('/api/webhooks/')");
    const firstHeader = source.indexOf('response.headers.set');
    assert.ok(bypass > 0 && bypass < firstHeader, 'webhook bypass must precede header work');
  });

  test('the legacy XSS auditor is explicitly disabled, not left on', () => {
    // `1; mode=block` is actively harmful — the filter could be induced to
    // introduce vulnerabilities by selectively nulling out script, which is
    // why browsers removed it. `0` is the only correct value to send.
    const source = read('middleware.js');
    assert.ok(
      source.includes("set('X-XSS-Protection', '0')"),
      'X-XSS-Protection must be explicitly 0'
    );
    assert.ok(
      !/X-XSS-Protection'?,\s*'1/.test(source) && !read('next.config.js').includes("'1; mode=block'"),
      'the legacy 1; mode=block value must never come back'
    );
  });

  test('there is no user-agent blocklist', () => {
    // It blocked real visitors whose UA contained "hack" and stopped no
    // scanner (a UA is one command-line flag away from Chrome's).
    const source = read('middleware.js');
    // Match the construct, not the words — the comment above it explains why
    // the list was removed and necessarily names the old patterns.
    assert.ok(!/suspiciousPatterns/.test(source), 'UA blocklist must not be reintroduced');
    assert.ok(
      !/Access Denied/.test(source),
      'middleware must not 403 requests on user-agent alone'
    );
  });
});

// ---------------------------------------------------------------------------

describe('response bodies do not leak internals', () => {
  test('the unauthenticated booking lookup withholds PII and internal ids', () => {
    // Knowing the UUID is the only credential this endpoint has, so the
    // response is an allowlist rather than the whole row.
    const source = read('app/api/booking/[id]/route.js');
    const responseBlock = source.slice(source.indexOf('return Response.json({'));
    for (const field of [
      'phone:',
      'business_name:',
      'website_url:',
      'payment_intent_id:',
      'stripe_customer_id:',
      'stripe_subscription_id:',
      'calendar_event_id:',
    ]) {
      assert.ok(
        !responseBlock.includes(field),
        `GET /api/booking/[id] must not return ${field.replace(':', '')}`
      );
    }
  });

  test('payment routes return generic 500s', () => {
    for (const route of [
      'app/api/payment/create-intent/route.js',
      'app/api/payment/create-recurring-setup/route.js',
      'app/api/payment/create-recurring-subscription/route.js',
      'app/api/booking-request/route.js',
    ]) {
      const source = read(route);
      assert.ok(
        !/error:\s*error\.message/.test(source) && !/details:\s*error\.message\b/.test(source),
        `${route} must not return raw error.message — it can carry Postgres/Stripe internals`
      );
    }
  });
});

// ---------------------------------------------------------------------------

describe('outbound email cannot be injected with markup', () => {
  // THE BUG: every renter-supplied field was interpolated raw into the email
  // HTML. A renter could close the surrounding tag and write their own markup
  // into the staff notification or their own confirmation — messages sent from
  // our domain, our address, to a recipient who trusts them. Not XSS (mail
  // clients don't run scripts) but a working phishing/spoofing primitive.
  const PAYLOAD = `</td></tr><tr><td><a href="https://evil.example">Approve booking</a>`;

  test('esc neutralizes every HTML-significant character', () => {
    assert.equal(esc('<a href="x">&\'</a>'),
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
    assert.equal(esc(null), '');
    assert.equal(esc(undefined), '');
    assert.equal(esc(0), '0');
  });

  test('a tag-breakout payload survives escaping as inert text', () => {
    const out = esc(PAYLOAD);
    assert.ok(!out.includes('<a '), 'no live anchor may survive');
    assert.ok(!out.includes('</td>'), 'no live tag may survive');
    assert.ok(out.includes('&lt;'), 'the payload must still be readable, just escaped');
  });

  test('every renter-controlled field is escaped in the templates', () => {
    const source = read('app/lib/email.js');
    const RENTER_FIELDS = [
      'event_name', 'contact_name', 'business_name', 'special_requests',
      'home_address', 'phone', 'website_url',
    ];
    for (const field of RENTER_FIELDS) {
      const raw = new RegExp('\\$\\{booking\\.' + field + '\\}');
      assert.ok(
        !raw.test(source),
        `app/lib/email.js interpolates booking.${field} raw — wrap it in esc()`
      );
    }
    for (const field of ['message', 'name', 'startWindow']) {
      const raw = new RegExp('\\$\\{inquiry\\.' + field + '\\}');
      assert.ok(!raw.test(source), `inquiry.${field} must be escaped`);
    }
  });

  test('attachment filenames are sanitized', () => {
    const source = read('app/lib/email.js');
    // The ID photo and COI are uploaded with renter-chosen names.
    assert.ok(source.includes('function safeAttachmentFilename'));
    const attachmentBlock = source.slice(source.indexOf('function buildIdPhotoAttachment'));
    assert.ok(
      attachmentBlock.slice(0, 1200).includes('safeAttachmentFilename'),
      'buildIdPhotoAttachment must sanitize the filename'
    );
  });
});

describe('the calendar does not leak private event titles', () => {
  // THE BUG: /api/recurring-conflicts is unauthenticated and returned the raw
  // Google Calendar summary of each conflicting event — which calendar.js
  // writes as `🔒 BOOKED: <event name>`. A wide date range harvested the name
  // of every private booking at the venue.
  test('the conflict response returns a generic label, not the calendar title', () => {
    const source = read('app/api/recurring-conflicts/route.js');
    assert.ok(
      !/summary:\s*conflict\.summary/.test(source),
      '/api/recurring-conflicts must not return the raw calendar summary'
    );
    assert.ok(
      /summary:\s*'Another reservation'/.test(source),
      'conflicts should report a fixed label instead'
    );
  });

  test('availability lookups expose only booleans', () => {
    // checkCalendarAvailability returns { '6:00 AM': true, ... } — no titles.
    const source = read('app/lib/calendar.js');
    const fn = source.slice(source.indexOf('export async function checkCalendarAvailability'));
    const body = fn.slice(0, fn.indexOf('\nexport '));
    assert.ok(
      !/availability\[slot\]\s*=\s*[^;]*summary/.test(body),
      'availability must not carry event titles'
    );
  });
});

describe('renter-supplied URLs', () => {
  // THE BUG: websiteUrl accepted any string, including `javascript:` — and it
  // is rendered as a link in the staff notification email.
  test('the booking schema constrains websiteUrl to http(s)', () => {
    const source = read('app/api/booking-request/route.js');
    const block = source.slice(source.indexOf('websiteUrl:'), source.indexOf('websiteUrl:') + 1200);
    assert.ok(block.includes('http'), 'websiteUrl must be protocol-constrained');
    assert.ok(
      block.includes('protocol') || block.includes('https?:'),
      'websiteUrl must reject non-http(s) schemes such as javascript:'
    );
  });
});
