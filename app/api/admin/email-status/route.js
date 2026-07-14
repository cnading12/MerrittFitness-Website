// Admin-only email delivery diagnostics.
//
// Answers, for any booking, the question that made the "client only got their
// first email" incident so hard to debug: did each email in the pipeline
// (confirmation, onboarding, marketing, staff notification) actually get
// SENT — and if Resend accepted it, was it DELIVERED?
//
//   GET /api/admin/email-status?bookingId=<booking or master_booking id>
//   GET /api/admin/email-status                (no bookingId → most recent sends)
//
// Response combines two layers of evidence:
//   1. The durable `email_events` log (written by app/lib/email.js on every
//      send): proves whether the pipeline REACHED each email, with the exact
//      Resend error when a send failed. A missing row means the function died
//      before that send.
//   2. Live Resend delivery state (resend.emails.get → last_event:
//      delivered / bounced / complained / opened / ...): proves what happened
//      AFTER Resend accepted the message. `delivered` + "client didn't see
//      it" = spam folder / inbox filtering, not a code bug.
//
// Auth: requires the `x-admin-secret` header to match ADMIN_API_SECRET
// (same pattern as /api/admin/trigger-monthly-billing). Fails closed.

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { lazyClient } from '../../../lib/lazy-client.js';

const supabase = lazyClient(() => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
));

const resend = lazyClient(() => new Resend(process.env.RESEND_API_KEY));

// Resend's GET endpoints share the 2 req/sec account cap with sends, and each
// logged row costs one lookup — so cap how many rows get live enrichment and
// space the calls out.
const MAX_DELIVERY_LOOKUPS = 15;
const LOOKUP_SPACING_MS = 600;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function requireAdminAuth(request) {
  const provided = request.headers.get('x-admin-secret') || '';
  const expected = process.env.ADMIN_API_SECRET;
  if (!expected) {
    return { ok: false, error: 'ADMIN_API_SECRET not configured', status: 500 };
  }
  if (provided !== expected) {
    return { ok: false, error: 'Unauthorized', status: 401 };
  }
  return { ok: true };
}

export async function GET(request) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const bookingId = (searchParams.get('bookingId') || '').trim() || null;
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 25, 1), 100);
  // ?delivery=false skips the live Resend lookups (fast, log-only view).
  const withDelivery = searchParams.get('delivery') !== 'false';

  // The id lands inside a PostgREST or() filter — restrict it to the UUID
  // alphabet so it can't smuggle in extra filter syntax.
  if (bookingId && !/^[a-zA-Z0-9_-]{1,64}$/.test(bookingId)) {
    return Response.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  let query = supabase
    .from('email_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (bookingId) {
    // Match either the individual booking id or the whole group — once-per-
    // group emails (onboarding, marketing) log under whichever booking
    // carried the send.
    query = query.or(`booking_id.eq.${bookingId},master_booking_id.eq.${bookingId}`);
  }

  const { data: rows, error } = await query;
  if (error) {
    return Response.json({
      ok: false,
      error: `Failed to read email_events: ${error.message}`,
      hint: 'If the table does not exist yet, run scripts/migrations/2026_add_email_events_table.sql in the Supabase SQL editor.',
    }, { status: 500 });
  }

  const events = [];
  let lookups = 0;
  for (const row of rows || []) {
    let delivery = null;
    if (withDelivery && row.resend_id && lookups < MAX_DELIVERY_LOOKUPS) {
      lookups += 1;
      try {
        const res = await resend.emails.get(row.resend_id);
        delivery = res?.data
          ? { lastEvent: res.data.last_event, to: res.data.to, subject: res.data.subject }
          : { error: res?.error?.message || 'No data returned' };
      } catch (err) {
        delivery = { error: err.message };
      }
      await delay(LOOKUP_SPACING_MS);
    }
    events.push({ ...row, delivery });
  }

  // Quick per-kind rollup so a glance answers "which email is missing".
  const summary = {};
  for (const e of events) {
    const kind = e.email_kind || 'unknown';
    summary[kind] = summary[kind] || { sent: 0, failed: 0, delivered: 0, bounced: 0, complained: 0 };
    if (e.status === 'sent') summary[kind].sent += 1;
    if (e.status === 'failed') summary[kind].failed += 1;
    const le = e.delivery?.lastEvent;
    if (le === 'delivered' || le === 'opened' || le === 'clicked') summary[kind].delivered += 1;
    if (le === 'bounced') summary[kind].bounced += 1;
    if (le === 'complained') summary[kind].complained += 1;
  }

  return Response.json({
    ok: true,
    bookingId,
    count: events.length,
    deliveryLookups: lookups,
    summary,
    events,
  });
}

export const dynamic = 'force-dynamic';
// Live delivery lookups are spaced for Resend's rate limit, so this route
// needs the same long budget as the email-sending routes.
export const maxDuration = 60;
