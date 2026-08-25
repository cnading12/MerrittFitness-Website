// Promo codes must never reach the browser — and must never reach the REPO.
//
// One of these codes comps a booking 100%: it skips Stripe entirely, confirms
// on the spot, and books the live Google Calendar. It is a credential, and it
// has leaked three separate ways:
//
//   1. Hardcoded in app/book/page.tsx — a client component, so it shipped in
//      the public JS bundle. Fixed by moving it to a lib file.
//   2. Still in the bundle after that fix, because app/page.tsx ('use client')
//      imports app/lib/venue-rates.ts which imported booking-pricing.js. A
//      .js lib file ships to the browser whenever a client component imports
//      it, at any depth. Fixed by splitting the public numbers into
//      pricing-constants.js.
//   3. In the repository itself. This repo is PUBLIC, so every code ever
//      committed is readable at github.com — in the tree and permanently in
//      history. No amount of bundling discipline helps with that one.
//
// So the codes are configuration now, not source: app/lib/promo-codes.js reads
// them from PROMO_CODE_PARTNER / PROMO_CODE_COMP / PROMO_CODE_SPONSOR. This
// file pins what has to stay true:
//
//   1. No configured code appears in ANY source file — not just client ones.
//      This covers every configured role automatically, including the daytime
//      code that unlocks the weekday workspace hours — it is a lesser
//      credential than the comp code, but it is still one.
//   2. No code is reachable from a `use client` component (the import-graph
//      walk at the bottom), so a future refactor cannot re-bundle them.
//   3. The endpoint validates one submitted code and returns only THAT code's
//      metadata — never the dictionary, and never a hint about other codes.
//   4. Guessing is rate limited, so the endpoint isn't a brute-force oracle.
//   5. Unset variables fail CLOSED: no codes, not all codes.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Test codes, set before anything reads them. Deliberately not the real ones:
// this file scans the repository for whatever is configured, so using
// production codes here would plant them in the very tree it is guarding.
process.env.PROMO_CODE_PARTNER = 'TEST-PARTNER-4H7KQ2NX';
process.env.PROMO_CODE_COMP = 'TEST-COMP-9P3RJ6WM';
process.env.PROMO_CODE_SPONSOR = 'TEST-SPONSOR-5T8DGY2C';
process.env.PROMO_CODE_DAYTIME = 'TEST-DAYTIME-6Q2WVK8B';

const { validPromoCodes, sponsoredPromoCodes, daytimeAllowedPromoCodes, promoCodeAllowsDaytime, __resetPromoWarning } =
  await import('../app/lib/promo-codes.js');
const { isSponsoredBooking } = await import('../app/lib/calendar-flags.js');
const { POST: validatePromo } = await import('../app/api/validate-promo/route.js');
const { __resetRateLimits } = await import('../app/lib/rate-limit.js');

const VALID_PROMO_CODES = validPromoCodes();
const SPONSORED_PROMO_CODES = sponsoredPromoCodes();
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


test('calendar labelling follows the configured sponsored code', () => {
  // calendar-flags.js used to keep its own hardcoded COPY of the sponsored
  // list so it could stay free of heavier imports. Rotating a code without
  // updating both places failed silently in the worst way: the booking was
  // still comped, but stopped being LABELLED "Sponsored" on the calendar and
  // in staff emails, so a free booking looked like a paid one and nobody
  // found out until someone asked. It now derives from promo-codes.js.
  assert.equal(SPONSORED_PROMO_CODES.length, 1, 'exactly one code comps a booking outright');

  assert.equal(
    isSponsoredBooking({ promo_code: SPONSORED_PROMO_CODES[0] }), true,
    'a booking carrying the configured comp code must be labelled sponsored'
  );
  // The staffing-billed sponsorship collects payment, so it is NOT sponsored
  // in this sense and must not get the "fully comped" badge or $0.00 labels.
  assert.equal(
    isSponsoredBooking({ promo_code: process.env.PROMO_CODE_SPONSOR }), false,
    'the staffing-billed code bills the renter and must not read as comped'
  );
  assert.equal(isSponsoredBooking({ promo_code: 'NOT-A-CODE' }), false);
  assert.equal(isSponsoredBooking(null), false);
});

test('no configured promo code appears in ANY source file', () => {
  // The strongest form of this check, and the one the earlier versions
  // missed. They asked "is a code in a file that reaches the browser?" — but
  // this repository is PUBLIC, so a code committed to a server-only file is
  // published just the same, and stays published in the git history even
  // after it is removed. The only safe answer is that no code is in the tree
  // at all: they come from the environment.
  // A test file that assigns its own fixture code to PROMO_CODE_* owns that
  // string, so finding it there is not a leak — that is the mechanism working.
  // Every OTHER appearance is one, including in a test: this repo is public,
  // so a real code pasted into a fixture is just as exposed as one in app/.
  const definedIn = (contents) =>
    new Set([...contents.matchAll(/process\.env\.PROMO_CODE_[A-Z]+\s*=\s*['"]([^'"]+)['"]/g)]
      .map((m) => m[1]));

  const offenders = [];
  for (const file of allSourceFiles('app').concat(
    allSourceFiles('components'), allSourceFiles('lib'), allSourceFiles('tests')
  )) {
    const contents = readFileSync(file, 'utf8');
    const owned = definedIn(contents);
    for (const code of CODES) {
      if (contents.includes(code) && !owned.has(code)) {
        offenders.push(`${file} contains "${code}"`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'A promo code is committed to this PUBLIC repository, where it is readable ' +
      'by anyone — and stays readable in git history after you delete it. Set it ' +
      'in PROMO_CODE_PARTNER / PROMO_CODE_COMP / PROMO_CODE_SPONSOR instead:\n' +
      offenders.join('\n')
  );
});

test('unset promo variables fail closed — no codes, not all codes', () => {
  const saved = {
    PROMO_CODE_PARTNER: process.env.PROMO_CODE_PARTNER,
    PROMO_CODE_COMP: process.env.PROMO_CODE_COMP,
    PROMO_CODE_SPONSOR: process.env.PROMO_CODE_SPONSOR,
    PROMO_CODE_DAYTIME: process.env.PROMO_CODE_DAYTIME,
  };
  try {
    for (const key of Object.keys(saved)) delete process.env[key];
    __resetPromoWarning();

    assert.deepEqual(validPromoCodes(), {}, 'no configuration must mean no valid codes');
    assert.deepEqual(sponsoredPromoCodes(), [], 'nothing may be treated as comped');
    // The dangerous failure would be a booking reading as comped with no code
    // configured — that books the venue for free.
    assert.equal(isSponsoredBooking({ promo_code: saved.PROMO_CODE_COMP }), false);
    assert.equal(isSponsoredBooking({ promo_code: '' }), false);
    // Same direction for the daytime unlock: with nothing configured, the
    // weekday window stays protected rather than opening to everyone.
    assert.deepEqual(daytimeAllowedPromoCodes(), []);
    assert.equal(promoCodeAllowsDaytime(saved.PROMO_CODE_DAYTIME), false);
    assert.equal(promoCodeAllowsDaytime(''), false);
  } finally {
    Object.assign(process.env, saved);
    __resetPromoWarning();
  }
});

test('a blank or whitespace-only variable is treated as unset', () => {
  const saved = process.env.PROMO_CODE_COMP;
  try {
    // A cleared dashboard field can arrive as "" or " ", and an empty-string
    // code would otherwise become a dictionary key that matches a renter
    // submitting nothing at all.
    for (const blank of ['', '   ', '\n']) {
      process.env.PROMO_CODE_COMP = blank;
      assert.deepEqual(sponsoredPromoCodes(), [], `"${blank}" must not register a code`);
      assert.equal(isSponsoredBooking({ promo_code: '' }), false);
    }
  } finally {
    process.env.PROMO_CODE_COMP = saved;
  }
});

test('a code pasted with surrounding whitespace still works', () => {
  // Dashboard fields routinely pick up a trailing newline on paste, and the
  // resulting "the code doesn't work" is invisible from the outside.
  const saved = process.env.PROMO_CODE_COMP;
  try {
    process.env.PROMO_CODE_COMP = `  ${saved}\n`;
    assert.equal(isSponsoredBooking({ promo_code: saved }), true);
  } finally {
    process.env.PROMO_CODE_COMP = saved;
  }
});

test('the retired promo codes are gone everywhere', () => {
  // These shipped in the public bundle and must never come back — not in the
  // dictionary, not in a comment, not in a test fixture.
  const RETIRED = [
    // Generation 1 — hardcoded in a client component.
    'MerrittMagic', 'COLESTEST', 'MerrittSponsor100',
    // Generation 2 — never hardcoded, but bundled via a transitive import AND
    // committed to this public repo. Burned on both counts.
    'MERRITT-PARTNER-W3BJG56Q', 'MERRITT-COMP-MZ2BVJYE', 'MERRITT-SPONSOR-Z68KV6YY',
  ];
  const files = [
    ...allSourceFiles('app'),
    ...allSourceFiles('components'),
    ...allSourceFiles('lib'),
    ...allSourceFiles('tests'),
  ];

  const offenders = [];
  for (const file of files) {
    const contents = readFileSync(file, 'utf8');
    for (const code of RETIRED) {
      // This test names them, which is the point — it is the list of strings
      // that must never work again. Nothing else may mention them.
      if (contents.includes(code) && !file.endsWith('promo-code-privacy.test.mjs')) {
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

test('the promo dictionary and the intake guards stay out of the client bundle', () => {
  // Structural companions to the booking-pricing check above. promo-codes.js
  // IS the dictionary now, and booking-guards.js imports it to decide who may
  // book weekday daytime — so neither may ever become client-reachable, no
  // matter how convenient it looks to import a helper from a page.
  const { modules } = clientReachableModules();
  const leaked = [...modules].filter((f) =>
    f.endsWith('app/lib/promo-codes.js') || f.endsWith('app/lib/booking-guards.js'));

  assert.deepEqual(
    leaked,
    [],
    'A module holding or reading the promo dictionary is reachable from a `use client` ' +
      'component, so it compiles into the public JavaScript bundle:\n' + leaked.join('\n')
  );
});

test('the modules the booking form DOES import carry no codes and no promo imports', () => {
  // The booking form needs the weekday-window rule and the slot math to draw
  // the time picker, so these two are deliberately client-reachable. That is
  // only safe while they stay pure: constants and date math, with no path to
  // the dictionary. This asserts the walker actually sees them (so the check
  // is not vacuous) and that they hold nothing they shouldn't.
  const { modules } = clientReachableModules();
  const CLIENT_SAFE = ['app/lib/flex-space-hours.js', 'app/lib/availability.js'];

  for (const name of CLIENT_SAFE) {
    const file = [...modules].find((f) => f.endsWith(name));
    assert.ok(file, `expected ${name} to be reachable from the booking form — if it is not, ` +
      'this test is passing vacuously and the import graph has changed');

    const contents = readFileSync(file, 'utf8');
    for (const code of CODES) {
      assert.equal(contents.includes(code), false, `${name} contains a promo code`);
    }
    const imports = importSpecifiersIn(contents);
    assert.deepEqual(
      imports.filter((i) => /promo-codes|booking-pricing|booking-guards/.test(i)),
      [],
      `${name} imports a server-only module. It is reachable from a client component, ` +
        'so that would pull the promo dictionary into the public bundle.'
    );
  }
});
