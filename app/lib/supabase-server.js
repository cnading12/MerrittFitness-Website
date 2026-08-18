// app/lib/supabase-server.js
//
// The one Supabase client every server module should use.
//
// WHY THIS EXISTS
//
// Nine modules each built their own client with SUPABASE_ANON_KEY. Supabase
// anon keys are designed to be publicly shareable — they are meant to be
// embedded in browser code — and the ONLY thing that makes them safe is Row
// Level Security. Until the companion migration
// (scripts/migrations/2026_enable_row_level_security.sql) is applied, RLS is
// off on these tables, which means anyone holding that key can read every
// booking row: renters' government-issued ID photos, insurance certificates,
// home addresses, phone numbers and emails — and can write booking totals.
//
// Nothing in this app needs the anon key's semantics. Every query here runs
// server-side inside an API route, on behalf of the venue rather than an
// end user, so the correct credential is the service_role key: it is never
// sent to a browser, and it bypasses RLS by design. That combination —
// service_role on the server, RLS denying everything else — means a leaked
// anon key stops being a data breach.
//
// ROLLOUT ORDER MATTERS. Enabling RLS while the app still authenticates as
// `anon` locks the app out of its own database and every booking fails:
//
//   1. Deploy this code.  (Still works on the anon key — see the fallback
//      below — so this step is safe on its own.)
//   2. Set SUPABASE_SERVICE_ROLE_KEY in the Vercel project (all
//      environments). Redeploy. Confirm the boot log no longer warns.
//   3. ONLY THEN run the RLS migration in the Supabase SQL editor.
//
// SUPABASE_SERVICE_ROLE_KEY is a full-access credential: it must only ever
// live in server environment variables. Never prefix it with NEXT_PUBLIC_,
// never import this module from a client component, and never return its
// value in a response.

import { createClient } from '@supabase/supabase-js';

import { lazyClient } from './lazy-client.js';

let warnedAboutAnonFallback = false;

// Returns the key to authenticate with, preferring service_role.
//
// The anon fallback keeps step 1 of the rollout above deployable on its own
// and prevents a missing env var from taking bookings down. It is a
// transitional state, not a supported one — it logs on every client
// construction so it cannot go unnoticed.
export function resolveSupabaseKey() {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRole) return serviceRole;

  if (!warnedAboutAnonFallback) {
    warnedAboutAnonFallback = true;
    console.warn(
      '⚠️  SUPABASE_SERVICE_ROLE_KEY is not set — falling back to SUPABASE_ANON_KEY. ' +
      'Set the service-role key before enabling Row Level Security, or every database ' +
      'query will start failing. See scripts/migrations/2026_enable_row_level_security.sql.'
    );
  }
  return process.env.SUPABASE_ANON_KEY;
}

// True when running on the service-role key. Used by the keep-alive route's
// diagnostics so an operator can confirm step 2 landed before doing step 3.
export function usingServiceRole() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createServerSupabaseClient(options = {}) {
  const key = resolveSupabaseKey();
  if (!process.env.SUPABASE_URL || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(process.env.SUPABASE_URL, key, {
    auth: {
      // No user sessions here — this client acts as the venue, not a person.
      // Persisting or refreshing tokens in a serverless function is both
      // pointless and a way to leak credentials between invocations.
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

// Shared lazily-constructed instance. Lazy because `next build` evaluates
// every route module during page-data collection, and createClient throws
// when the env vars are absent (see lazy-client.js).
export const supabaseServer = lazyClient(() => createServerSupabaseClient());
