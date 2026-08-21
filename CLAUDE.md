# Merritt Wellness — project notes for Claude

Next.js app (App Router, JS) for the Merritt Wellness venue: booking, Stripe
payments, Google Calendar, and transactional email via Resend.

Run tests with `npm test` (node --test, mocks external services — no network).

## ⚠️ EMAIL DELIVERY RULES — recurring incident, read before touching email code

Clients have repeatedly received only their first email while the rest of the
pipeline silently never sent. Root causes found so far, and the rules that
prevent them:

1. **Every API route that sends email MUST `export const maxDuration = 60;`**
   (or higher). Vercel's default function timeout (~10s) is shorter than the
   email pipeline (calendar insert + several sends spaced for Resend's rate
   limit). Without it, the platform kills the function mid-pipeline: the first
   email arrives, the trailing ones (onboarding, marketing) never send, and
   nothing errors. `tests/client-email-delivery.test.mjs` asserts this for the
   known routes — add a matching assertion when a new route starts sending.

2. **Resend free plan = 2 requests/second.** Consecutive sends must be spaced
   ≥500ms apart (current spacing: 600ms — `EMAIL_SEND_SPACING_MS` in
   `app/lib/email.js`, `EMAIL_RATE_LIMIT_DELAY_MS` in
   `app/lib/booking-fulfillment.js`). Do NOT enlarge these sleeps to "be safe":
   oversized delays burn the maxDuration budget and are exactly how rule 1's
   timeout was hit. 600ms + retry is the balance — keep it.

3. **Always send through `sendEmailWithRetry`** (app/lib/email.js). The Resend
   SDK does NOT throw on API errors — it resolves `{ data: null, error }` — so
   a raw `resend.emails.send()` call drops emails silently on a 429. The
   wrapper checks `result.error` and retries rate limits with backoff.

4. **Client-facing emails go BEFORE staff emails, always.** If a function is
   ever cut short again, the paying client must lose nothing. Order:
   confirmation → onboarding → public marketing → staff notification LAST.

5. **Staff receive ONLY their booking notification** (the "New Booking" /
   "New recurring booking" email). Never BCC/CC staff on client-facing emails.

6. **Every confirmed renter gets the onboarding email — including recurring.**
   One-time bookings: once per group (`sendOnboarding` flag in
   `sendBookingEmails`). Recurring: sent inside `sendRecurringSetupEmails`.

7. **Every send MUST carry a Resend Idempotency-Key** (the `idempotencyKey`
   option on `sendEmailWithRetry`). The "once per group" flags in the webhook
   loop are in-memory only — when the function dies mid-group and Stripe
   redelivers the webhook, the retry resets them and re-sends the onboarding
   email with the next booking in the group (a client once received it 4
   times this way). Keys make every duplicate path safe: per-booking emails
   key on `booking.id`; once-per-group emails (onboarding, public marketing)
   key on `master_booking_id` so ANY booking in the group re-attempting the
   send dedupes against the first. Resend stores keys for 24h and replays the
   original response. `tests/email-idempotency.test.mjs` locks this in.

8. **Delivered ≠ sent.** The pipeline once sent flawlessly and clients still
   didn't see the trailing emails: identical repeated content is a spam /
   Gmail-thread-collapse magnet. Two invariants keep the content deliverable:
   every send carries a plain-text part (auto-derived in `sendEmailWithRetry`
   via `htmlToPlainText` — don't strip it), and the client emails whose
   templates used to be identical for every booking (onboarding, marketing)
   embed the event name + date in subject and body so no two bookings produce
   byte-identical messages. `tests/client-email-delivery.test.mjs` locks both
   in.

9. **Every send outcome is recorded in the `email_events` table**
   (`app/lib/email-log.js`; migration
   `scripts/migrations/2026_add_email_events_table.sql`). Best-effort — a log
   failure never blocks a send — but do not remove the logging: it is the only
   durable evidence when a client reports a missing email. To diagnose one:
   `GET /api/admin/email-status?bookingId=<id>` (header `x-admin-secret:
   $ADMIN_API_SECRET`) lists every logged send for the booking AND asks Resend
   for each message's live delivery state. Read it as: no row → the pipeline
   died before that send; `failed` row → Resend rejected it (error included);
   `sent` + `delivered` → it reached the client's mailbox, so check spam /
   filters — not a code bug. `tests/email-observability.test.mjs` locks the
   logging in.

## Supabase keep-alive — do not remove

Supabase pauses Free-plan projects after ~7 consecutive days with no database
activity, and the venue regularly goes a week between bookings. A paused
project means the next renter's booking simply fails and they have to rebook.
Restoring is a manual dashboard action the app cannot trigger, so the fix is
prevention:

- `/api/cron/supabase-keepalive` runs **daily** (`0 14 * * *` in `vercel.json`)
  and issues one real query — `pingDatabase` in `app/lib/database.js`. Any
  genuine query resets Supabase's inactivity clock; daily leaves ~6 days of
  slack so a few failed runs can't cost us the project.
- The read is the authoritative liveness check. The `cron_runs` audit row it
  also writes is **best-effort** — a missing `cron_runs` table must never make
  a healthy database look down.
- If the ping fails, the route returns 500 (visible in Vercel's cron dashboard)
  and emails staff via `sendDatabaseUnreachableAlert`, deduped per UTC day.
  Silent failure is the whole thing being defended against.
- Do **not** replace this with a fake test booking. A throwaway booking row
  would touch Google Calendar, availability, admin views and the email
  pipeline, and any failure between create and delete leaves a phantom event on
  the live venue calendar. Supabase's timer only cares about database activity.
- Requires `CRON_SECRET` (already set for the monthly-billing cron).
  `tests/supabase-keepalive.test.mjs` locks all of the above in.

The real fix is a paid Supabase plan (paid projects are never auto-paused).
Keep this cron even then — it doubles as a daily database health check.

## Email architecture map

- `app/lib/email.js` — templates + individual send functions + retry wrapper.
- `app/lib/booking-fulfillment.js` — shared post-confirmation side effects
  (calendar event + email set). Used by BOTH the Stripe webhook (paid bookings)
  and `app/api/booking-request/route.js` (sponsored bookings, which never hit
  Stripe). Keep the two paths on this shared helper — do not fork the logic.
- Recurring bookings: emails fire from
  `app/api/payment/create-recurring-subscription/route.js`, with the Stripe
  webhook `setup_intent.succeeded` handler as an idempotent safety net.

## 🔒 Security rules — read before touching auth, payments, or templates

The app takes card payments and stores government-issued ID photos, so these
are invariants, not preferences. Each one exists because the opposite was
found in the code.

1. **Promo codes come from the environment. They are credentials, and this
   repository is PUBLIC.** The strings live in `PROMO_CODE_PARTNER` /
   `PROMO_CODE_COMP` / `PROMO_CODE_SPONSOR`, read by
   `app/lib/promo-codes.js`; only their *meaning* (discount, label, flags) is
   in source. `PROMO_CODE_COMP` comps a booking 100% — skips Stripe,
   self-confirms, books the live calendar — so whoever has it can rent the
   venue for free.

   Never put a code back in a source file. Not in `booking-pricing.js`, not in
   a comment, not in a test fixture, not in user-facing copy. The repo is
   public, so a committed code is published at github.com and stays published
   in git history after you delete it.

   It has leaked three ways, each fix missing the next:

     * v1 — hardcoded in `app/book/page.tsx`, so it also shipped in the JS
       bundle. Moved to a lib file.
     * v2 — still in the bundle: `app/page.tsx` (`'use client'`) →
       `app/lib/venue-rates.ts` → `booking-pricing.js`. A `.js` lib file ships
       to the browser whenever a client component imports it, at any depth,
       and tree-shaking does not save you — the derived
       `Object.entries(VALID_PROMO_CODES)` lists kept the dictionary alive.
     * v3 — the codes were in a public repo the whole time, which no bundling
       change addresses.

   Two rules follow. **Nothing reachable from a `use client` file may import
   `booking-pricing.js` or `promo-codes.js`** — public rate/fee numbers live
   in `app/lib/pricing-constants.js`, so import those from pages and from
   `venue-rates.ts`. And **unset variables fail closed**: that role gets no
   valid code, rather than everything validating.

   `tests/promo-code-privacy.test.mjs` pins all of it — no configured code in
   any source file, none reachable from a client component, fail-closed on
   unset, and the burned codes from v1/v2 permanently blocked. If you change
   that test, check it still FAILS when a code is pasted into a source file and
   when the codes are made to fail open; both earlier versions of this test
   passed on a vulnerable tree.

2. **Prices are always recomputed server-side.** `calculateAccuratePricing` /
   `computeRecurringIntakePricing` decide the amount; the client's `pricing`
   block is display-only and is never trusted. Stripe amounts come from the
   stored `total_amount`, never from the request.

3. **Supabase runs on the service-role key, with RLS deny-all.** Use the shared
   client in `app/lib/supabase-server.js` — do not call `createClient` anywhere
   else. The anon key is designed to be public; RLS
   (`scripts/migrations/2026_enable_rls_lockdown.sql`) is what protects the
   renter PII, and the service-role key is what lets the server bypass it.
   Rollout order matters: set `SUPABASE_SERVICE_ROLE_KEY` and deploy BEFORE
   running the migration.

4. **Escape every renter-supplied value in an email template.** Use `esc()`
   from `app/lib/email.js` on anything off the booking or inquiry form. These
   templates are string-interpolated HTML sent from our domain, so unescaped
   input turns a staff notification into a phishing channel.
   `tests/email-html-injection.test.mjs` covers this.

5. **Secrets are compared with `requireAdminAuth` / `requireCronAuth`**
   (`app/lib/auth.js`), never with `!==`. They are constant-time and fail
   closed when the env var is missing. `tests/admin-cron-auth.test.mjs`.

6. **Every anonymous route gets a rate limit.** Add `enforceRateLimit` from
   `app/lib/rate-limit.js` to any new public endpoint — especially ones that
   send email, store uploads, or call the Google Calendar API. Note the
   limiter is per-instance and best-effort (see the file's own caveats).

7. **No wildcard CORS.** Use `corsHeaders(request)` from `app/lib/http.js`,
   which reflects only our own origins.

8. **API responses are allowlists.** `/api/booking/[id]` returns only the
   fields the payment/success pages render. The booking id is the only
   credential this app has, so don't widen that response — and never return
   `id_photo_*` or `coi_document_*`.

9. **Don't return raw `error.message` to clients.** Log it; send a generic
   message. Database and Stripe errors leak schema and internals.

10. **CSP: don't add a nonce, and don't narrow the Stripe origins.** Pages are
    statically prerendered, so the HTML carries no nonce and a nonce (or
    `'strict-dynamic'`) would block every script on the site, checkout
    included. The origin list is Stripe's own — `*.js.stripe.com` carries the
    Payment Element and ACH frames, and `m.stripe.network` (Radar) fails
    silently when blocked. `calendar.google.com` / `www.google.com` in
    `frame-src` are the calendar and map embeds, which also fail quietly. See
    `app/lib/security-headers.js` before touching any of it.

11. **API responses are `no-store`.** They carry renter PII, so no shared cache
    or CDN may hold them. Set in `securityHeaders({ isApi: true })`.
