-- Enable Row Level Security and lock every table down to the service role.
--
-- WHY
-- ---
-- A Supabase project exposes two keys. The **anon** key is designed to be
-- public — in a normal Supabase app it is shipped to browsers, and it is
-- routinely visible in bundles, screenshots, support tickets and old commits.
-- The only thing that makes it safe is Row Level Security: with RLS enabled
-- and no policy granting access, the anon key can read and write nothing.
--
-- Until this migration runs, these tables have RLS OFF, which means anyone
-- holding the anon key can SELECT every row of `bookings` — including the
-- government-issued ID photos, certificates of insurance, home addresses and
-- phone numbers stored there — and can UPDATE `total_amount` or flip `status`
-- to 'confirmed' without paying.
--
-- The **service_role** key bypasses RLS entirely. Every query in this app runs
-- server-side (API routes and cron handlers only — no browser ever talks to
-- Supabase directly), so the app is unaffected by a deny-all policy as long as
-- it authenticates with the service-role key.
--
-- ORDER OF OPERATIONS — do not skip
-- ---------------------------------
--   1. Copy the service_role key from Supabase → Project Settings → API.
--   2. Add it to Vercel as `SUPABASE_SERVICE_ROLE_KEY` (all environments).
--      It is a SECRET: never prefix it with NEXT_PUBLIC_, never commit it.
--   3. Redeploy and confirm the app still books/reads normally.
--   4. Only then run this file in the Supabase SQL editor.
--
-- Running this BEFORE step 2 will break booking, inquiries and the cron jobs,
-- because the anon key will no longer be able to touch these tables.
--
-- AFTER: rotate the anon key if you believe it was ever exposed. With RLS on
-- and no policies, a leaked anon key is inert — but rotating costs nothing.
--
-- Verify afterwards with:
--   select relname, relrowsecurity from pg_class
--   where relname in ('bookings','inquiries','email_events','cron_runs');
--   -- relrowsecurity must be `t` for every row present.

-- `bookings` — renter PII, ID photos, COIs, payment amounts and status.
alter table if exists public.bookings enable row level security;
alter table if exists public.bookings force row level security;

-- `inquiries` — names, emails, phone numbers from the marketing forms.
alter table if exists public.inquiries enable row level security;
alter table if exists public.inquiries force row level security;

-- `email_events` — the durable send log; contains recipient addresses.
alter table if exists public.email_events enable row level security;
alter table if exists public.email_events force row level security;

-- `cron_runs` — the keep-alive audit trail. No PII, but nothing outside the
-- server has any business writing to it either.
alter table if exists public.cron_runs enable row level security;
alter table if exists public.cron_runs force row level security;

-- Deliberately NO policies are created.
--
-- In Postgres, RLS with zero policies denies every row to every non-superuser,
-- non-owner role. That is exactly the intent: `anon` and `authenticated` get
-- nothing, and `service_role` (which carries BYPASSRLS) is unaffected. Adding
-- even one permissive policy would reopen the hole, so if you ever need
-- browser-side access to any of this data, put it behind an API route rather
-- than writing a policy here.
--
-- Note on `force row level security`: this also applies RLS to the table
-- OWNER. Supabase's service_role bypasses RLS through the BYPASSRLS role
-- attribute rather than through table ownership, so the app keeps working —
-- while a connection that merely happens to own the table does not get a free
-- pass.

-- Belt and braces: revoke the default table grants from the public-facing
-- roles as well, so a future `alter table ... disable row level security`
-- (or a policy added by mistake) is not on its own enough to expose the data.
revoke all on public.bookings     from anon, authenticated;
revoke all on public.inquiries    from anon, authenticated;
revoke all on public.email_events from anon, authenticated;
revoke all on public.cron_runs    from anon, authenticated;
