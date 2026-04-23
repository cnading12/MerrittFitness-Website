// Confirms the two emails sent by the monthly-recurring-billing cron each
// time it queues invoice items for an upcoming month:
//
//   1. `monthlyBillingClient` — per-renter preview of the upcoming charge,
//      sent with ops on BCC so staff see exactly what the client sees.
//   2. `monthlyBillingRollup` — single end-of-run summary to the ops team,
//      covering every booking touched (succeeded / skipped / failed).
//
// These are the two communications that satisfy "staff and client receive
// confirmation for the monthly charge." If either template loses the amount,
// the occurrence list, or the failure section, the client/ops loop breaks
// silently — hence the content assertions below.
process.env.RESEND_API_KEY ||= 're_test_monthly_billing';

import test from 'node:test';
import assert from 'node:assert/strict';

const { EMAIL_TEMPLATES } = await import('../app/lib/email.js');

function booking(overrides = {}) {
  return {
    id: 'book_monthly_001',
    event_name: 'Sunset Yoga Flow',
    contact_name: 'Alex Rivera',
    email: 'alex@example.com',
    ...overrides,
  };
}

// Occurrences matching the November 2026 dance-studio scenario: weekly
// Wednesday 2 hrs (4×) + biweekly Friday 4 hrs (2×) = 16 hrs.
const NOV_OCCURRENCES = [
  { date: '2026-11-04', hours: 2, slotLabel: 'Every Wednesday 6:00 PM' },
  { date: '2026-11-06', hours: 4, slotLabel: 'Every other Friday 7:00 PM' },
  { date: '2026-11-11', hours: 2, slotLabel: 'Every Wednesday 6:00 PM' },
  { date: '2026-11-18', hours: 2, slotLabel: 'Every Wednesday 6:00 PM' },
  { date: '2026-11-20', hours: 4, slotLabel: 'Every other Friday 7:00 PM' },
  { date: '2026-11-25', hours: 2, slotLabel: 'Every Wednesday 6:00 PM' },
];

function monthlyArgs(overrides = {}) {
  return {
    booking: booking(),
    year: 2026,
    month: 11,
    occurrences: NOV_OCCURRENCES,
    totalHours: 16,
    amount: 1520, // 16 × $95
    hourlyRate: 95,
    chargeDate: '2026-11-01T00:00:00.000Z',
    paymentMethod: 'ach',
    summaryText: '4 Wednesdays x 2 hrs + 2 Fridays x 4 hrs = 16 hrs',
    ...overrides,
  };
}

//
// Per-client monthly billing email
//

test('monthly billing client email: subject is scoped to the right month + event', () => {
  const { subject } = EMAIL_TEMPLATES.monthlyBillingClient(monthlyArgs());
  assert.match(subject, /November 2026 invoice/);
  assert.match(subject, /Sunset Yoga Flow/);
});

test('monthly billing client email: amount, hours, and hourly rate are surfaced', () => {
  const { html } = EMAIL_TEMPLATES.monthlyBillingClient(monthlyArgs());
  assert.match(html, /\$1520\.00/);
  assert.match(html, /16 hrs/);
  assert.match(html, /\$95\/hr/);
});

test('monthly billing client email: charge date is the 1st of the billing month', () => {
  const { html } = EMAIL_TEMPLATES.monthlyBillingClient(monthlyArgs());
  // The charge date is what will actually hit the client's account.
  assert.match(html, /November 1, 2026/);
});

test('monthly billing client email: every occurrence date appears in the schedule table', () => {
  const { html } = EMAIL_TEMPLATES.monthlyBillingClient(monthlyArgs());
  // Each date should be rendered in full so the client can see every charge line.
  for (const expected of [
    'Wednesday, November 4',
    'Friday, November 6',
    'Wednesday, November 11',
    'Wednesday, November 18',
    'Friday, November 20',
    'Wednesday, November 25',
  ]) {
    assert.ok(html.includes(expected), `Expected occurrence "${expected}" to be in client email`);
  }
});

test('monthly billing client email: ACH vs card payment method copy differs', () => {
  const ach = EMAIL_TEMPLATES.monthlyBillingClient(monthlyArgs({ paymentMethod: 'ach' }));
  assert.match(ach.html, /ACH Auto-Debit/);
  assert.match(ach.html, /bank statement/);

  const card = EMAIL_TEMPLATES.monthlyBillingClient(monthlyArgs({ paymentMethod: 'card' }));
  assert.match(card.html, /Card on file/);
  assert.match(card.html, /3% processing fee/);
  assert.match(card.html, /card statement/);
});

test('monthly billing client email: greets the renter by name', () => {
  const { html } = EMAIL_TEMPLATES.monthlyBillingClient(monthlyArgs());
  assert.match(html, /Hi Alex Rivera/);
});

test('monthly billing client email: booking id is present for reply threads', () => {
  const { html } = EMAIL_TEMPLATES.monthlyBillingClient(monthlyArgs());
  assert.match(html, /book_monthly_001/);
});

test('monthly billing client email: handles zero-occurrence month gracefully', () => {
  // Shouldn't normally happen — the cron skips zero-occurrence bookings — but
  // the template must not throw if it's ever called with an empty list.
  const { html } = EMAIL_TEMPLATES.monthlyBillingClient(
    monthlyArgs({ occurrences: [], totalHours: 0, amount: 0, summaryText: '0 hrs' })
  );
  assert.match(html, /No scheduled dates in this month/);
});

//
// Ops-team monthly rollup email
//

function rollupArgs(overrides = {}) {
  return {
    year: 2026,
    month: 11,
    durationMs: 2345,
    dryRun: false,
    results: {
      succeeded: [
        {
          bookingId: 'book_001',
          eventName: 'Sunset Yoga Flow',
          contactName: 'Alex Rivera',
          occurrenceCount: 6,
          totalHours: 16,
          amount: 1520,
          note: 'Invoice item ii_abc',
        },
        {
          bookingId: 'book_002',
          eventName: 'Morning Pilates',
          contactName: 'Jordan Lee',
          occurrenceCount: 4,
          totalHours: 8,
          amount: 760,
          note: 'Invoice item ii_def',
        },
      ],
      skipped: [
        {
          bookingId: 'book_003',
          eventName: 'Retired Series',
          contactName: 'Sam Kim',
          reason: 'Invoice item already exists for 2026-11 (id=ii_xyz)',
          note: 'Already billed',
        },
      ],
      failed: [],
    },
    ...overrides,
  };
}

test('monthly billing rollup email: subject announces the billing period', () => {
  const { subject } = EMAIL_TEMPLATES.monthlyBillingRollup(rollupArgs());
  assert.match(subject, /Monthly recurring billing/);
  assert.match(subject, /November 2026/);
});

test('monthly billing rollup email: subject marks dry runs so ops never confuses them for live runs', () => {
  const live = EMAIL_TEMPLATES.monthlyBillingRollup(rollupArgs({ dryRun: false }));
  assert.doesNotMatch(live.subject, /dry run/i);

  const dry = EMAIL_TEMPLATES.monthlyBillingRollup(rollupArgs({ dryRun: true }));
  assert.match(dry.subject, /dry run/i);
  assert.match(dry.html, /DRY RUN/);
  assert.match(dry.html, /No Stripe invoice items were created/);
});

test('monthly billing rollup email: shows counts for each bucket', () => {
  const { html } = EMAIL_TEMPLATES.monthlyBillingRollup(rollupArgs());
  // There is one succeeded/skipped/failed row; each should be rendered.
  assert.match(html, /Succeeded.*\(2\)/s); // section header
  assert.match(html, /Skipped.*\(1\)/s);
});

test('monthly billing rollup email: includes each booking name and dollar total', () => {
  const { html } = EMAIL_TEMPLATES.monthlyBillingRollup(rollupArgs());
  assert.match(html, /Sunset Yoga Flow/);
  assert.match(html, /Morning Pilates/);
  assert.match(html, /Retired Series/);
  assert.match(html, /\$1520\.00/);
  assert.match(html, /\$760\.00/);
});

test('monthly billing rollup email: sums succeeded amounts into a "total billed" line', () => {
  const { html } = EMAIL_TEMPLATES.monthlyBillingRollup(rollupArgs());
  // 1520 + 760 = 2280.
  assert.match(html, /Total billed/);
  assert.match(html, /\$2280\.00/);
});

test('monthly billing rollup email: renders a visible failure section when any booking failed', () => {
  const failing = rollupArgs({
    results: {
      succeeded: [],
      skipped: [],
      failed: [
        {
          bookingId: 'book_fail',
          eventName: 'Broken Series',
          contactName: 'Pat Morgan',
          error: 'Stripe subscription lookup failed: No such subscription: sub_missing',
        },
      ],
    },
  });
  const { html } = EMAIL_TEMPLATES.monthlyBillingRollup(failing);
  assert.match(html, /Failure Details/);
  assert.match(html, /Broken Series/);
  assert.match(html, /No such subscription: sub_missing/);
});

test('monthly billing rollup email: omits failure section when there are no failures', () => {
  const { html } = EMAIL_TEMPLATES.monthlyBillingRollup(rollupArgs());
  assert.doesNotMatch(html, /Failure Details/);
});

test('monthly billing rollup email: still renders cleanly with an entirely empty run', () => {
  const empty = rollupArgs({ results: { succeeded: [], skipped: [], failed: [] } });
  const { html } = EMAIL_TEMPLATES.monthlyBillingRollup(empty);
  // 0 succeeded / 0 skipped / 0 failed — total should be $0.00.
  assert.match(html, /\$0\.00/);
});
