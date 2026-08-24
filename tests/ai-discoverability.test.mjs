// AI / answer-engine discoverability invariants.
//
// People increasingly ask an assistant for a venue rather than searching for
// one, and an assistant recommends what it can fetch and quote. Three things
// have to stay true for that to work, and each is easy to break silently:
//
//   1. The AI crawlers stay allowed — including the subtle robots.txt trap
//      where naming a bot in its own group makes it ignore the wildcard group
//      entirely, so a named "Allow: /" without the disallow list would open
//      /api/ and the payment pages to exactly those bots.
//   2. /llms.txt and /venue-facts keep deriving every figure from the booking
//      engine's constants. A typed number here is worse than a typed number
//      on a marketing page: it is published in machine-readable form,
//      explicitly labelled authoritative, and repeated by assistants.
//   3. /venue-facts stays server-rendered with nothing behind an interaction.
//      Several AI fetchers take the raw HTML and never run JavaScript.
//
// Like tests/seo-invariants.test.mjs, this reads the sources as text: the
// files under test are TypeScript and this suite runs on bare `node --test`
// with no transform step.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * Source with its commentary removed, so an assertion matches what the file
 * DOES rather than what it says about itself. Every file under test explains
 * the trap it is avoiding, usually by quoting the exact pattern the assertion
 * greps for — without this, each of those explanations fails its own test.
 *
 * Strips /* ... *\/ (which also covers JSX {/* ... *\/}) and whole-line //
 * comments. Whole-line only: cutting at a mid-line // would swallow the //
 * inside a URL literal.
 */
const readCode = (path) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');

const ROBOTS = 'app/robots.ts';
const LLMS = 'app/llms.txt/route.ts';
const FACTS = 'app/venue-facts/page.tsx';
const SUMMARY = 'lib/ai-summary.ts';

/**
 * The agents whose access decides whether this venue can appear in an AI
 * answer at all. Removing one is a business decision, not a refactor — if it
 * is deliberate, change this list in the same commit and say why.
 */
const REQUIRED_AI_AGENTS = [
  // Anthropic — Claude
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  // OpenAI — ChatGPT
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Google — Gemini and AI Overviews. Permission token only; the sole way to
  // opt in is to name it here.
  'Google-Extended',
  // Apple — Siri / Apple Intelligence. Same permission-token shape.
  'Applebot-Extended',
  // Perplexity
  'PerplexityBot',
];

test('robots.ts names every AI agent the venue depends on being visible to', () => {
  const source = read(ROBOTS);
  const missing = REQUIRED_AI_AGENTS.filter((agent) => !source.includes(`'${agent}'`));

  assert.deepEqual(
    missing,
    [],
    `These AI agents are no longer named in ${ROBOTS}: ${missing.join(', ')}. ` +
      'An unnamed agent falls back to the wildcard group, which still allows it — but ' +
      'Google-Extended and Applebot-Extended are permission tokens with no crawler behind ' +
      'them, so for those two, not being named IS the opt-out.'
  );
});

test('robots.ts never disallows an AI agent outright', () => {
  // The failure this catches is a well-meaning "block the scrapers" edit.
  // Blocking these agents does not protect anything — the pages are public
  // marketing copy — it just removes the venue from the answers.
  const source = readCode(ROBOTS);

  // Any rule object that sets disallow to the whole site.
  const blanketBlocks = source.match(/disallow:\s*'\/'/g) || [];
  assert.deepEqual(
    blanketBlocks,
    [],
    `${ROBOTS} contains a site-wide disallow. If an AI agent is being blocked on purpose, ` +
      'delete this assertion deliberately and record the decision in SEO_CHANGES.md.'
  );
});

test('every named robots group repeats the shared disallow list', () => {
  // THE TRAP. A crawler obeys exactly one group — the one naming its
  // user-agent — and ignores `*` once such a group exists. So a named group
  // written as a bare `allow: '/'` grants that bot /api/ and the mid-booking
  // pages, which the wildcard group is careful to withhold. Sharing one
  // constant is what prevents it; this asserts the sharing, not the text.
  const source = readCode(ROBOTS);

  const ruleBodies = source.match(/userAgent:[\s\S]*?\n      \}/g) || [];
  assert.ok(ruleBodies.length >= 2, `expected at least two robots groups in ${ROBOTS}`);

  for (const body of ruleBodies) {
    assert.match(
      body,
      /disallow:\s*DISALLOWED/,
      'Every robots group must use the shared DISALLOWED constant. A group with its own ' +
        'inline disallow list (or none at all) will drift from the wildcard group, and for ' +
        'the bots it names that drift is the effective policy:\n' +
        body
    );
  }
});

test('the AI-facing surfaces never hardcode a dollar figure', () => {
  // Same rule the marketing pages live under, for a stronger reason: these
  // two surfaces present themselves as the authoritative summary, and an
  // assistant will repeat a stale rate to a renter as fact.
  for (const path of [SUMMARY, LLMS, FACTS]) {
    const code = readCode(path);

    // `$${...}` is a template-literal interpolation of a computed rate and is
    // exactly what we want; `$95` typed into a string is not.
    const literals = code.match(/\$\d[\d,]*/g) || [];
    assert.deepEqual(
      literals,
      [],
      `${path} contains typed dollar figures: ${literals.join(', ')}. ` +
        'Import from app/lib/venue-rates.ts (via lib/ai-summary.ts) instead — those derive ' +
        'from the constants the booking engine actually charges with.'
    );
  }
});

test('lib/ai-summary.ts derives its numbers rather than restating them', () => {
  const source = read(SUMMARY);

  for (const symbol of ['rateBands', 'specs', 'money']) {
    assert.match(
      source,
      new RegExp(`\\b${symbol}\\b`),
      `${SUMMARY} no longer references ${symbol}. It is supposed to be a rendering of the ` +
        'existing single-source data, not a second copy of it.'
    );
  }
});

test('/llms.txt keeps the shape an answer engine expects', () => {
  const source = read(LLMS);

  // The llmstxt.org convention: an H1 name, then a blockquote one-liner. A
  // fetcher that reads nothing else reads those two.
  assert.match(source, /# Merritt Wellness/, '/llms.txt must open with the H1 business name');
  assert.match(source, /> \$\{oneLineSummary\}/, '/llms.txt must carry the one-line summary as a blockquote');

  // The path is the convention. Renaming the directory makes the file
  // unfindable, because nothing looks anywhere else for it.
  assert.doesNotThrow(
    () => read(LLMS),
    'The route must stay at app/llms.txt/route.ts — the filename IS the convention.'
  );
});

test('/llms.txt routes every new enquiry to the inquiries contact only', () => {
  // CLAUDE.md's contact-routing rule: clientservices@ is for people who have
  // already booked. A machine-readable summary is precisely where that
  // distinction gets flattened, so the client-services details are simply
  // absent from this file rather than labelled.
  const code = readCode(LLMS);

  assert.doesNotMatch(
    code,
    /clientServices/,
    '/llms.txt must not publish the client-services phone or email. An assistant summarising ' +
      'this file will not reliably preserve the "existing clients only" caveat, and a new ' +
      "renter's enquiry then lands in the wrong inbox."
  );
  assert.match(code, /contact\.inquiries/, '/llms.txt must still publish the inquiries contact');
});

test('/venue-facts renders server-side with no facts behind an interaction', () => {
  const source = readCode(FACTS);

  assert.doesNotMatch(
    source,
    /^\s*'use client'/m,
    `${FACTS} must stay a server component. Several AI fetchers read the raw HTML and never ` +
      'execute JavaScript, so a client-rendered fact is a fact they never see.'
  );

  // FaqSection is an accordion that collapses every answer by default. It is
  // right for the marketing pages and wrong here: this page exists so the
  // answers are readable in one fetch.
  assert.doesNotMatch(
    source,
    /FaqSection/,
    `${FACTS} must render its FAQ open rather than through <FaqSection>, whose accordion hides ` +
      'the answers behind a click.'
  );
});

test('/venue-facts states the venue\'s limits, not just its selling points', () => {
  // The honest block is the reason the page works. A model that knows where
  // the venue is wrong recommends it far more confidently where it is right —
  // and a renter who learns about the 10 PM curfew here does not learn about
  // it after signing.
  const summary = read(SUMMARY);
  const page = read(FACTS);

  assert.match(
    summary,
    /export const notTheRightRoomFor/,
    `${SUMMARY} must keep exporting notTheRightRoomFor.`
  );
  assert.match(
    page,
    /notTheRightRoomFor/,
    `${FACTS} must render notTheRightRoomFor. Deleting the "not the right room for" block makes ` +
      'the page a brochure, which is the one thing it is not for.'
  );

  // Each limit is a stated policy or a physical fact; keep the list real.
  const limits = summary.slice(summary.indexOf('export const notTheRightRoomFor'));
  const listEnd = limits.indexOf('];');
  assert.ok(
    limits.slice(0, listEnd).split('\n').filter((l) => l.trim().startsWith('`')).length >= 4,
    'notTheRightRoomFor has been trimmed to fewer than four entries. The venue really does have ' +
      'a capacity ceiling, a 10 PM curfew, no alcohol sales, and a Sunday-daytime restriction.'
  );
});

test('/venue-facts is in the sitemap and linked from the footer', () => {
  // An orphan page is a page an assistant never finds. /llms.txt points at it
  // by URL, but the sitemap and an internal link are what get it crawled in
  // the first place.
  assert.match(
    read('app/sitemap.ts'),
    /'\/venue-facts'/,
    '/venue-facts must be listed in app/sitemap.ts'
  );
  assert.match(
    read('components/Footer.tsx'),
    /href="\/venue-facts"/,
    '/venue-facts must stay linked from the footer'
  );
});

test('the priced service lines feed the schema graph, /llms.txt and /venue-facts alike', () => {
  // These three used to be one list in three places waiting to happen. If a
  // service is added to the graph but not the AI surfaces, an assistant
  // recommends a venue that does not do the thing it was asked about.
  assert.match(
    read('lib/site-schema.ts'),
    /export const serviceLines/,
    'lib/site-schema.ts must keep exporting serviceLines'
  );
  assert.match(read(SUMMARY), /serviceLines/, `${SUMMARY} must build its offerings from serviceLines`);

  for (const path of [LLMS, FACTS]) {
    assert.match(
      read(path),
      /\bofferings\b/,
      `${path} must render the shared offerings list rather than its own copy.`
    );
  }
});
