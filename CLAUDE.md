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

## Email architecture map

- `app/lib/email.js` — templates + individual send functions + retry wrapper.
- `app/lib/booking-fulfillment.js` — shared post-confirmation side effects
  (calendar event + email set). Used by BOTH the Stripe webhook (paid bookings)
  and `app/api/booking-request/route.js` (sponsored bookings, which never hit
  Stripe). Keep the two paths on this shared helper — do not fork the logic.
- Recurring bookings: emails fire from
  `app/api/payment/create-recurring-subscription/route.js`, with the Stripe
  webhook `setup_intent.succeeded` handler as an idempotent safety net.
