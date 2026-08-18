-- Migration: Enable Row Level Security on every application table.
--
-- ============================================================================
--  READ THIS BEFORE RUNNING. ORDER MATTERS. RUNNING THIS FIRST TAKES BOOKINGS
--  DOWN.
-- ============================================================================
--
-- WHY
--
-- The `bookings` table holds renters' government-issued ID photos, insurance
-- certificates (COIs), home addresses, phone numbers and email addresses.
-- `inquiries` holds names, emails and phone numbers of everyone who has ever
-- used a contact form.
--
-- Until this migration runs, those tables have RLS disabled, and the app
-- connects with the Supabase **anon** key. Anon keys are designed to be
-- publicly shareable — Supabase's own documentation has you embed them in
-- browser code — and the *only* thing that makes that safe is RLS. With RLS
-- off, anyone who obtains that key (a leaked env file, a stale deploy log, an
-- old commit, a screenshot) can SELECT every booking row and UPDATE booking
-- totals. Nothing about the key is secret enough to be the sole control.
--
-- After this migration:
--   * anon and authenticated hold ZERO grants on these tables. Every request
--     that isn't service_role is denied, whether or not a policy matches.
--   * service_role — which the server uses and which never leaves the
--     server — bypasses RLS by design, so the app is unaffected.
--   * A leaked anon key becomes worthless instead of a data breach.
--
-- RUN ORDER
--
--   1. Deploy the app code that reads SUPABASE_SERVICE_ROLE_KEY
--      (app/lib/supabase-server.js). It still falls back to the anon key, so
--      this step is safe on its own.
--   2. In Vercel → Project → Settings → Environment Variables, add
--      SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API →
--      `service_role` secret) for Production, Preview AND Development.
--      Redeploy.
--   3. Confirm step 2 took effect. Either check the function logs for
--         🔑 Supabase role: service_role
--      (the anon fallback logs a ⚠️ warning instead), or call
--         GET /api/webhooks/stripe
--      and check that `environment.supabaseRole` reads "service_role".
--   4. ONLY THEN run this migration in the Supabase SQL editor.
--   5. Smoke-test: submit a booking through /book and confirm the row appears
--      and the confirmation email sends.
--
-- Running step 4 before step 3 means the app is still authenticating as
-- `anon`, every query starts returning zero rows or permission errors, and
-- renters cannot book. If that happens, the fix is to complete step 2 — or run
-- the rollback at the bottom of this file.
--
-- NOTE: SUPABASE_SERVICE_ROLE_KEY is a full-access credential. It must live
-- only in server-side environment variables. Never give it a NEXT_PUBLIC_
-- prefix, never import it into a client component, never log it.
--
-- Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- bookings — renter PII, ID photos, COIs, payment amounts
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
-- FORCE also applies RLS to the table's owner. Without it, a query running as
-- the owning role silently skips every policy below.
ALTER TABLE IF EXISTS bookings FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- inquiries — names, emails, phone numbers from the marketing forms
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inquiries FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- email_events — recipient addresses and delivery diagnostics
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_events FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- cron_runs — operational audit trail; no PII, but no reason to expose it
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS cron_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cron_runs FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Revoke the API roles' table grants outright.
--
-- Enabling RLS with no policies already denies everything, but PostgREST
-- distinguishes "no rows visible" from "no permission", and the error text
-- differs in ways that tell a prober whether a table exists. Removing the
-- grants makes the answer uniform, and means a future `CREATE POLICY ... TO
-- public` written in haste cannot accidentally re-open these tables.
--
-- `anon`          = the publicly shareable key.
-- `authenticated` = Supabase Auth end users. This app has none — the venue
--                   staff use the admin endpoints, not Supabase Auth — so it
--                   gets nothing either.
-- `service_role`  = the server. Untouched; it bypasses RLS by design.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['bookings', 'inquiries', 'email_events', 'cron_runs']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
      RAISE NOTICE 'RLS enabled and grants revoked for public.%', t;
    ELSE
      RAISE NOTICE 'Skipping public.% (table does not exist yet)', t;
    END IF;
  END LOOP;
END
$$;

-- Stop new tables in `public` from being reachable by the anon key by
-- default. Anything added later must opt in deliberately.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- VERIFY
--
-- After running, this should report rowsecurity = true for all four tables:
--
--   SELECT tablename, rowsecurity
--     FROM pg_tables
--    WHERE schemaname = 'public'
--      AND tablename IN ('bookings','inquiries','email_events','cron_runs');
--
-- And this should return no rows (no lingering anon/authenticated grants):
--
--   SELECT table_name, grantee, privilege_type
--     FROM information_schema.role_table_grants
--    WHERE table_schema = 'public'
--      AND grantee IN ('anon','authenticated');
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- ROLLBACK (only if step 2 above was missed and bookings are failing).
--
-- This puts the renter PII back within reach of the anon key, so treat it as
-- an emergency measure — set SUPABASE_SERVICE_ROLE_KEY and re-run the
-- migration as soon as the site is stable.
--
--   ALTER TABLE bookings     DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE inquiries    DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE email_events DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE cron_runs    DISABLE ROW LEVEL SECURITY;
--   GRANT ALL ON TABLE public.bookings, public.inquiries,
--                       public.email_events, public.cron_runs
--     TO anon, authenticated;
-- ---------------------------------------------------------------------------
