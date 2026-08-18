// app/lib/supabase-server.js
//
// The single server-side Supabase client for the whole app.
//
// WHY THIS EXISTS — read before adding another createClient() call anywhere:
//
// The `bookings` table holds government-issued ID photos, certificates of
// insurance, home addresses and phone numbers. The only thing standing between
// that data and the public internet is Postgres Row Level Security, because a
// Supabase **anon** key is designed to be publicly shareable — it is handed to
// browsers in a normal Supabase app and is not a secret. Every route here runs
// on the server, so there is no reason to use the weak key at all.
//
// The posture is therefore:
//   1. `scripts/migrations/2026_enable_rls_lockdown.sql` turns RLS ON with NO
//      policies on bookings / inquiries / email_events / cron_runs. With RLS on
//      and no policy granting access, the anon key can read and write exactly
//      nothing — even if the key leaks.
//   2. This module connects with `SUPABASE_SERVICE_ROLE_KEY`, which bypasses
//      RLS. That key IS a secret: it must only ever live in server env vars
//      (Vercel project settings), never in `NEXT_PUBLIC_*`, never in a client
//      component, never in the repo.
//
// Ordering matters when rolling this out: set SUPABASE_SERVICE_ROLE_KEY in the
// environment FIRST, deploy, and only then run the RLS migration. Until the
// service-role key is set this falls back to the anon key so nothing breaks —
// but that fallback stops working the moment RLS is enabled, which is the loud
// failure we want rather than a silent downgrade.

import { createClient } from '@supabase/supabase-js';
import { lazyClient } from './lazy-client.js';

// True when the app is talking to Supabase with the privileged, RLS-bypassing
// key. Exposed so health checks and diagnostics can report the posture without
// re-reading env vars (and without ever logging the key itself).
export function usingServiceRoleKey() {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// The key this process will authenticate with. Prefers the service-role key;
// falls back to the anon key so a deploy that hasn't had the new env var added
// yet keeps working (see the rollout ordering note above).
export function supabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
}

// True when either key is configured — used by callers that degrade gracefully
// rather than throwing (e.g. the best-effort email logger).
export function supabaseConfigured() {
  return !!(process.env.SUPABASE_URL && supabaseKey());
}

let warnedAboutAnonKey = false;

export function createServerSupabaseClient(options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = supabaseKey();

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)'
    );
  }

  if (!usingServiceRoleKey() && !warnedAboutAnonKey) {
    warnedAboutAnonKey = true;
    console.warn(
      '⚠️ Supabase is using the ANON key. Set SUPABASE_SERVICE_ROLE_KEY so the ' +
      'server bypasses RLS and the anon key can be locked down — see ' +
      'scripts/migrations/2026_enable_rls_lockdown.sql.'
    );
  }

  return createClient(url, key, {
    auth: {
      // Server-side only: never persist or refresh a session.
      persistSession: false,
      autoRefreshToken: false,
    },
    db: { schema: 'public' },
    global: {
      headers: { 'x-application-name': 'merritt-fitness-booking-system' },
    },
    ...options,
  });
}

// Shared lazy singleton. Construction is deferred to first use so `next build`
// can evaluate route modules without runtime secrets present.
export const supabaseServer = lazyClient(() => createServerSupabaseClient());
