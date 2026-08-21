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
import { join, dirname } from 'node:path';

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

// ---------------------------------------------------------------------------
// The import-graph check.
//
// The literal-string scan at the top of this file passed while all three promo
// codes were sitting in /_next/static, readable on the home page. It only looks
// at .tsx/.jsx files, on the assumption — stated in its own comment, and wrong
// — that "a .js lib file never ships to the client".
//
// A .js lib file ships to the client whenever a client component imports it,
// directly or through any number of hops. What actually happened:
//
//   app/page.tsx ('use client')
//     -> app/lib/venue-rates.ts        (rate tables for the marketing copy)
//       -> app/lib/booking-pricing.js  (the constants live next to the codes)
//         -> VALID_PROMO_CODES         -> /_next/static/chunks/*.js
//
// No promo code string appeared in any .tsx file, so nothing failed. The
// dictionary was in the bundle anyway, including the code that comps a booking
// 100%, skips Stripe, self-confirms and books the live calendar.
//
// So this walks the real graph instead: start at every `use client` file,
// follow every relative and `@/` import, and fail if a promo code is reachable.
// ---------------------------------------------------------------------------

const REPO_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const RESOLVE_EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

function allSourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) allSourceFiles(full, acc);
    else if (/\.(tsx|jsx|ts|js|mjs)$/.test(full)) acc.push(full);
  }
  return acc;
}

// Resolve an import specifier to a file in this repo, or null for a bare
// package specifier (node_modules never carries our promo codes).
function resolveSpecifier(specifier, fromFile) {
  let base;
  if (specifier.startsWith('@/')) base = join(REPO_ROOT, specifier.slice(2));
  else if (specifier.startsWith('.')) base = join(dirname(fromFile), specifier);
  else return null;

  for (const ext of RESOLVE_EXTS) {
    const candidate = base + ext;
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {}
  }
  // A ".js" specifier pointing at a ".ts" source (or vice versa).
  const swapped = base.replace(/\.(js|jsx)$/, '');
  if (swapped !== base) {
    for (const ext of RESOLVE_EXTS) {
      const candidate = swapped + ext;
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {}
    }
  }
  return null;
}

// Comments are stripped first: several modules NAME a forbidden import in a
// warning comment ("never import booking-pricing.js here"), and counting those
// as real edges would make the graph lie in the direction of a false failure.
function stripComments(contents) {
  return contents.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function importSpecifiersIn(contents) {
  const code = stripComments(contents);
  const found = [];
  // A multi-line `import { a, b } from 'x'` is the common form in this repo, so
  // these must match across newlines — an earlier version of this walker used
  // [^'"\n;]* and silently saw NO edge out of venue-rates.ts, which is exactly
  // the edge that leaked the promo dictionary. Matching `from '...'` covers
  // both `import ... from` and `export ... from`.
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /(?:^|[\n;])\s*import\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(code)) !== null) found.push(m[1]);
  }
  return found;
}

function isClientEntry(file) {
  // The directive must be at the top of the file to count.
  const head = readFileSync(file, 'utf8').slice(0, 400);
  return /^\s*(['"])use client\1/m.test(head);
}

// Every module the browser can receive: the transitive closure of imports from
// every `use client` file.
function clientReachableModules() {
  const entries = [...allSourceFiles('app'), ...allSourceFiles('components'), ...allSourceFiles('lib')]
    .filter(isClientEntry);

  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const contents = readFileSync(file, 'utf8');
    for (const specifier of importSpecifiersIn(contents)) {
      const resolved = resolveSpecifier(specifier, file);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return { entries, modules: seen };
}

test('no promo code is reachable from any client component', () => {
  const { entries, modules } = clientReachableModules();

  // Guard the guard: if the walker silently stopped resolving imports, the
  // assertion below would pass by finding nothing. These pin that it ran.
  assert.ok(entries.length >= 5, `expected several 'use client' files, found ${entries.length}`);
  assert.ok(modules.size >= 20, `import walk looks broken — only reached ${modules.size} modules`);
  assert.ok(
    [...modules].some((f) => f.endsWith('app/lib/venue-rates.ts')),
    'the walk should reach app/lib/venue-rates.ts — it is imported by the home page, ' +
      'and it is the hop that leaked the promo dictionary into the bundle'
  );

  const offenders = [];
  for (const file of modules) {
    const contents = readFileSync(file, 'utf8');
    for (const code of CODES) {
      if (contents.includes(code)) offenders.push(`${file} contains "${code}"`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'These modules are reachable from a `use client` component, so they compile into ' +
      'the public JavaScript bundle. A promo code here is readable by every visitor:\n' +
      offenders.join('\n')
  );
});

test('the pricing engine is not reachable from any client component', () => {
  // A structural version of the test above: booking-pricing.js is where the
  // codes live, so keeping the MODULE out of the client graph is what stops a
  // future edit from re-leaking them. The public numbers live in
  // app/lib/pricing-constants.js, which is safe to import from a page.
  const { modules } = clientReachableModules();
  const leaked = [...modules].filter((f) => f.endsWith('app/lib/booking-pricing.js'));

  assert.deepEqual(
    leaked,
    [],
    'app/lib/booking-pricing.js is reachable from a client component. It holds ' +
      'VALID_PROMO_CODES, so it must never enter the client bundle — import the ' +
      'numbers from app/lib/pricing-constants.js instead.'
  );
});
