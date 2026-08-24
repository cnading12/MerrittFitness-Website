import type { MetadataRoute } from 'next';

// Replaces the old static public/robots.txt, which had drifted from reality:
// it carried a `Crawl-delay: 1` that Google ignores outright and that Bing
// honours by slowing itself down for no reason, and it listed per-bot
// "Allow: /" blocks that did nothing beyond the wildcard group already above
// them.
//
// The disallow list here is deliberately short. robots.txt stops a crawler
// FETCHING a URL; it does not stop one indexing a URL it heard about
// elsewhere. Keeping pages out of the index is the job of the noindex header
// in middleware.js and the `robots` metadata on those routes — this file only
// saves crawl budget.
const BASE_URL = 'https://www.merrittwellness.net';

/**
 * The only paths any crawler is asked to skip: the API surface and the
 * mid-booking pages, which are thin, transactional, and often carry a booking
 * id in the query string.
 *
 * ⚠️ SHARED ON PURPOSE. In the robots.txt grammar a crawler obeys exactly ONE
 * group — the most specific one naming its user-agent — and ignores `*`
 * entirely once a named group exists for it. So every named group below has
 * to repeat this list; a named `Allow: /` group without it would quietly
 * hand that bot permission to crawl /api/ and the payment pages. Referencing
 * one constant is what stops the two lists drifting apart.
 */
const DISALLOWED = [
  '/api/',
  '/book/payment',
  '/book/payment-complete',
  '/book/success',
];

/**
 * The AI crawlers and answer engines, named explicitly.
 *
 * Why bother, when the wildcard group already allows them? Because for these
 * agents "allowed" is a decision somebody has to be able to audit. People
 * increasingly ask an assistant for a venue rather than searching for one,
 * and an assistant can only recommend a venue whose pages it is permitted to
 * fetch. Two of the tokens below do not crawl anything at all —
 * Google-Extended and Applebot-Extended are pure permission switches
 * controlling whether content those companies already fetched may be used for
 * AI answers and training — and they are the clearest case: the ONLY way to
 * express "yes, use our content" is to say so here.
 *
 * This is an opt-IN, chosen deliberately. A venue's marketing copy is
 * published to be repeated; being quoted in an answer is the whole point.
 * (If that ever changes, move a token out of this list and give it a
 * `disallow: '/'` group — do not simply delete it, or it silently falls back
 * to the permissive wildcard group.)
 */
const AI_USER_AGENTS = [
  // Anthropic — Claude
  'ClaudeBot', // index / training crawler
  'Claude-User', // fetches a page because a user asked Claude about it
  'Claude-SearchBot', // builds the search index behind Claude's answers
  'anthropic-ai', // legacy token, still honoured by some tooling

  // OpenAI — ChatGPT
  'GPTBot', // index / training crawler
  'OAI-SearchBot', // ChatGPT search index
  'ChatGPT-User', // user-initiated browsing from inside ChatGPT

  // Google — Gemini / AI Overviews. Google-Extended does not fetch anything;
  // it governs whether Googlebot's existing crawl may feed Gemini grounding
  // and AI Overviews. Allowing it is how a business opts into being cited.
  'Google-Extended',

  // Microsoft — Copilot
  'Bingbot',

  // Apple — Siri / Apple Intelligence. Applebot-Extended is the same kind of
  // permission-only token as Google-Extended.
  'Applebot',
  'Applebot-Extended',

  // Perplexity
  'PerplexityBot',
  'Perplexity-User',

  // Meta AI
  'meta-externalagent',

  // Amazon — Alexa / Rufus
  'Amazonbot',

  // Common Crawl. Not an assistant itself, but its archive is an input to
  // many models' training data, so it is the cheapest route into the answers
  // that are generated without a live fetch at all.
  'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED,
      },
      // Same permissions, stated explicitly. See AI_USER_AGENTS above for why
      // the redundancy is the point, and DISALLOWED for why the list is
      // repeated rather than inherited.
      {
        userAgent: AI_USER_AGENTS,
        allow: '/',
        disallow: DISALLOWED,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
