# Security audit — August 2026

Full review of the Merritt Wellness booking app: payments, data handling,
authentication, API surface, dependencies, and client bundle.

Everything below marked **Fixed** is done and covered by tests. The
**Action required** section at the end lists the two things that need a human
in the Supabase and Vercel dashboards — the code is already in place for both.

---

## Action required (do these in order)

Nothing here is optional; the RLS fix is only half-deployed until step 2.

### 1. Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel

1. Supabase → Project Settings → API → copy the **service_role** key.
2. Vercel → Project → Settings → Environment Variables → add
   `SUPABASE_SERVICE_ROLE_KEY` for Production, Preview and Development.
3. Redeploy, and confirm a booking still works.

The app falls back to the anon key until this is set, so nothing breaks in the
meantime — but step 2 must not happen before this.

### 2. Run the RLS migration

In the Supabase SQL editor, run
`scripts/migrations/2026_enable_rls_lockdown.sql`.

Verify:

```sql
select relname, relrowsecurity from pg_class
where relname in ('bookings','inquiries','email_events','cron_runs');
-- relrowsecurity must be `t` for every row
```

Then book a test reservation end-to-end to confirm the app still reads and
writes normally.

### 3. Consider rotating credentials

The Supabase anon key has been the app's only database credential. It was
never committed to this repo (history was scanned), but once RLS is on it is
inert anyway, so rotating it is cheap insurance. Same reasoning applies to
`ADMIN_API_SECRET` if it has ever been shared.

---

## Findings

### Critical

**1. A 100%-off promo code shipped in the public JavaScript bundle** — *Fixed*

`COLESTEST` comps a booking entirely: no Stripe, no card, confirmed on the
spot, and written straight to the live Google Calendar. It — along with the
20% partner code — was hardcoded in `app/book/page.tsx`, a client component,
so it was readable in devtools by any visitor. Anyone could have booked the
venue for free.

Codes now live only in `app/lib/booking-pricing.js` and are checked through
`POST /api/validate-promo`, which returns metadata for the one submitted code
and is rate limited so it can't be used to guess. A test scans every
client-side source file and fails if a code reappears.

**2. Renter PII stored without Row Level Security** — *Fixed in code; needs the
migration run*

The `bookings` table holds government ID photos, certificates of insurance,
home addresses and phone numbers, and no migration enabled RLS. The app
authenticated with the Supabase **anon** key — a credential designed to be
public, whose only protection is RLS. Anyone holding it could have read every
renter's ID photo, or rewritten `total_amount` and `status`.

Added `scripts/migrations/2026_enable_rls_lockdown.sql` (RLS on, deny-all, no
policies) and moved every query onto a single service-role client
(`app/lib/supabase-server.js`), replacing ten separate `createClient` calls.

### High

**3. No rate limiting on any endpoint** — *Fixed*

`/api/booking-request` accepted megabytes of base64 uploads per anonymous call
and wrote them to the database; `/api/inquiry` sent two Resend emails per call;
the calendar routes drew on a finite Google API quota. Added
`app/lib/rate-limit.js` and applied per-route limits across every public
endpoint, including the admin and cron secrets (guess-rate capping).

The limiter is in-memory and therefore per-instance and best-effort — this is
documented in the file. It stops scripted abuse from one host; it is not a
distributed-flood defense. Upstash Redis or a Vercel WAF rule would be the
upgrade.

**4. Outdated dependencies with published advisories** — *Fixed*

`next@16.0.10` carried a long list (middleware/proxy bypass, cache poisoning,
CSP-nonce XSS, several DoS); `jws` had a high-severity HMAC
signature-verification flaw reachable through Google Calendar auth.

Upgraded to `next@16.3.1`, ran `npm audit fix`, and bumped `uuid` to v14.
Production advisories went from **12 (6 high, 6 moderate) to 4 moderate**, all
of which are the same transitive `uuid` bounds-check issue via `googleapis`.
That one is **not reachable**: it requires calling uuid v3/v5/v6 with a `buf`
argument, and both `gaxios` and `googleapis-common` only call `uuid.v4()` with
no arguments. Closing it would mean jumping `googleapis` 126 → 175 on a live
booking calendar, which is a worse trade than the finding.

### Medium

**5. HTML injection into outbound email** — *Fixed*

Every renter-supplied field was interpolated raw into email HTML. A renter
could close the surrounding tag and write their own markup into the staff
notification or their own confirmation — messages sent from our domain and our
address. Not XSS (mail clients don't run scripts), but a working spoofing and
phishing primitive.

Added `esc()` and applied it to all ~50 renter-controlled interpolations. A
test submits a tag-breakout payload through three templates and asserts it
comes out inert. Attachment filenames (also renter-chosen) are now stripped of
path separators and control characters.

**6. Private event titles leaked to anonymous callers** — *Fixed*

`/api/recurring-conflicts` returned the Google Calendar `summary` of any
conflicting event — i.e. `🔒 BOOKED: <event name>`. Submitting a wide date
range would have harvested the event names of every private booking. It now
returns a generic "another reservation"; the times, which is all the renter
needs, are unchanged.

**7. Wildcard CORS on payment and booking endpoints** — *Fixed*

`Access-Control-Allow-Origin: *` on the booking, payment and inquiry routes let
any site on the internet read those responses, including Stripe client secrets.
Replaced with `app/lib/http.js`, which reflects only our own origins.

**8. Missing security headers** — *Fixed*

No CSP, no HSTS, no Permissions-Policy, and `X-XSS-Protection: 1; mode=block`
(the legacy auditor, which browsers removed because it could be induced to
*create* vulnerabilities). Added a CSP plus HSTS and Permissions-Policy in
`app/lib/security-headers.js`, and set `X-XSS-Protection: 0`.

A note on the CSP: the strong form (per-request nonce + `strict-dynamic`) was
implemented, tested against a production build, and **reverted**. Pages here
are statically prerendered, so the cached HTML carries no nonce attributes —
verified: 15 script tags, zero nonces — and `strict-dynamic` makes browsers
ignore `'self'`, which blocked every script on the site including checkout.
The shipped policy uses `'unsafe-inline'` for scripts and keeps the directives
that still bind an injected script: `connect-src`, `form-action`, `base-uri`,
`object-src`, `frame-ancestors`. Verified in a real browser across four pages
plus the payment page: zero violations, Stripe.js loads.

**9. Timing-unsafe secret comparison** — *Fixed*

`/api/admin/*` and `/api/cron/*` compared their shared secrets with `!==`,
which returns at the first differing byte. Replaced with constant-time,
length-independent comparison in `app/lib/auth.js` (hash both sides, then
`timingSafeEqual` — the naive form throws on length mismatch, which is itself
a length oracle). Both still fail closed when the env var is absent.

**10. Over-broad booking API response** — *Fixed*

`/api/booking/[id]` returned the full record — phone, business name, website,
Stripe customer/subscription/payment-intent ids, promo code — to anyone with
the booking UUID. Reduced to an allowlist of the fields the payment and
success pages actually render, verified against every consumer.

**11. Internal error messages returned to clients** — *Fixed*

Several routes returned `error.message` in 500 responses, leaking Postgres
column names, constraint text and Stripe internals. Now logged, not shipped.

**12. Unvalidated renter website URL** — *Fixed*

`websiteUrl` accepted any string, including `javascript:`. Now constrained to
http(s) at intake, with bare domains normalized.

### Low / informational

**13. User-agent blocklist removed** — *Fixed*

The middleware 403'd any request whose UA contained `sqlmap`, `nikto`,
`scanner` or `hack`. It stopped no real scanner (a UA is a command-line flag)
while blocking legitimate visitors whose UA contained "hack" as a substring.
Removed, with a note explaining why it shouldn't come back.

**14. Builds ignore TypeScript and ESLint errors** — *Not changed*

`next.config.js` sets `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`.
`app/book/page.tsx` alone has dozens of pre-existing type errors, so turning
these on is a real project rather than a security fix. Worth doing — type
errors in payment code are exactly where bugs hide — but it was out of scope
here and would have been an unsafe drive-by change.

---

## Reviewed and found sound

Not everything needed fixing. These were checked and are correct as written:

- **Stripe webhook signature verification** — `constructEvent` over the raw
  body, no bypass, correct rejection on missing/invalid signature.
- **Payment amounts** — always read from the stored booking, never from the
  request. The client `pricing` block is display-only, and the recurring path
  logs and overrides any drift.
- **`finalizeRecurringSetup`** — verifies SetupIntent status and cross-checks
  its `metadata.bookingId` against the booking, so another booking's
  SetupIntent can't be replayed.
- **SQL injection** — no raw SQL anywhere; all access is through the Supabase
  client. The one PostgREST `or()` filter that interpolates an id
  (`/api/admin/email-status`) already validates it against a strict charset.
- **Git history** — scanned all 151 commits for committed credentials; none
  found, and `.env*` has always been ignored.
- **XSS in React** — every `dangerouslySetInnerHTML` renders static JSON-LD
  built from constants, never user input.
- **Booking id as a capability** — v4 UUIDs (122 bits) are unguessable; now
  additionally rate limited.

---

## Test coverage added

312 tests pass (up from 277). New files:

| File | Covers |
| --- | --- |
| `tests/promo-code-privacy.test.mjs` | Codes absent from client source; endpoint leaks no other code; guessing is capped; prototype-chain probes rejected |
| `tests/email-html-injection.test.mjs` | Tag-breakout payload neutralized in confirmation, staff and inquiry emails |
| `tests/rate-limit.test.mjs` | Limits, per-IP and per-bucket isolation, window expiry, no limit disclosed in the 429 |
| `tests/admin-cron-auth.test.mjs` | Fail-closed on unset secret, length-mismatch safety, Bearer form required |
| `tests/security-headers.test.mjs` | CSP directives, Stripe/Google allowances, no nonce+unsafe-inline, webhook bypass |
