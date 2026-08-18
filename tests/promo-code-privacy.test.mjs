// Promo codes must never reach the browser.
//
// The booking page used to carry the whole promo dictionary in a client
// component, so every code shipped in the public JavaScript bundle. One of
// them comps the booking 100%: a sponsored booking skips Stripe
// entirely, is confirmed on the spot, and books the live Google Calendar.
// Reading devtools was therefore enough to rent the venue for free.
//
// The codes now live only in app/lib/booking-pricing.js, and the page asks
// POST /api/validate-promo. This file pins both halves of that:
//
//   1. No code string appears in any client-side source file.
//   2. The endpoint validates one submitted code and returns only THAT code's
//      metadata — never the dictionary, and never a hint about other codes.
//   3. Guessing is rate limited, so the endpoint isn't a brute-force oracle.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const { VALID_PROMO_CODES, SPONSORED_PROMO_CODES } = await import('../app/lib/booking-pricing.js');
const { SPONSORED_PROMO_CODES: CALENDAR_SPONSORED_CODES } =
  await import('../app/lib/calendar-flags.js');
const { POST: validatePromo } = await import('../app/api/validate-promo/route.js');
const { __resetRateLimits } = await import('../app/lib/rate-limit.js');

const CODES = Object.keys(VALID_PROMO_CODES);

function sourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(tsx|jsx)$/.test(full)) acc.push(full);
  }
  return acc;
}

test('no promo code appears in any client component', () => {
  // .tsx/.jsx files are what compile into the browser bundle. The server-only
  // dictionary lives in a .js lib file, which never ships to the client.
  assert.ok(CODES.length > 0, 'there should be promo codes to protect');

  const offenders = [];
  for (const file of [...sourceFiles('app'), ...sourceFiles('components')]) {
    const contents = readFileSync(file, 'utf8');
    for (const code of CODES) {
      if (contents.includes(code)) offenders.push(`${file} contains "${code}"`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Promo codes must not appear in client-side source — they ship to every visitor:\n${offenders.join('\n')}`
  );
});

async function postCode(code, ip = '203.0.113.9') {
  const request = new Request('https://example.com/api/validate-promo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ code }),
  });
  const response = await validatePromo(request);
  return { response, body: await response.json() };
}

test('a valid code returns only its own metadata', async () => {
  __resetRateLimits();
  const code = CODES[0];
  const { response, body } = await postCode(code);

  assert.equal(response.status, 200);
  assert.equal(body.valid, true);
  assert.equal(body.code, code);
  assert.equal(typeof body.discount, 'number');

  // The response must not disclose any OTHER code.
  const serialized = JSON.stringify(body);
  for (const other of CODES.filter((c) => c !== code)) {
    assert.ok(!serialized.includes(other), `response leaked another code: ${other}`);
  }
});

test('an invalid code is refused without hinting at the real ones', async () => {
  __resetRateLimits();
  const { response, body } = await postCode('DEFINITELY-NOT-A-CODE');

  assert.equal(response.status, 200, 'an unknown code is a normal form result, not an error');
  assert.equal(body.valid, false);

  const serialized = JSON.stringify(body);
  for (const code of CODES) {
    assert.ok(!serialized.includes(code), `rejection leaked a real code: ${code}`);
  }
});

test('the sponsored code still carries its sponsored flag through the endpoint', async () => {
  // The UI needs this bit to skip checkout; losing it would silently start
  // charging comped renters, so it is worth pinning.
  const sponsored = CODES.find((c) => VALID_PROMO_CODES[c].sponsored === true);
  if (!sponsored) return;

  __resetRateLimits();
  const { body } = await postCode(sponsored);
  assert.equal(body.valid, true);
  assert.equal(body.sponsored, true);
});

test('guessing is rate limited', async () => {
  __resetRateLimits();
  const ip = '198.51.100.4';

  let sawRefusal = false;
  for (let i = 0; i < 25; i++) {
    const { response } = await postCode(`GUESS-${i}`, ip);
    if (response.status === 429) { sawRefusal = true; break; }
  }

  assert.ok(
    sawRefusal,
    'without a cap this endpoint is a brute-force oracle for discount codes'
  );
});

test('a malformed request is rejected rather than throwing', async () => {
  __resetRateLimits();
  const request = new Request('https://example.com/api/validate-promo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.7' },
    body: 'not json at all',
  });
  const response = await validatePromo(request);
  assert.equal(response.status, 400);
});

test('the code lookup cannot be tricked by inherited Object properties', async () => {
  // A plain `dict[code]` lookup answers truthy for "constructor",
  // "toString", "__proto__" and friends, which would validate a code that
  // does not exist and hand the caller a function where metadata belongs.
  __resetRateLimits();
  for (const probe of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    const { body } = await postCode(probe, '198.51.100.12');
    assert.equal(body.valid, false, `"${probe}" must not validate as a promo code`);
  }
});


test('the calendar-flags copy of the sponsored list matches booking-pricing', () => {
  // app/lib/calendar-flags.js keeps its own copy of this list so it can stay
  // free of heavier imports. That is a deliberate trade, but it means a
  // rotated code has to be changed in TWO places — and forgetting the second
  // one fails silently: the booking is still comped, but it stops being
  // labelled "Sponsored" on the calendar and in staff emails, so nobody
  // notices until someone asks why a free booking looks like a paid one.
  assert.deepEqual(
    [...CALENDAR_SPONSORED_CODES].sort(),
    [...SPONSORED_PROMO_CODES].sort(),
    'calendar-flags.js SPONSORED_PROMO_CODES has drifted from booking-pricing.js'
  );
});

test('the retired promo codes are gone everywhere', () => {
  // These shipped in the public bundle and must never come back — not in the
  // dictionary, not in a comment, not in a test fixture.
  const RETIRED = ['MerrittMagic', 'COLESTEST', 'MerrittSponsor100'];
  const files = [
    ...sourceFiles('app'),
    ...sourceFiles('components'),
    ...readdirSync('app/lib').map((f) => join('app/lib', f)).filter((f) => f.endsWith('.js')),
  ];

  const offenders = [];
  for (const file of files) {
    const contents = readFileSync(file, 'utf8');
    for (const code of RETIRED) {
      // The rotation note in booking-pricing.js names them on purpose, as a
      // record of what was burned. Everything else must be clean.
      if (contents.includes(code) && !file.endsWith('booking-pricing.js')) {
        offenders.push(`${file} still references retired code "${code}"`);
      }
    }
  }
  assert.deepEqual(offenders, [], offenders.join('\n'));
});
