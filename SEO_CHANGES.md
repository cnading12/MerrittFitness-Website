# SEO Changes — Merritt Wellness

All changes below are **non-visual**. No Tailwind class, layout, spacing, color, font, or
component structure was altered. The only DOM change is three heading tag swaps on the contact
page (`<h3>`→`<h2>`) carrying **byte-identical classes**, so rendered output is unchanged.

Stack: Next.js 16 (App Router), React 19, Tailwind 3. Canonical domain: `https://merrittwellness.net`.

## What changed

### 1. Fixed broken favicon references — `app/layout.tsx`
The metadata declared `/favicon-32x32.png` and `/favicon-16x16.png`, **neither of which exists**
in `public/` (two 404s on every page). Repointed `icons.icon` to files that actually exist:
`favicon.ico`, `favicon.svg`, `favicon-96x96.png` (apple-touch-icon unchanged).

### 2. Added `metadataBase` — `app/layout.tsx`
Set `metadataBase: new URL('https://merrittwellness.net')` so relative metadata/OG URLs resolve
correctly and Next.js stops warning at build.

### 3. Dynamic sitemap — `app/sitemap.ts` (new), `public/sitemap.xml` (removed)
The old static `sitemap.xml` was **missing `/events`** and had a hard-coded, stale `lastmod`.
Replaced with `app/sitemap.ts`, which emits all five public routes (`/`, `/booking`, `/events`,
`/about`, `/contact`) with a self-updating `lastmod`. Verified `/sitemap.xml` is generated at
build and now includes `/events`. (Removed the static file so it doesn't shadow the generated route.)

### 4. Event structured data — `app/events/layout.tsx`
Added `Event` JSON-LD (schema.org) generated from `app/data/events.ts`, emitted server-side from
the route layout (the page itself is a client component). For each **upcoming** event it outputs:
`name`, `description`, `startDate`/`endDate` in ISO 8601 with the correct **America/Denver** UTC
offset (DST-aware), `location` (venue NAP), `organizer`, `image` (absolute URL), `eventStatus`,
`eventAttendanceMode`, `performer` (when a practitioner is named), and `offers` (when a ticket URL
exists) or `isAccessibleForFree`. Build renders 13 valid Event blocks. Past one-off events are
filtered out; recurring series are always included.

### 5. Reconciled LocalBusiness graph + event/wedding positioning — `app/layout.tsx`, `app/page.tsx`
- Both the root (`layout.tsx`) and home (`page.tsx`) JSON-LD blocks now share one stable
  `@id` (`https://merrittwellness.net/#business`) so crawlers merge them into a single business
  node instead of treating them as two competing entities.
- Aligned `@type` on both to `["LocalBusiness", "EventVenue", "HealthAndBeautyBusiness"]`
  (most-specific applicable types), matching the business's event/wedding/wellness nature.
- Added a **Wedding Venue** offer to the home page `makesOffer` list.
- Updated the root title/description/keywords to cover the brief's primary keywords
  (event venue Sloan's Lake, Denver wedding venue, historic church wedding venue, sound bath /
  sound immersion) — metadata only, no on-page copy changed.

### 6. Heading hierarchy fix — `app/contact/page.tsx`
The contact page skipped from `<h1>` straight to `<h3>` (no `<h2>`). Swapped the three section
headings ("Reach Out", "Visit Our Sanctuary", "Stay Connected") from `<h3>` to `<h2>`,
**keeping the exact same className** on each. Pure semantic fix; appearance unchanged.

### 7. Corrected phone number — site-wide
Updated the business phone from the old `303-359-8337` to **`720-357-9499`** everywhere it appeared
(~30 spots): visible UI (header/footer, contact, booking, success/payment-complete pages), email
templates (`app/lib/email.js`), per-route meta descriptions, and JSON-LD `telephone` fields — across
display (`(720) 357-9499`), `tel:` links, and E.164 (`+1-720-357-9499`) formats.

### 8. Removed fabricated review data — `app/layout.tsx`, `app/page.tsx`
The structured data claimed `aggregateRating` of **5.0 with reviewCount "47"** plus a fake single
review authored by "Denver Wellness Community". The business has a genuine 5.0 rating but **not** 47
reviews, and Google requires aggregate ratings to reflect real, verifiable, on-page reviews — an
invented count risks a structured-data manual penalty. Removed both the `aggregateRating` and the
fabricated `review` from the home and root JSON-LD. Can be re-added cleanly once a real, verifiable
count is available (ideally synced from the Google Business Profile).

### 9. Manifest theme color consistency — `public/site.webmanifest`
`theme_color` was `#10b981` (emerald green) while the app's `viewport.themeColor` is `#735e59`
(brand taupe). Set the manifest to `#735e59` so they match. Affects the browser/OS chrome tint
only, not page content.

## Verification
- `npm run build` succeeds. (API routes require Supabase/Resend/Stripe env vars to collect data;
  with those provided the full build completes and all 17 routes generate, including the new
  `/sitemap.xml` and `/events` with Event JSON-LD.)
- DOM/class diff confirms the only structural change is the contact `h3`→`h2` swaps with identical
  classes; every other change is in `<head>` metadata, JSON-LD, the manifest, or the sitemap.

## Already in good shape (left as-is)
- Per-route `title`/`description`/OpenGraph/Twitter/`canonical` metadata exists on all routes.
- Decorative images correctly use `alt=""` (watercolor/stained-glass/blur overlays); meaningful
  images use `next/image` with width/height or `fill`, lazy loading, and blur placeholders.
- `<html lang="en">`, FAQ JSON-LD, robots.txt (API + payment/success paths disallowed).
- The one raw `<img>` (booking ID-upload preview) is a user blob in a form, not indexable content —
  intentionally left as a plain `<img>`.

## Follow-ups needing a human / visual decision
1. **Fonts** are loaded via a Google Fonts `<link>` (render-blocking), not `next/font`. Migrating to
   `next/font/google` would improve Core Web Vitals but can subtly change font-swap timing/rendering,
   which conflicts with the byte-for-byte visual constraint. Left untouched — needs a visual sign-off
   to attempt and diff.
2. **Wedding / event-venue content.** The brief lists wedding/event-venue terms as primary keywords,
   but on-page copy is almost entirely yoga/sound-bath/meditation. Metadata + schema now cover these
   terms, but ranking for them needs real on-page content (a weddings/events section or page) — a
   content + visual decision, not done here.
3. **NAP confirmation.** Phone confirmed as **(720) 357-9499**. Address still uses
   **2246 Irving St, Denver, CO 80211** from the codebase — confirm it's correct.
4. **`sameAs` + reviews.** Confirm the Instagram/Facebook URLs are live. Aggregate rating was removed
   (fabricated count); to re-add stars in search results, provide a real verifiable review count, or
   connect the Google Business Profile so the rating shows there.
