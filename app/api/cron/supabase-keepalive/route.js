// Vercel Cron hook: keeps the Supabase project from being auto-paused.
//
// The problem this solves:
//   Supabase pauses Free-plan projects after ~7 consecutive days without
//   database activity. The venue can easily go a week between bookings, and
//   when it does, the next renter's booking hits a paused database and fails —
//   they then have to come back and rebook. Restoring a paused project is a
//   manual, multi-minute dashboard action that the app cannot trigger itself,
//   so the fix has to be prevention, not recovery.
//
// What it does:
//   One real query per day (see pingDatabase in app/lib/database.js). Any
//   genuine database request resets Supabase's inactivity clock, so a daily
//   ping keeps the project awake with ~6 days of slack — the pause needs 7
//   consecutive quiet days, so even a run of failed pings can't catch us out
//   without several days of warning.
//
// Why daily rather than, say, every 6 days:
//   Headroom. A single missed or failed run must never be enough to lose the
//   project, and a daily run also doubles as a health check — if the database
//   is unreachable, staff get an email (see sendDatabaseUnreachableAlert)
//   instead of finding out from a renter whose booking failed.
//
// Deliberately NOT a fake test booking:
//   Creating and then deleting a real booking would touch Google Calendar,
//   availability, admin views and the email pipeline, and any failure between
//   create and delete leaves a phantom event on the venue's live calendar.
//   Supabase's inactivity timer only cares about database activity, so the
//   read below buys exactly the same protection with none of that blast radius.
//
// Authentication:
//   Requests from Vercel Cron include `Authorization: Bearer $CRON_SECRET`.
//   We reject anything else.

import { pingDatabase } from '../../../lib/database.js';
import { sendDatabaseUnreachableAlert } from '../../../lib/email.js';
import { requireCronAuth } from '../../../lib/auth.js';

async function handler(request) {
  // Constant-time comparison, fails closed when CRON_SECRET is unset.
  const auth = requireCronAuth(request);
  if (!auth.ok) {
    if (auth.status === 401) {
      console.warn('🚫 Supabase keep-alive cron called without valid Authorization header');
    }
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const checkedAt = new Date();
  const result = await pingDatabase({ triggeredBy: 'vercel-cron' });

  if (result.ok) {
    return Response.json({
      ok: true,
      latencyMs: result.latencyMs,
      bookingCount: result.bookingCount,
      auditRowWritten: result.auditRowWritten,
      checkedAt: checkedAt.toISOString(),
    });
  }

  // The ping failed: either the project is already paused or Supabase is down.
  // Either way a renter booking right now would fail, so raise the alarm —
  // but never let a failing alert email mask the failing ping in the response.
  let alerted = false;
  try {
    const alert = await sendDatabaseUnreachableAlert({ error: result.error, checkedAt });
    alerted = !alert?.error;
  } catch (err) {
    console.error('❌ Failed to send database-unreachable alert:', err.message);
  }

  // 500 so the failure also surfaces in Vercel's cron dashboard.
  return Response.json({
    ok: false,
    error: result.error,
    alerted,
    checkedAt: checkedAt.toISOString(),
  }, { status: 500 });
}

export async function GET(request) { return handler(request); }
export async function POST(request) { return handler(request); }

export const dynamic = 'force-dynamic';
// This route can send the staff alert email, so it must outlive Vercel's
// default ~10s timeout like every other email-sending route (see CLAUDE.md).
export const maxDuration = 60;
