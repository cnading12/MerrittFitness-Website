// Admin-only manual trigger for the monthly recurring-billing pipeline.
//
// Intended uses:
//   - Dry-run the plan for a specific month against a staged booking. Returns
//     the computed plan JSON without creating Stripe objects or sending email.
//   - Re-run billing for a single booking that failed in the nightly cron.
//   - Catch up on a month that the cron missed (e.g. after an outage).
//
// Auth: requires the `x-admin-secret` header to match ADMIN_API_SECRET. That
// env var must be set; if it's missing we fail closed.
//
// Request body:
//   {
//     year:   number,    // required, 4-digit
//     month:  number,    // required, 1-12
//     bookingId?: string // optional — limit the run to a single booking
//     dryRun: boolean    // optional, default true (safe default for /admin)
//   }

import { NextResponse } from 'next/server';

import { runMonthlyBilling } from '../../../lib/monthly-billing.js';

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

export async function POST(request) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const year = Number(body.year);
  const month = Number(body.month);
  const bookingId = body.bookingId ? String(body.bookingId) : null;
  // Default dryRun=true so an accidental call doesn't double-bill.
  const dryRun = body.dryRun === false ? false : true;

  if (!Number.isInteger(year) || year < 2024 || year > 2100) {
    return NextResponse.json({ error: 'year must be an integer between 2024 and 2100' }, { status: 400 });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'month must be an integer between 1 and 12' }, { status: 400 });
  }

  console.log(`🛠️  Admin trigger-monthly-billing: ${year}-${month} dryRun=${dryRun} bookingId=${bookingId || '(all)'}`);

  try {
    const { results, durationMs } = await runMonthlyBilling({
      year,
      month,
      bookingId,
      dryRun,
      triggeredBy: 'admin',
    });

    return NextResponse.json({
      ok: true,
      year,
      month,
      bookingId,
      dryRun,
      durationMs,
      counts: {
        succeeded: results.succeeded.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
      },
      // Full per-booking plan is useful in dry-run; include always so the
      // admin can see what actually happened on live runs too.
      results,
    });
  } catch (err) {
    console.error('❌ Admin trigger-monthly-billing failed:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
