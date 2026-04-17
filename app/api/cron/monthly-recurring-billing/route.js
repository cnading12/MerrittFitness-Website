// Vercel Cron hook: writes next-month invoice items for every active
// recurring booking, then sends a team roll-up email.
//
// Why the 22:00-UTC-on-the-last-day-of-month schedule?
//   Stripe auto-generates a subscription's invoice at the billing_cycle_anchor
//   (the 1st). Pending invoice items on the customer that reference that
//   subscription are pulled into that invoice *at invoice creation time*. So
//   we must have the invoice item in place BEFORE Stripe wakes up on the 1st
//   and closes the invoice. Running a few hours before midnight UTC gives a
//   comfortable buffer.
//
// Why not cron `L` (last-day)?
//   Vercel Cron uses 5-field UNIX cron and does not support the `L` extension.
//   We schedule `0 22 28-31 * *` in vercel.json (fires on days 28, 29, 30, 31
//   at 22:00 UTC) and early-exit here unless today is the actual last day.
//
// Authentication:
//   Requests from Vercel Cron include `Authorization: Bearer $CRON_SECRET`.
//   We reject anything else.

import { NextResponse } from 'next/server';

import { runMonthlyBilling } from '../../../lib/monthly-billing.js';

// Pure function so it's easy to reason about without mocking Date. Accepts
// a Date and returns true iff that moment falls on the last calendar day of
// its own UTC month.
function isLastDayOfMonth(nowUtc) {
  const tomorrow = new Date(nowUtc.getTime() + 24 * 60 * 60 * 1000);
  return tomorrow.getUTCMonth() !== nowUtc.getUTCMonth();
}

function nextMonth(nowUtc) {
  const y = nowUtc.getUTCFullYear();
  const m = nowUtc.getUTCMonth() + 1; // 1-indexed "current month"
  // Month after the current one. Wraps Dec -> Jan/next-year.
  if (m === 12) return { year: y + 1, month: 1 };
  return { year: y, month: m + 1 };
}

async function handler(request) {
  const auth = request.headers.get('authorization') || '';
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected) {
    console.error('❌ CRON_SECRET is not configured');
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (auth !== expected) {
    console.warn('🚫 Monthly billing cron called without valid Authorization header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  if (!isLastDayOfMonth(now)) {
    // The cron schedule triggers on days 28-31 to cover all month lengths,
    // so early-exit on 28/29/30 when they're not actually month-end. This
    // keeps the real work to once-per-month while using only standard cron.
    console.log('⏭️ Skipping monthly-recurring-billing: not last day of month');
    return NextResponse.json({ skipped: true, reason: 'Not last day of month', today: now.toISOString() });
  }

  const { year, month } = nextMonth(now);
  console.log(`🧾 Running monthly-recurring-billing for ${year}-${month}`);

  try {
    const { results, durationMs } = await runMonthlyBilling({
      year,
      month,
      triggeredBy: 'vercel-cron',
    });
    return NextResponse.json({
      ok: true,
      year,
      month,
      durationMs,
      counts: {
        succeeded: results.succeeded.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
      },
    });
  } catch (err) {
    console.error('❌ Monthly billing cron failed:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request) { return handler(request); }
export async function POST(request) { return handler(request); }

export const dynamic = 'force-dynamic';
// Invoice-item creation across N bookings can take longer than the default
// 10s timeout on Hobby plans; 60s is the Pro/Enterprise ceiling.
export const maxDuration = 60;
