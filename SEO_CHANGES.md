# SEO — Merritt Wellness

Canonical host: `https://www.merrittwellness.net` (**with** www — see below).
Stack: Next.js 16 (App Router), React 19, Tailwind 3.

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
- **Neighborhood spelling is "Sloans Lake"** everywhere on the site. Note the
  Business Profile description writes it "Sloan's Lake"; the neighborhood is
  not part of the NAP so this is cosmetic, but pick one and keep it. Don't
  mix both within the site.
- Age figures are computed from 1905, never typed. `/about`'s Twitter card
  used to hardcode "119 years".

---

## Google Business Profile — reviewed August 2026

Reviewed against screenshots of the live profile. Recording it here because
the site's NAP, hours, and `aggregateRating` are all supposed to mirror it.

**What the profile says (verified):**

| Field | Value |
|---|---|
| Name | Merritt Wellness |
| Primary category | Yoga studio (a change to **Event venue** is pending) |
| Phone | (720) 357-9499 |
| Website | `https://www.merrittwellness.net/` |
| Hours | Mon–Sat 7 AM–10 PM, Sun 4:30 PM–10 PM |
| Social | facebook.com/MerrittWellnessDenver, instagram.com/merrittwellnessdenver |
| Rating | 5.0 from 20 reviews |

The name, phone, social links, and rating all match `app/data/site.ts`. The
description is accurate and well-written. Two things did not match, and both
have been fixed in code:

1. **Hours.** The site advertised a blanket "6 AM to 10 PM, seven days a
   week". The profile says Mon–Sat from 7 AM and **Sunday from 4:30 PM** —
   and the profile is right, because `sundaySchedule` in `app/data/site.ts`
   states the sanctuary is held by congregations until 4:30 PM every Sunday.
   The site was contradicting both the profile and its own data. `hours` is
   now per-day and the JSON-LD emits two `OpeningHoursSpecification` entries.
2. **Host.** Resolved — see the section below. The profile is right and the
   codebase was wrong.

---

## Canonical host: www, not the apex

Measured, not assumed:

```
$ curl -sSIL https://merrittwellness.net
HTTP/2 307
location: https://www.merrittwellness.net/
HTTP/2 200
```

**The apex redirects to www.** www is the host that actually serves the site,
it is what the Business Profile links to, and it is what Google has indexed.

The codebase declared the opposite. `metadataBase`, every `alternates.canonical`,
every sitemap URL, every OG `url`, and every schema `@id` used the bare apex —
so **every canonical tag on the site pointed at a URL that 307-redirected to a
different host.** That is the likely reason Google indexed www pages while the
markup claimed the apex. All 49 of those references now use www, and
`tests/seo-invariants.test.mjs` fails on any scheme-qualified apex URL that
reappears in code.

> **Never add a www → apex redirect in `middleware.js`.** An earlier revision of
> this branch did exactly that, on the mistaken belief that www was the dead
> host. Combined with the platform's existing apex → www redirect it would have
> bounced every request between the two hosts forever and taken the site down.
> It was caught before shipping, and `middleware.js` carries a comment saying
> so. To move the canonical to the apex later, change the platform redirect
> **first**, then `BASE_URL` in `lib/site-schema.ts`, then the test guard —
> together, in that order.

### The two 307s

Both redirects in play are `307 Temporary`, and both would be better as `301`
(or `308`) permanent:

| Redirect | Status | Impact |
|---|---|---|
| `merrittfitness.net` → `www.merrittwellness.net` | 307 | **Matters most.** Cross-domain: a temporary redirect does not pass the old brand domain's accumulated authority to the new one. |
| `merrittwellness.net` → `www.merrittwellness.net` | 307 | Lower stakes now. Same-site host canonicalisation, and the canonical tags agree with the redirect target, which does most of the work. |

Neither is fixable in this repo — they are platform/registrar settings. The
permanent/temporary toggle lives in the Vercel domain settings for whichever
project owns each domain, or in the registrar's domain-forwarding panel if the
forwarding happens there. Worth chasing for `merrittfitness.net`; optional for
the apex.

---

## Not done — needs a human

Ordered by impact.

1. **Resolve the stuck category edit and the profile's verification state.**
   The switch to *Event venue* as primary has been pending for about a month;
   normal is minutes to a few days. Changing a primary category is one of the
   edits Google most often gates behind re-verification, so the pending edit
   and the unverified appearance are probably the same problem. Look for a
   "Get verified" prompt on the profile and complete it (video verification is
   the usual route now, ~5 business days). Do not stack further edits while
   one is pending — new edits can restart the review. If no verification
   prompt appears, a month is far outside normal and warrants a support
   ticket. **Nothing else on this list matters as much: while the primary
   category is still "Yoga studio", the profile is competing for yoga queries
   instead of event-venue ones.**

2. **Make the `merrittfitness.net` redirect permanent.** It currently answers
   `307 Temporary`, so none of the old brand domain's authority transfers. Find
   the permanent/301 toggle in whichever system forwards it — Vercel domain
   settings, or the registrar's forwarding panel — and switch it. Keep the
   domain registered and the redirect in place indefinitely. The apex → www
   307 is the same class of issue but much lower stakes; fix it if the toggle
   is easy to find, otherwise leave it.

3. **Nothing to verify on the old domain — measured.** `merrittfitness.net`
   and `www.merrittfitness.net` both forward to `www.merrittwellness.net` and
   the destination answers 200. Only the 307-vs-301 status needs attention
   (item 2). Google still has the old site indexed under its own title, so it
   has not recrawled since the change; that resolves on its own.

4. **Clean up the legacy "Merritt Fitness" citations.** The Yelp listing is
   still named *MERRITT FITNESS* and categorised as *Yoga* — claim it, rename
   it, and recategorise to an event venue. The Nextdoor page's display name is
   already updated. These are the last places the old brand is still live.

5. **Reconcile the third-party venue listings.** There are three separate
   Peerspace listings for one room (Production / Off-Site / Event) plus a
   LiquidSpace listing filed under Merritt Workspace. They also state a
   capacity of 100 against the site's 125. Pick one capacity, make it true
   everywhere, and consolidate the listings if Peerspace allows it.

6. **Consider adding categories once the pending edit lands.** The queued set
   (Event venue, Yoga studio, Banquet hall, Wedding venue, Community center,
   Live music venue, Meditation center) is good and covers the revenue lines.
   *Dance school* is the notable omission given the weekly salsa, bachata, and
   tango inventory. Add it only after the current edit clears.

7. **Prices for externally ticketed events.** Filling `price` on the remaining
   Eventbrite-style events would let each show a price in Google's event
   results. They are correct as-is; this is upside, not a defect.

8. **Dedicated pages for celebrations of life, parties, and corporate** are
   still pending photography (see the placeholders in `app/data/site.ts` and
   `app/sitemap.ts`). These are real search categories currently covered only
   as prose blocks on `/private-events`.

9. **Minor: neighborhood spelling.** The site uses "Sloans Lake"; the profile
   description uses "Sloan's Lake". Neither is part of the NAP so this is
   cosmetic, but matching them is slightly better for entity consistency.
