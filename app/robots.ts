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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          // Mid-booking pages. Thin, transactional, and often carrying a
          // booking id in the query string.
          '/book/payment',
          '/book/payment-complete',
          '/book/success',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
