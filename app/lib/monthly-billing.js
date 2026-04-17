// Core monthly-recurring-billing pipeline, shared by:
//   - app/api/cron/monthly-recurring-billing/route.js  (the Vercel Cron hook)
//   - app/api/admin/trigger-monthly-billing/route.js   (manual/dry-run trigger)
//
// Responsibilities:
//   1. Select recurring bookings eligible for billing for a target month.
//   2. Expand each booking's recurring_details into occurrences via
//      computeOccurrences(), clipping against the booking's endDate.
//   3. Check Stripe for an existing invoice item tagged
//      metadata.billing_period=YYYY-MM for that subscription (idempotency).
//   4. Create a new invoice item (amount = hours * hourlyRate) with the full
//      metadata set so downstream jobs can correlate it.
//   5. If the booking's endDate falls within the target month, schedule
//      `cancel_at_period_end = true` on the subscription.
//   6. Send the per-client email and collect a per-booking result.
//   7. Send the team roll-up email and write a row to `cron_runs`.
//
// Everything is wrapped per-booking so one failure doesn't halt the run.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

import { computeOccurrences, summarizeOccurrences } from './recurring-occurrences.js';
import {
  sendMonthlyBillingClientEmail,
  sendMonthlyBillingRollupEmail,
} from './email.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: false,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const DEFAULT_HOURLY_RATE = 95;

function formatBillingPeriod(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function firstOfMonthIso(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).toISOString();
}

function parseRecurringDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

// True iff there's already an invoice item on the subscription tagged with
// the same billing_period. This is our idempotency guard — the cron may be
// retried by Vercel, and we never want to double-bill.
//
// We intentionally do NOT pass `pending: true` here. The cron normally runs
// ahead of Stripe's invoice close, so pending-only would work. But manual
// admin retries can happen after the month's invoice has already closed, at
// which point the item is no longer "pending" — omitting the filter catches
// it either way.
async function findExistingInvoiceItem({ subscriptionId, customerId, billingPeriod }) {
  const items = await stripe.invoiceItems.list({
    customer: customerId,
    limit: 100,
  });
  return items.data.find((ii) =>
    ii.subscription === subscriptionId &&
    ii.metadata?.billing_period === billingPeriod
  ) || null;
}

function describeInvoiceItem({ year, month, summary, hourlyRate }) {
  const monthLabel = new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `${monthLabel} — ${summary.text} @ $${Number(hourlyRate).toFixed(0)}/hr`;
}

// Bookings that should be considered for billing in the target month:
//   - Have a Stripe subscription
//   - Are not still in the "pending recurring setup" state
//   - Haven't already had their endDate pass before the target month starts
//
// Stripe subscription status is checked per-booking below, not in the query,
// because it lives in Stripe rather than Supabase.
async function loadEligibleBookings({ bookingId }) {
  let query = supabase
    .from('bookings')
    .select('*')
    .not('stripe_subscription_id', 'is', null)
    .eq('pending_recurring_setup', false);

  if (bookingId) {
    query = query.eq('id', bookingId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Core billing for a single booking. Returns a result object in one of three
// shapes that the caller uses to bucket into succeeded / skipped / failed:
//
//   { status: 'succeeded', ...planContext, stripeInvoiceItemId, subscriptionCancelled }
//   { status: 'skipped',   ...planContext, reason }
//   { status: 'failed',    ...planContext, error }
//
// `dryRun: true` returns a 'succeeded' shape without creating any Stripe
// object, without sending email, and without touching the subscription.
export async function processRecurringBooking({ booking, year, month, dryRun }) {
  const bookingId = booking.id;
  const billingPeriod = formatBillingPeriod(year, month);
  const base = {
    bookingId,
    eventName: booking.event_name,
    contactName: booking.contact_name,
    billingPeriod,
    subscriptionId: booking.stripe_subscription_id,
    customerId: booking.stripe_customer_id,
  };

  const details = parseRecurringDetails(booking.recurring_details);
  if (!details || !Array.isArray(details.slots) || details.slots.length === 0) {
    return { status: 'failed', ...base, error: 'recurring_details missing or has no slots' };
  }

  const hourlyRate = Number(
    details.hourlyRate ?? details.pricing?.hourlyRate ?? DEFAULT_HOURLY_RATE,
  );
  const startDate = details.startDate || details.start_date || null;
  const endDate = details.endDate || details.end_date || null;
  if (!startDate) {
    return { status: 'failed', ...base, error: 'recurring_details is missing startDate' };
  }

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  if (endDate && endDate < monthStart) {
    return { status: 'skipped', ...base, reason: `Booking ended ${endDate} before ${billingPeriod}` };
  }

  // Confirm the subscription is still active in Stripe before we touch it.
  // Callers rely on this to avoid billing against a cancelled subscription.
  let subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(booking.stripe_subscription_id);
  } catch (err) {
    return { status: 'failed', ...base, error: `Stripe subscription lookup failed: ${err.message}` };
  }
  const activeStatuses = ['active', 'trialing', 'past_due'];
  if (!activeStatuses.includes(subscription.status)) {
    return { status: 'skipped', ...base, reason: `Subscription status is ${subscription.status}` };
  }
  if (subscription.cancel_at_period_end && subscription.cancel_at) {
    const cancelAt = new Date(subscription.cancel_at * 1000).toISOString().slice(0, 10);
    if (cancelAt < monthStart) {
      return { status: 'skipped', ...base, reason: `Subscription cancels ${cancelAt}, before ${billingPeriod}` };
    }
  }

  const occurrences = computeOccurrences(details, year, month, {
    startDate,
    endDate,
  });

  if (occurrences.length === 0) {
    return { status: 'skipped', ...base, reason: 'No occurrences in target month (start/end clipping)' };
  }

  const summary = summarizeOccurrences(occurrences);
  const totalHours = summary.totalHours;
  const amountCents = Math.round(totalHours * hourlyRate * 100);
  const amountDollars = amountCents / 100;
  const description = describeInvoiceItem({ year, month, summary, hourlyRate });

  const plan = {
    ...base,
    year,
    month,
    hourlyRate,
    totalHours,
    amount: amountDollars,
    occurrenceCount: occurrences.length,
    occurrences,
    summaryText: summary.text,
    description,
    paymentMethod: details.paymentMethod || booking.payment_method || 'ach',
  };

  if (dryRun) {
    return { status: 'succeeded', ...plan, dryRun: true, note: 'Dry run — no Stripe or email calls made' };
  }

  // Idempotency: skip if we've already written an invoice item for this
  // billing period. The rollup email will count this under "skipped".
  const existing = await findExistingInvoiceItem({
    subscriptionId: subscription.id,
    customerId: booking.stripe_customer_id,
    billingPeriod,
  });
  if (existing) {
    return {
      status: 'skipped',
      ...plan,
      reason: `Invoice item already exists for ${billingPeriod} (id=${existing.id})`,
      note: 'Already billed',
    };
  }

  let invoiceItem;
  try {
    invoiceItem = await stripe.invoiceItems.create({
      customer: booking.stripe_customer_id,
      subscription: subscription.id,
      amount: amountCents,
      currency: 'usd',
      description,
      metadata: {
        booking_id: bookingId,
        billing_period: billingPeriod,
        occurrence_count: String(occurrences.length),
        total_hours: String(totalHours),
        hourly_rate: String(hourlyRate),
        kind: 'monthly_recurring',
      },
    });
  } catch (err) {
    return { status: 'failed', ...plan, error: `Invoice item creation failed: ${err.message}` };
  }

  // If the booking ends inside this month, tell Stripe to stop billing after
  // the current period. The invoice we just queued will still close and
  // charge normally because it predates the cancellation.
  let subscriptionCancelled = false;
  if (endDate && endDate >= monthStart && endDate <= monthEnd(year, month)) {
    try {
      await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
      subscriptionCancelled = true;
    } catch (err) {
      console.error(`⚠️ Failed to schedule cancel-at-period-end for ${subscription.id}:`, err.message);
      // Don't fail the whole billing — the invoice item is the important part.
    }
  }

  // Client email. A failure here is logged but doesn't fail the billing
  // result — the money is already queued in Stripe.
  const chargeDate = firstOfMonthIso(year, month);
  let emailResult = null;
  try {
    emailResult = await sendMonthlyBillingClientEmail({
      booking,
      year,
      month,
      occurrences,
      totalHours,
      amount: amountDollars,
      hourlyRate,
      chargeDate,
      paymentMethod: plan.paymentMethod,
      summaryText: summary.text,
    });
  } catch (err) {
    console.error(`⚠️ Client email failed for booking ${bookingId}:`, err.message);
  }

  return {
    status: 'succeeded',
    ...plan,
    stripeInvoiceItemId: invoiceItem.id,
    subscriptionCancelled,
    emailSent: Boolean(emailResult && !emailResult.error),
  };
}

function monthEnd(year, month) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(days).padStart(2, '0')}`;
}

// Top-level runner. Loads eligible bookings, processes each, then emits the
// roll-up email and writes a `cron_runs` row. Safe to call from both cron
// and admin handlers.
export async function runMonthlyBilling({ year, month, bookingId = null, dryRun = false, jobName = 'monthly-recurring-billing', triggeredBy = 'cron' }) {
  const startedAt = Date.now();
  if (!year || !month) {
    throw new Error('runMonthlyBilling requires year and month');
  }

  const bookings = await loadEligibleBookings({ bookingId });
  const results = { succeeded: [], skipped: [], failed: [] };

  for (const booking of bookings) {
    let outcome;
    try {
      outcome = await processRecurringBooking({ booking, year, month, dryRun });
    } catch (err) {
      outcome = {
        status: 'failed',
        bookingId: booking.id,
        eventName: booking.event_name,
        contactName: booking.contact_name,
        billingPeriod: formatBillingPeriod(year, month),
        error: err.message || String(err),
      };
    }
    if (outcome.status === 'succeeded') results.succeeded.push(outcome);
    else if (outcome.status === 'skipped') results.skipped.push(outcome);
    else results.failed.push(outcome);
  }

  const durationMs = Date.now() - startedAt;

  // Team rollup. Dry runs never send email — the admin endpoint already
  // returns the full plan as JSON, so emailing would be duplicative and might
  // mislead staff into thinking a run was live.
  if (!dryRun) {
    await sendMonthlyBillingRollupEmail({ year, month, results, durationMs, dryRun });
  }

  // Audit log. Strip the huge `occurrences` arrays from the details blob
  // because they're redundant with the summary text and bloat the row.
  const toDetail = (r) => ({
    bookingId: r.bookingId,
    status: r.status,
    eventName: r.eventName,
    contactName: r.contactName,
    billingPeriod: r.billingPeriod,
    totalHours: r.totalHours,
    amount: r.amount,
    occurrenceCount: r.occurrenceCount,
    reason: r.reason,
    error: r.error,
    stripeInvoiceItemId: r.stripeInvoiceItemId,
    subscriptionCancelled: r.subscriptionCancelled,
    emailSent: r.emailSent,
  });
  const details = {
    year, month, dryRun, bookingId, triggeredBy,
    succeeded: results.succeeded.map(toDetail),
    skipped: results.skipped.map(toDetail),
    failed: results.failed.map(toDetail),
  };

  try {
    await supabase.from('cron_runs').insert({
      job_name: jobName,
      succeeded_count: results.succeeded.length,
      skipped_count: results.skipped.length,
      failed_count: results.failed.length,
      duration_ms: durationMs,
      details,
    });
  } catch (err) {
    console.error('⚠️ Failed to write cron_runs row:', err.message);
  }

  return { results, durationMs };
}
