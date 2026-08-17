# SEO — Merritt Wellness

Canonical domain: `https://merrittwellness.net`. Stack: Next.js 16 (App Router),
React 19, Tailwind 3.

This file records the current SEO architecture and the reasoning behind the
parts that are easy to break. `tests/seo-invariants.test.mjs` locks the ones
that have already regressed once.

---

## Where things live

| Concern | File |
|---|---|
| Business + website JSON-LD graph | `lib/site-schema.ts` |
| Per-page EventVenue + FAQPage JSON-LD | `lib/venue-schema.ts` |
| Breadcrumb + priced Service per page | `components/venue/PageSchema.tsx` |
| Event JSON-LD | `app/calendar/layout.tsx` |
| Business facts (NAP, hours, reviews, area served) | `app/data/site.ts` |
| Prices (single source, derived from the booking engine) | `app/lib/venue-rates.ts` |
| Sitemap | `app/sitemap.ts` |
| robots.txt | `app/robots.ts` |

**Rule: never type a dollar figure into a page or a schema block.** Rates come
from `app/lib/venue-rates.ts`, which derives them from the same constants
`app/lib/booking-pricing.js` charges with. A hardcoded price silently drifts
from what the checkout actually bills.

---

## The structured-data graph

One `LocalBusiness`/`EventVenue`/`HealthAndBeautyBusiness` node under
`@id: https://merrittwellness.net/#business`, plus one `WebSite` node, built in
`lib/site-schema.ts` and rendered **once** from `app/layout.tsx`.

Every other node references the business by `@id` rather than redeclaring it:
the per-page `EventVenue` blocks via `containedInPlace`, each `Event`'s
`location`, each `Service`'s `provider`, and `/contact`'s `ContactPage.about`.

> **Do not add a second LocalBusiness block anywhere.** `app/layout.tsx` and
> `app/page.tsx` each used to emit one under the same `@id`, disagreeing on
> `priceRange` (`"$$"` vs `"$95/hour"`, the latter not a valid priceRange at
> all), on whether coordinates were strings or numbers, and nesting
> `areaServed` inside `PostalAddress` where schema.org does not define it. When
> two conflicting nodes share an `@id`, which values survive the merge is not
> predictable. A test enforces that only `lib/site-schema.ts` builds it.

Per-page coverage: every route carries the site graph; the nine event-type and
partnership pages add `BreadcrumbList` + priced `Service` + `EventVenue`;
weddings, concerts, art shows, class partnerships, and recurring add `FAQPage`;
`/calendar` adds one `Event` per upcoming event; `/contact` adds `ContactPage`.

### FAQ markup must be visible

Google requires FAQ markup to describe content a visitor can actually see. The
homepage used to emit a `FAQPage` block with **no FAQ rendered anywhere** — and
its answers described a yoga-only studio at a flat "$95/hour". Every page now
feeds one `faqs` array into both `faqJsonLd()` and a rendered `<FaqSection>`,
so the two cannot drift.

### Reviews

`aggregateRating` reads `reviews` in `app/data/site.ts` — currently **5.0
across 20 Google reviews**, verified with the owner in August 2026 — and is
rendered visibly on the homepage with a link out to the Google Business
Profile. A fabricated 5.0/47 block had to be stripped from this codebase once
already; an invented count is grounds for a structured-data manual penalty.
**Only ever set these from the live Business Profile.**

---

## Events and pricing

`Event` (`app/data/events.ts`) carries structured `price` and `free` fields.
Before, prices existed only as prose inside `description` ("$35 per person",
"$25 registration"), which broke two things:

1. `offers` shipped with no `price`/`priceCurrency`, both of which Google's
   Event spec requires whenever offers are present.
2. The calendar card decided "is this free?" by asking whether a `ticketUrl`
   existed. Classes collecting over Venmo instead of a ticketing platform —
   Terri Stafford's $35 yoga, two $15 suggested-donation classes — rendered a
   green **"Free Event"** badge and told Google `isAccessibleForFree: true`.

The rules now:

- `free: true` means genuinely free. It drives the badge and
  `isAccessibleForFree`. **Never set it to paper over a missing price.**
- `price: { from, to?, unit?, note? }` is what attending costs. Fill it in
  whenever the figure is known and stable — that is what puts a price in
  Google's event results.
- Neither field set means "price not published" (fine for externally ticketed
  events whose price lives on the ticket page). It does **not** mean free, and
  nothing renders a claim either way.

Events also emit `url` (`/calendar#<event-id>`, matching the anchor `id` on
each card, so the 39 events are no longer indistinguishable at one bare URL)
and, for recurring series, a machine-readable `eventSchedule` parsed from the
`recurrence` prose. The parser returns `null` on any phrasing it cannot read
confidently — a wrong schedule is worse than none.

---

## Indexing

`middleware.js` used to set `X-Robots-Tag: index, follow` on **every** response,
including `/book/payment` and `/book/success`, which `robots.txt` disallows. An
HTTP header beats robots.txt for any crawler that reaches the URL another way,
so the header was actively inviting thin transactional pages into the index.
The absence of the header already means "index, follow", so only the negative
directive is worth sending. Middleware now sends `noindex, nofollow` for
`/api/`, `/book/payment`, and `/book/success` and nothing otherwise; those
routes also declare `robots: { index: false }` in their own layouts.

`app/robots.ts` replaced the static `public/robots.txt`, which carried a
`Crawl-delay: 1` that Google ignores and Bing honours (slowing itself for no
reason) plus per-bot `Allow: /` blocks that did nothing.

---

## Fonts

Self-hosted via `next/font/google` (Cormorant Garamond + Jost, same weights as
before), exposed as `--font-serif` / `--font-sans` and consumed by
`app/globals.css`. This replaced a render-blocking `<link>` to
fonts.googleapis.com — two third-party round trips on the critical path, an
LCP cost on a metric that is now a ranking factor. The CSS keeps the original
fallback stacks, so a font failure degrades exactly as it used to.

---

## Content and routing notes

- **`/contact` is a real page again** (it used to 301 to `/book`).
  "<business> contact" and "phone number" are high-intent navigational queries
  a booking wizard cannot answer, and a canonical NAP page is the standard
  on-site support for a Business Profile. Per the owner's request it is linked
  from the **footer only** — the navbar is deliberately unchanged. Do not
  reinstate the redirect in `next.config.js`; it would shadow the page.
- **`/calendar` carries real copy.** It previously said only "transformative
  experiences in our historic sanctuary", naming none of the things people
  search for, so the only indexable text on the venue's highest-intent public
  page was the event cards. It now states the actual programme — sound baths,
  breathwork, yin and vinyasa yoga, salsa and bachata, songwriters' rounds —
  and links through to the partnership pages.
- **`/book` metadata** no longer describes a yoga studio at a flat "$95/hour".
  It covers the venue's full range and quotes the real published band.
- **Neighborhood spelling is "Sloans Lake"** everywhere, matching the Business
  Profile. Don't mix in "Sloan's Lake".
- Age figures are computed from 1905, never typed. `/about`'s Twitter card
  used to hardcode "119 years".

---

## Not done — needs a human

1. **Google Business Profile is the biggest remaining lever.** Local-pack
   ranking for "event venue near me" is driven mostly by the Business Profile,
   not the website: categories, photos, service list, Q&A, posts, and review
   velocity. The site now supports it correctly; the profile itself is
   off-codebase work.
2. **Swap in the real Business Profile review link.** `reviews.url` in
   `app/data/site.ts` currently uses a maps-search URL that resolves to the
   right place. A short review link (or place ID) is better.
3. **Two phone numbers on the site** — `(720) 357-9499` for new inquiries,
   `(303) 359-8337` for client services — is correct for operations but is a
   NAP-consistency risk. Make sure the Business Profile lists the 720 number as
   primary and, if it accepts one, the 303 number as secondary.
4. **Prices for externally ticketed events.** Filling `price` on the remaining
   Eventbrite-style events would let each show a price in Google's event
   results. They are correct as-is; this is upside, not a defect.
5. **Dedicated pages for celebrations of life, parties, and corporate** are
   still pending photography (see the placeholders in `app/data/site.ts` and
   `app/sitemap.ts`). These are real search categories currently covered only
   as prose blocks on `/private-events`.
