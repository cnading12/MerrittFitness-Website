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

## Security invariants — do not weaken

`tests/security-hardening.test.mjs` locks all of these in. Each one corresponds
to a real weakness found in the August 2026 audit.

1. **Promo codes are server-only.** `VALID_PROMO_CODES` lives in
   `app/lib/booking-pricing.js` and must never be copied into a client
   component. `app/book/page.tsx` used to carry its own copy, so the fully
   comped sponsorship code shipped in the public JS bundle — and a sponsored
   booking skips Stripe, auto-confirms, and lands on the live venue calendar.
   The client asks `POST /api/promo/validate`, which returns a submitted
   code's metadata but never lists codes and answers every miss identically.

2. **The server recomputes every price.** `calculateAccuratePricing` is the
   only pricing authority; the `pricing` object a client posts is advisory.
   Never trust a client-supplied total, discount, or fee.

3. **Every unauthenticated route calls `enforceRateLimit`**
   (`app/lib/rate-limit.js`). Add a limit when you add a route — the test
   enumerates them. The limiter is in-memory (per serverless instance), which
   stops scripted abuse but not a distributed attacker; if that changes, swap
   `hit()`'s body for a shared store, not the call sites.

4. **No wildcard CORS.** Use `corsHeaders`/`corsPreflight` from
   `app/lib/cors.js`. Five routes — including Stripe PaymentIntent creation —
   used to answer every origin with `*`.

5. **Secrets compare in constant time.** Use `requireAdminAuth` /
   `requireCronAuth` from `app/lib/admin-auth.js`. Never `provided !== expected`.

6. **Database access goes through `app/lib/supabase-server.js`**, which
   prefers `SUPABASE_SERVICE_ROLE_KEY`. Never construct a client with
   `SUPABASE_ANON_KEY` directly — anon keys are publicly shareable by design
   and safe only behind RLS. See
   `scripts/migrations/2026_enable_row_level_security.sql`, including its
   rollout order: **set the service-role env var BEFORE enabling RLS**, or
   every booking fails.

7. **Error responses stay generic on unauthenticated routes.** Log
   `error.message`; return a fixed string plus a `code`. Raw messages carry
   Postgres column/constraint text and Stripe internals.

8. **`GET /api/booking/[id]` is unauthenticated** — the UUID is the only
   credential. Its response is an explicit allowlist. Do not add phone, home
   address, ID photo, COI, or Stripe/Calendar object ids to it.

9. **The Stripe webhook bypass must stay first in `middleware.js`.** Stripe
   signs the raw body; anything touching that path breaks verification and
   silently drops payment confirmations.

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
