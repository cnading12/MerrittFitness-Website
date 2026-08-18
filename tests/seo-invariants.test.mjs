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

test('middleware never forces indexing on every response', () => {
  // The regression: middleware.js set `X-Robots-Tag: index, follow` on ALL
  // responses, including /book/payment and /book/success, which robots.txt
  // disallows. A header beats robots.txt for any crawler that reaches the URL
  // another way, so this was inviting thin transactional pages into the index.
  // Absent header already means "index, follow" — only the negative directive
  // is worth sending.
  const middleware = read('middleware.js');
  const forcedIndex = /X-Robots-Tag['"]\s*,\s*['"](?!noindex)[^'"]*index/.test(middleware);

  assert.equal(
    forcedIndex,
    false,
    'middleware.js sets an affirmative X-Robots-Tag. Only `noindex` directives belong there — ' +
      'the default (no header) already permits indexing.'
  );
  assert.match(
    middleware,
    /noindex/,
    'middleware.js should still send noindex for /api/ and the mid-booking routes.'
  );
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
        if (/https:\/\/merrittwellness\.net/.test(code)) offenders.push(full);
      }
    }
  };

  const repoRoot = new URL('..', import.meta.url).pathname;
  for (const root of roots) walk(`${repoRoot}${root}`);
  const files = offenders.map((f) => f.replace(repoRoot, '')).join('\n');

  assert.equal(
    files,
    '',
    `These files use the non-canonical apex host instead of www.merrittwellness.net:\n${files}`
  );
});
