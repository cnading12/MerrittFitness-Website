// SEO / structured-data invariants.
//
// These lock in three regressions that have already happened once each. They
// read the source files as text rather than importing them, because the files
// under test are TypeScript and this suite runs on bare `node --test` with no
// transform step — the same reason the other suites only import from
// app/lib/*.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// Imported directly rather than through middleware.js: `next/server` only
// resolves inside the Next build, and middleware.js is a thin wrapper that
// applies exactly this header set.
const { securityHeaders, isNoindexPath } = await import('../app/lib/security-headers.js');

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * Split app/data/events.ts into one text block per event object. Each block
 * starts at an `id: "..."` line and runs to the next one.
 */
function eventBlocks() {
  const source = read('app/data/events.ts');
  const start = source.indexOf('export const events: Event[] = [');
  assert.ok(start > -1, 'could not find the events array — did the export get renamed?');

  const body = source.slice(start);
  const parts = body.split(/\n\s*id: "/).slice(1);
  return parts.map((part) => {
    const id = part.slice(0, part.indexOf('"'));
    return { id, text: part };
  });
}

/** Everything between `description: "` and its closing quote. */
function descriptionOf(block) {
  const match = block.text.match(/description: "((?:[^"\\]|\\.)*)"/);
  return match ? match[1] : '';
}

test('events data: no paid event is presented as free', () => {
  // The bug this prevents: the calendar card used to decide "is this free?"
  // by asking whether a ticketUrl existed, so classes collecting $35 or $15
  // over Venmo rendered a green "Free Event" badge AND emitted
  // isAccessibleForFree:true to Google. `free: true` must now mean free.
  const offenders = [];

  for (const block of eventBlocks()) {
    const isFree = /\n\s*free: true,/.test(block.text);
    if (!isFree) continue;

    const priced = descriptionOf(block).match(/\$\d/);
    if (priced) offenders.push(block.id);
  }

  assert.deepEqual(
    offenders,
    [],
    `These events are marked free: true but quote a price in their description: ${offenders.join(', ')}. ` +
      'Either drop the `free` flag and add a `price`, or remove the figure from the copy.'
  );
});

test('events data: an event that quotes a price carries structured price data', () => {
  // Without a `price` field the Event JSON-LD ships `offers` with no
  // `price`/`priceCurrency`, which Google's Event spec requires, and the card
  // has nothing to show. An externally ticketed event is allowed to omit the
  // figure — the ticket page owns it — so those are exempt.
  const offenders = [];

  for (const block of eventBlocks()) {
    const hasPriceField = /\n\s*price: \{/.test(block.text);
    const hasTicketUrl = /\n\s*ticketUrl: /.test(block.text);
    if (hasPriceField || hasTicketUrl) continue;

    if (descriptionOf(block).match(/\$\d/)) offenders.push(block.id);
  }

  assert.deepEqual(
    offenders,
    [],
    `These events quote a price in prose but have neither a \`price\` field nor a \`ticketUrl\`: ${offenders.join(', ')}. ` +
      'Add `price: { from: N }` so the calendar and the structured data can both show it.'
  );
});

test('events data: free and price are mutually exclusive', () => {
  const offenders = eventBlocks()
    .filter((block) => /\n\s*free: true,/.test(block.text) && /\n\s*price: \{/.test(block.text))
    .map((block) => block.id);

  assert.deepEqual(offenders, [], `Events declaring both \`free\` and \`price\`: ${offenders.join(', ')}`);
});

test('transactional routes are noindexed, marketing routes are not', () => {
  // The regression: `X-Robots-Tag: index, follow` went out on EVERY non-API
  // response, including /book/payment and /book/success, which robots.txt
  // disallows. robots.txt only asks a crawler not to FETCH a URL; the header
  // beats it for any crawler that arrives by link or shared receipt, so the
  // header was actively inviting thin transactional pages into the index.
  //
  // This asserts the real behaviour rather than grepping middleware.js. The
  // policy moved into app/lib/security-headers.js, so a text match against
  // the middleware would now pass vacuously while the header was wrong.
  const robotsFor = (pathname) =>
    securityHeaders({
      isApi: pathname.startsWith('/api/'),
      noindex: isNoindexPath(pathname),
    })['X-Robots-Tag'];

  for (const pathname of [
    '/api/booking/abc123',
    '/book/payment',
    '/book/payment-complete',
    '/book/success',
  ]) {
    assert.equal(
      robotsFor(pathname),
      'noindex, nofollow',
      `${pathname} must be noindexed — it is transactional and often carries a booking id.`
    );
  }

  // The marketing pages are the product. Never let the noindex prefixes widen
  // far enough to swallow them; /book itself is a real landing page.
  for (const pathname of ['/', '/weddings', '/class-partnerships', '/calendar', '/book', '/contact']) {
    assert.equal(
      robotsFor(pathname),
      'index, follow',
      `${pathname} is a marketing page and must stay indexable.`
    );
  }
});

test('the business node is declared in exactly one place', () => {
  // The regression: app/layout.tsx and app/page.tsx each emitted a
  // LocalBusiness under the same @id with conflicting values (priceRange
  // "$$" vs "$95/hour", string vs numeric coordinates). Crawlers merging two
  // conflicting nodes under one @id pick unpredictably. lib/site-schema.ts is
  // the only file allowed to build it.
  const declarers = [
    'app/layout.tsx',
    'app/page.tsx',
    'lib/site-schema.ts',
    'lib/venue-schema.ts',
  ].filter((path) => read(path).includes("'LocalBusiness'") || read(path).includes('"LocalBusiness"'));

  assert.deepEqual(
    declarers,
    ['lib/site-schema.ts'],
    `LocalBusiness should only be built in lib/site-schema.ts, but found in: ${declarers.join(', ')}`
  );
});

test('priceRange is a valid range, not a per-unit rate', () => {
  // "$95/hour" is not a valid schema.org priceRange; the property expects a
  // currency band ("$$") or a range ("$95-$320").
  const schema = read('lib/site-schema.ts');
  const match = schema.match(/priceRange: `([^`]+)`/);
  assert.ok(match, 'could not find priceRange in lib/site-schema.ts');
  assert.equal(
    /\/\s*(hour|hr|day)/i.test(match[1]),
    false,
    `priceRange must not carry a per-unit suffix, got: ${match[1]}`
  );
});

test('every absolute site URL uses the canonical host', () => {
  // The canonical host is www.merrittwellness.net, because that is the host
  // that actually serves the site — the apex 307-redirects to it:
  //
  //   curl -sSIL https://merrittwellness.net
  //   HTTP/2 307
  //   location: https://www.merrittwellness.net/
  //
  // The whole codebase used to declare the apex in canonicals, the sitemap,
  // metadataBase, and every schema @id, so every canonical tag pointed at a
  // URL that redirected to a different host. A stray non-www URL reintroduces
  // that split, so this fails on any scheme-qualified apex reference.
  //
  // If the canonical host ever moves to the apex, change the PLATFORM
  // redirect first, then flip this test and the codebase together.
  // Walk the source tree directly rather than shelling out: `grep -rl` exits
  // non-zero when it finds nothing, which is the passing case here.
  const roots = ['app', 'lib', 'components'];

  // Files where naming the apex is CORRECT, not drift.
  //
  // The invariant is about URLs the site PUBLISHES about itself — canonicals,
  // metadataBase, sitemap entries, OpenGraph urls, schema @ids. It is not
  // about URLs the site RECOGNISES. app/lib/http.js keeps a CORS origin
  // allowlist that deliberately accepts both hosts plus the old brand domain,
  // because a browser sends whichever Origin the visitor actually loaded;
  // dropping the apex there would reject real requests.
  const APEX_IS_INTENTIONAL = ['app/lib/http.js'];

  const repoRoot = new URL('..', import.meta.url).pathname;
  const offenders = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        // Scan code only. Comment lines are skipped so documentation can
        // quote the apex URL (the curl output above is worth keeping
        // verbatim) without tripping the guard. Only whole-line comments are
        // dropped — a line of real code is never skipped, and stripping `//`
        // mid-line would wrongly swallow the `//` inside a URL literal, which
        // is exactly what this test exists to catch.
        const code = readFileSync(full, 'utf8')
          .split('\n')
          .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
          .join('\n');
        const relative = full.replace(repoRoot, '');
        if (APEX_IS_INTENTIONAL.includes(relative)) continue;
        if (/https:\/\/merrittwellness\.net/.test(code)) offenders.push(full);
      }
    }
  };

  for (const root of roots) walk(`${repoRoot}${root}`);
  const files = offenders.map((f) => f.replace(repoRoot, '')).join('\n');

  assert.equal(
    files,
    '',
    `These files use the non-canonical apex host instead of www.merrittwellness.net:\n${files}`
  );
});
