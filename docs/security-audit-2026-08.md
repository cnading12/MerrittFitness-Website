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

### 1b. Note: this project has no `inquiries` table

Discovered during rollout. `scripts/migrations/2026_add_inquiries_table.sql` has
never been run, so `/api/inquiry` has been falling back to email-only for every
marketing-form submission — by design (`storeInquiry` logs and continues so a
lead is never lost), but it means there is no durable record of inquiries.
Not a security issue, and unrelated to this audit, but worth knowing.

Both the RLS migration and its rollback skip tables that don't exist, so
neither is affected.

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

Upgraded `next` to 16.3.1, `uuid` to v14, `googleapis` 126 → 175, and ran
`npm audit fix`. Production advisories went from **12 (6 high, 6 moderate) to
zero**.

I initially left `googleapis` pinned, judging a 49-major-version jump on a
live booking calendar riskier than the one unreachable advisory it closed.
The parallel review took the upgrade, so I verified it rather than guessing:
the app's entire Google surface is `google.calendar('v3')`,
`new google.auth.GoogleAuth`, `events.list` and `events.insert`. Under v175 all
of those still exist, a real RSA-signed JWT auth client constructs, and an
`events.list` call gets as far as the network layer — i.e. the API shape is
intact. Taking the upgrade was the better call.

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

Two notes on the CSP.

**No nonce.** The strong form (per-request nonce + `strict-dynamic`) was
implemented, tested against a production build, and **reverted**. Pages here
are statically prerendered, so the cached HTML carries no nonce attributes —
verified: 15 script tags, zero nonces — and `strict-dynamic` makes browsers
ignore `'self'`, which blocked every script on the site including checkout.
The shipped policy uses `'unsafe-inline'` for scripts and keeps the directives
that still bind an injected script: `connect-src`, `form-action`, `base-uri`,
`object-src`, `frame-ancestors`.

**Origin list.** My first pass allowed only `js.stripe.com`, `hooks.stripe.com`
and `api.stripe.com`. Per Stripe's own CSP guidance that is too narrow:
`*.js.stripe.com` is required because Stripe.js starts Payment Element frames
on sharded origins (and the ACH Financial Connections flow, the default for
recurring bookings, runs in those frames); `m.stripe.network` carries Radar
fraud signals and fails *silently* when blocked; and `*.stripe.com` is needed
for the telemetry and error endpoints Stripe.js posts to. Those came from the
parallel review and are now in.

Verified in a real browser across four pages plus the payment page and the
full promo flow: zero violations, Stripe.js loads, the Google Calendar and
Maps embeds render. Caveat worth stating plainly: this environment has no
Stripe keys and no live booking, so the Payment Element never mounts — the
Stripe origins above rest on Stripe's documentation, not on my observation.

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
| `tests/security-headers.test.mjs` | CSP directives, Stripe/Google allowances, no nonce+unsafe-inline, API no-store, webhook bypass |
| `tests/security-invariants.test.mjs` | Structural guards: every anonymous route declares a rate limit (and the Stripe webhook does not), no wildcard CORS, no ad-hoc Supabase client, no `NEXT_PUBLIC_` service key, migration covers every table and can't abort |


---

## Reconciliation with the parallel review

A second review ran independently on `claude/website-security-audit-dhzu3x`.
The two overlapped heavily — both found the promo-code leak, the missing RLS,
the absent rate limiting, wildcard CORS, missing headers, and the timing-unsafe
secret comparison, and both reached the same conclusion that a CSP nonce is
incompatible with static prerendering here.

**Taken from that branch into this one:**

| Finding | Why it mattered |
| --- | --- |
| Stripe CSP origins (`*.js.stripe.com`, `m.stripe.network`, `*.stripe.com`) | My narrower list would have produced console violations on every payment and risked the Payment Element / ACH frames |
| `Cache-Control: no-store` + `noindex` on API responses | `/api/booking/[id]` returns renter PII; without it a shared cache or CDN may store one renter's booking and serve it to the next caller |
| `googleapis` 126 → 175 | Closes the last 4 advisories; verified safe against our API surface |
| Rightmost `x-forwarded-for`, prefer `x-real-ip` | Not exploitable on Vercel today (the platform overwrites the header rather than appending), but the leftmost entry is caller-forgeable anywhere that appends — this fails safer |
| Existence-guarded `REVOKE` in the migration | A real bug in my version: `REVOKE` has no `IF EXISTS`, so a missing `email_events`/`cron_runs` table would abort the script with RLS half applied |
| `ALTER DEFAULT PRIVILEGES`, rollback block, grant-verification query | Future tables locked by default; a documented way out if the migration is run before the env var is live |
| Structural regression tests | Catch a route added later that forgets a rate limit, or a module that builds its own Supabase client |

**Found only by comparing the two — a gap BOTH reviews had:**

The monthly-billing roll-up email (`sendMonthlyBillingRollupEmail`) rendered
`r.note` and `r.error` unescaped on both branches. Both look server-authored,
which is why both reviews skipped them — but `error` carries `err.message`
straight from Stripe and Postgres, and those messages quote the value that
caused the failure. A renter's event name reaches Stripe as an invoice-item
description, so it can come back inside an error string and land in a staff
inbox as live markup. Now escaped, with a regression test. Low severity (staff-
only email, indirect path) but it is the same class of bug as finding 5, and it
survived two independent passes because the fields don't *look* like user input.

**Kept from this branch (absent there):**

| Finding | Status on the other branch |
| --- | --- |
| Email HTML injection — inquiry detail rows | Their branch escapes the inquiry *message* but not `inquiryDetailRows`, so the inquirer's name/email/phone/event type still render as live markup in the staff notification. Verified by running this branch's injection test against theirs: it fails. |
| User-agent blocklist removed | Still present, still blocking visitors whose UA contains "hack" |
| `websiteUrl` scheme validation | Still accepts `javascript:` |
| `promo_code` removed from the booking API response | Still returned to anyone holding a booking id |

The calendar-title leak and the missing Google `frame-src` were both fixed on
that branch after the first comparison, so they are no longer differences.

**Also taken from that branch on the second pass:** baseline headers
(X-Frame-Options, Referrer-Policy, HSTS) declared in `next.config.js` as well
as middleware, so `/_next/static` and `/_next/image` carry them too. My first
version avoided this on the belief that declaring a header in both places
emits it twice. That was wrong — middleware uses `headers.set()`, which
replaces — and it was verified against a production build: exactly one of each
header on a page response, and the static assets are now covered.
