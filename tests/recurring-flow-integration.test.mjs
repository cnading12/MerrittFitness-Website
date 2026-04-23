// Integration smoke-tests for the recurring booking flow, threading the
// pure helpers together end-to-end:
//
//   (1) Client books a recurring series with a mid-month start date.
//   (2) The server calculates a prorated first-month charge from the slots
//       + startDate via computeOccurrences.
//   (3) The recurring setup email shows that exact amount to the client.
//   (4) Next month the cron computes a *full-month* charge using the same
//       slots + the 1st of the billing month, and the monthly billing email
//       reflects that different amount.
//
// This test is the one place that ties all four pieces together so a change
// that silently diverges them (e.g. pricing calc uses inclusive-end but
// email uses exclusive-end) will fail fast.
process.env.RESEND_API_KEY ||= 're_test_integration';

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeOccurrences, summarizeOccurrences }
  from '../app/lib/recurring-occurrences.js';
import { isLastDayOfMonth, nextMonth }
  from '../app/lib/cron-schedule.js';

const { EMAIL_TEMPLATES } = await import('../app/lib/email.js');

test('end-to-end: mid-month start -> prorated amount -> client sees it in setup email', () => {
  //
  // Step 1: client books Sunset Yoga Flow starting Nov 15, 2026.
  //         Weekly Wednesdays 2hrs + biweekly Fridays 4hrs. ACH.
  //
  const hourlyRate = 95;
  const slots = [
    { dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
    { dayOfWeek: 5, startTime: '7:00 PM', durationHours: 4, frequency: 'biweekly' },
  ];
  const startDate = '2026-11-15';

  //
  // Step 2: server calculates the prorated first-month charge from the slots
  //         + startDate (the exact formula used in the booking-request route).
  //
  const occurrences = computeOccurrences({ slots, startDate }, 2026, 11, { startDate });
  const summary = summarizeOccurrences(occurrences);
  const firstMonthCharge = summary.totalHours * hourlyRate;

  // From Nov 15 onward in Nov 2026:
  //   Wednesdays Nov 18, 25 -> 2 × 2 = 4 hrs
  //   Biweekly Fridays anchored on first Friday on-or-after Nov 15 (Nov 20)
  //     so only Nov 20 -> 1 × 4 = 4 hrs
  //   Total: 8 hrs -> $760 prorated first-month charge.
  assert.equal(summary.totalHours, 8);
  assert.equal(firstMonthCharge, 760);

  //
  // Step 3: the recurring setup email (sent right after Stripe SetupIntent
  //         succeeds) must show that same amount to the client. If the
  //         booking-request route ever drifts from the template, tests catch it.
  //
  const booking = {
    id: 'book_integration_001',
    event_name: 'Sunset Yoga Flow',
    contact_name: 'Alex Rivera',
    email: 'alex@example.com',
    phone: '+1-720-555-0110',
    home_address: '123 Irving St',
    payment_method: 'ach',
    subtotal: firstMonthCharge,
    recurring_details: JSON.stringify({
      hourlyRate,
      slots,
      startDate,
      endDate: null,
      firstMonthCharge,
      firstBillingDate: '2026-12-01T00:00:00.000Z',
      paymentMethod: 'ach',
    }),
  };
  const clientEmail = EMAIL_TEMPLATES.recurringSetupClient(booking);
  const managerEmail = EMAIL_TEMPLATES.recurringSetupManager(booking);

  // The amount the client sees must equal the amount the server calculated.
  assert.match(clientEmail.html, /\$760\.00/);
  // And ops's copy must show the same amount so they can reconcile it.
  assert.match(managerEmail.html, /\$760\.00/);
});

test('end-to-end: next cycle charges the full month, client sees the larger amount', () => {
  //
  // Same booking, but now it's the last day of November 2026 and the cron
  // is queuing the December invoice. computeOccurrences runs for the full
  // month (no startDate clipping since we're past it).
  //
  const hourlyRate = 95;
  const slots = [
    { dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
    { dayOfWeek: 5, startTime: '7:00 PM', durationHours: 4, frequency: 'biweekly' },
  ];

  // The cron wakes up at 22:00 UTC on Nov 30, 2026 and determines "next
  // month = December 2026".
  const cronFireTime = new Date(Date.UTC(2026, 10, 30, 22, 0, 0));
  assert.equal(isLastDayOfMonth(cronFireTime), true);
  const target = nextMonth(cronFireTime);
  assert.deepEqual(target, { year: 2026, month: 12 });

  // Recompute for December 2026 against the original booking start date. The
  // biweekly parity carries forward from Nov 20, so Dec biweekly Fridays
  // land on Dec 4 and Dec 18.
  const decOccurrences = computeOccurrences(
    { slots, startDate: '2026-11-15' },
    target.year,
    target.month,
    { startDate: '2026-11-15' }
  );
  const decSummary = summarizeOccurrences(decOccurrences);

  // December 2026:
  //   Weekly Wednesdays (Dec 2, 9, 16, 23, 30) -> 5 × 2 = 10 hrs
  //   Biweekly Fridays (Dec 4, 18) -> 2 × 4 = 8 hrs
  //   Total: 18 hrs × $95 = $1,710. More than the $760 prorated first month.
  assert.equal(decSummary.totalHours, 18);
  const decAmount = decSummary.totalHours * hourlyRate;
  assert.equal(decAmount, 1710);

  //
  // The per-client monthly email must reflect this full-month number. This
  // is what the client will see hit their bank/card on Dec 1.
  //
  const clientEmail = EMAIL_TEMPLATES.monthlyBillingClient({
    booking: {
      id: 'book_integration_001',
      event_name: 'Sunset Yoga Flow',
      contact_name: 'Alex Rivera',
      email: 'alex@example.com',
    },
    year: target.year,
    month: target.month,
    occurrences: decOccurrences,
    totalHours: decSummary.totalHours,
    amount: decAmount,
    hourlyRate,
    chargeDate: `${target.year}-${String(target.month).padStart(2, '0')}-01T00:00:00.000Z`,
    paymentMethod: 'ach',
    summaryText: decSummary.text,
  });

  assert.match(clientEmail.subject, /December 2026 invoice/);
  assert.match(clientEmail.html, /\$1710\.00/);
  assert.match(clientEmail.html, /18 hrs/);
  // Charge date is Dec 1, 2026 — the start of the billing cycle.
  assert.match(clientEmail.html, /December 1, 2026/);
});

test('end-to-end: ops rollup surfaces the exact amount the client was charged', () => {
  // Pin the invariant that whatever per-booking amount goes out to a client
  // ALSO lands in the ops rollup. If these diverge, ops can't reconcile.
  const bookingResult = {
    bookingId: 'book_integration_001',
    eventName: 'Sunset Yoga Flow',
    contactName: 'Alex Rivera',
    occurrenceCount: 8,
    totalHours: 18,
    amount: 1710,
    note: 'Invoice item ii_dec2026',
  };

  const { html } = EMAIL_TEMPLATES.monthlyBillingRollup({
    year: 2026,
    month: 12,
    durationMs: 1200,
    dryRun: false,
    results: { succeeded: [bookingResult], skipped: [], failed: [] },
  });

  assert.match(html, /Sunset Yoga Flow/);
  assert.match(html, /Alex Rivera/);
  assert.match(html, /\$1710\.00/);
  assert.match(html, /18 hrs/);
});
