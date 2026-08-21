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
--   3. Redeploy, and CONFIRM the key actually took effect before continuing —
--      the function logs warn "⚠️ Supabase is using the ANON key" when it did
--      not. Running step 4 while the app is still on the anon key takes
--      bookings down.
--   4. Only then run this file in the Supabase SQL editor.
--   5. Smoke-test: submit a booking through /book and confirm the row lands
--      and the confirmation email sends.
--
-- Running this BEFORE step 2 will break booking, inquiries and the cron jobs,
-- because the anon key will no longer be able to touch these tables.
--
-- AFTER: rotate the anon key if you believe it was ever exposed. With RLS on
-- and no policies, a leaked anon key is inert — but rotating costs nothing.
--
-- Verification queries are at the bottom of this file, along with a rollback.

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
--
-- It also makes probing uniform. RLS-with-no-policies returns "no rows";
-- having no grant at all returns "no permission", and PostgREST's error text
-- differs between the two in ways that tell a caller whether a table exists.
--
-- REVOKE has no IF EXISTS form, and a bare REVOKE against a table that hasn't
-- been created yet raises an error that aborts the whole migration — which
-- matters here because `email_events` and `cron_runs` come from migrations
-- that may not have been run. Hence the existence check.
--
--   anon          = the publicly shareable key.
--   authenticated = Supabase Auth end users. This app has none.
--   service_role  = the server. Untouched; it bypasses RLS by design.
do $$
declare
  t text;
begin
  foreach t in array array['bookings', 'inquiries', 'email_events', 'cron_runs']
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('revoke all on table public.%I from anon, authenticated', t);
      raise notice 'RLS enabled and grants revoked for public.%', t;
    else
      raise notice 'Skipping public.% (table does not exist yet)', t;
    end if;
  end loop;
end
$$;

-- Any table added to `public` LATER is unreachable by the anon key by
-- default, so a future migration cannot silently re-expose renter data by
-- forgetting to repeat the lockdown above.
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- ---------------------------------------------------------------------------
-- VERIFY
--
-- Both of these should hold afterwards. The first reports RLS on every table:
--
--   select tablename, rowsecurity from pg_tables
--    where schemaname = 'public'
--      and tablename in ('bookings','inquiries','email_events','cron_runs');
--
-- The second should return NO rows — no lingering anon/authenticated grants:
--
--   select table_name, grantee, privilege_type
--     from information_schema.role_table_grants
--    where table_schema = 'public'
--      and grantee in ('anon','authenticated');
--
-- THE THIRD ONE IS THE IMPORTANT ONE. Everything above checks the four tables
-- this migration knows about. That is "the tables the app writes to", which is
-- not the same set as "the tables that exist" — and the difference is where an
-- orphan hides. The 2026-08 rollout found exactly one: `error_logs`, which no
-- code in this repo references and which still carried full anon grants,
-- DELETE and TRUNCATE included. A table nobody imports is a table nobody
-- thinks to lock.
--
-- So ask the database what it actually has, rather than trusting this file's
-- list. This should return NO rows:
--
--   select c.relname                        as unprotected_table,
--          c.relrowsecurity                 as rls_enabled,
--          coalesce(string_agg(distinct g.grantee, ', '), '(no anon grants)') as anon_grants
--     from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--     left join information_schema.role_table_grants g
--            on g.table_schema = 'public'
--           and g.table_name = c.relname
--           and g.grantee in ('anon','authenticated')
--    where n.nspname = 'public'
--      and c.relkind = 'r'
--      and (c.relrowsecurity = false or g.grantee is not null)
--    group by c.relname, c.relrowsecurity
--    order by c.relname;
--
-- Any row it returns is reachable with the anon key — a credential designed to
-- be public. For each one, decide whether another service writes to it:
--
--   * nothing writes to it  -> lock it, using the same guarded block as above:
--
--       do $$
--       declare t text;
--       begin
--         foreach t in array array['error_logs'] loop   -- <- names from the query
--           if exists (select 1 from information_schema.tables
--                      where table_schema='public' and table_name=t) then
--             execute format('alter table public.%I enable row level security', t);
--             execute format('revoke all on table public.%I from anon, authenticated', t);
--             raise notice 'locked down %', t;
--           end if;
--         end loop;
--       end $$;
--
--   * something DOES write to it with the anon key -> locking it breaks that
--     writer. Move that service onto the service-role key first, then lock.
--
-- This is deliberately NOT automatic. Enabling RLS on a table an unknown
-- service depends on turns a silent exposure into a silent outage, and this
-- migration cannot tell which case a given orphan is.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- ROLLBACK — only if SUPABASE_SERVICE_ROLE_KEY was not actually live and
-- bookings are now failing.
--
-- This puts renter PII back within reach of the anon key, so treat it as an
-- emergency measure: set the env var and re-run this migration as soon as the
-- site is stable.
--
-- Guarded the same way the forward direction is: ALTER TABLE and GRANT have no
-- IF EXISTS form for this, and a table that was never created (this project has
-- no `inquiries` table, for instance) aborts the whole block — leaving the
-- rollback half applied during an outage, which is the worst possible moment.
--
--   do $$
--   declare t text;
--   begin
--     foreach t in array array['bookings','inquiries','email_events','cron_runs'] loop
--       if exists (select 1 from information_schema.tables
--                  where table_schema='public' and table_name=t) then
--         execute format('alter table public.%I disable row level security', t);
--         execute format('grant all on table public.%I to anon, authenticated', t);
--         raise notice 'rolled back %', t;
--       end if;
--     end loop;
--   end $$;
--
--   alter default privileges in schema public grant all on tables to anon, authenticated;
--
-- Deliberately no shorter "just fix bookings" variant: GRANT has no IF EXISTS,
-- so a trimmed-down version reintroduces exactly the failure this block exists
-- to avoid. The DO block above is one paste and always works.
-- ---------------------------------------------------------------------------
