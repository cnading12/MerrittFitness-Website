// End-to-end tests for the "prorated first month" slice of the recurring
// booking flow.
//
// The booking intake route stores the prorated first-month amount on
// booking.subtotal; the subscription finalizer then turns that amount into a
// pending invoice item on the first Stripe invoice. The source of truth for
// the amount is:
//     prorated_hours = sum over slots of
//         (occurrences from startDate -> end-of-start-month × durationHours)
//     prorated_amount = prorated_hours × hourly_rate
//
// These tests pin that relationship so a regression in computeOccurrences or
// an off-by-one in month-end handling can't silently change what a client
// gets billed on day one.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeOccurrences, summarizeOccurrences }
  from '../app/lib/recurring-occurrences.js';

// Small helper that mirrors how the booking-request route computes the
// prorated first-month charge: it expands the slots against the booking's
// start month only, clipped to start on/after startDate.
function calculateProratedFirstMonth({ slots, startDate, hourlyRate = 95 }) {
  const [year, month] = startDate.split('-').map(Number);
  const occurrences = computeOccurrences(
    { slots, startDate },
    year,
    month,
    { startDate, endDate: null }
  );
  const summary = summarizeOccurrences(occurrences);
  return {
    occurrences,
    totalHours: summary.totalHours,
    amount: summary.totalHours * hourlyRate,
    summaryText: summary.text,
  };
}

test('prorated: booking starts on the 1st — full month is billed', () => {
  // Start date is Nov 1, 2026 (a Sunday). Weekly Wednesday 2 hrs.
  // Wednesdays in Nov 2026: 4, 11, 18, 25 -> 4 × 2 = 8 hrs × $95 = $760.
  const { totalHours, amount, occurrences } = calculateProratedFirstMonth({
    startDate: '2026-11-01',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  });
  assert.equal(occurrences.length, 4);
  assert.equal(totalHours, 8);
  assert.equal(amount, 760);
});

test('prorated: booking starts mid-month — only post-startDate occurrences count', () => {
  // Start date Nov 15, 2026 (Sunday). Weekly Wednesday 2 hrs + biweekly
  // Friday 4 hrs. From Nov 15 onward:
  //   Wednesdays Nov 18, 25 -> 2 × 2 = 4 hrs
  //   Biweekly Fridays anchored on first Friday on-or-after Nov 15 (= Nov 20)
  //     so only Nov 20 -> 1 × 4 = 4 hrs
  //   Total: 8 hrs × $95 = $760.
  const { totalHours, amount, occurrences } = calculateProratedFirstMonth({
    startDate: '2026-11-15',
    slots: [
      { dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
      { dayOfWeek: 5, startTime: '7:00 PM', durationHours: 4, frequency: 'biweekly' },
    ],
  });
  assert.equal(totalHours, 8);
  assert.equal(amount, 760);
  // Sanity: the first occurrence is on-or-after the start date.
  assert.ok(occurrences[0].date >= '2026-11-15');
});

test('prorated: booking starts on the last Wednesday of the month', () => {
  // Start date Nov 25, 2026 (Wednesday). Weekly Wednesday 2 hrs.
  // Only Nov 25 qualifies -> 1 × 2 = 2 hrs × $95 = $190.
  const { totalHours, amount, occurrences } = calculateProratedFirstMonth({
    startDate: '2026-11-25',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  });
  assert.equal(occurrences.length, 1);
  assert.equal(totalHours, 2);
  assert.equal(amount, 190);
});

test('prorated: booking starts after its weekday has already passed in the month', () => {
  // Start date Nov 26, 2026 (Thursday). Weekly Wednesday 2 hrs.
  // No Wednesdays remain in Nov -> prorated amount = 0. (Stripe will skip the
  // pending invoice item in this case; the first real charge is December's.)
  const { totalHours, amount, occurrences } = calculateProratedFirstMonth({
    startDate: '2026-11-26',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  });
  assert.equal(occurrences.length, 0);
  assert.equal(totalHours, 0);
  assert.equal(amount, 0);
});

test('prorated: five-Wednesday month yields more hours than a four-Wednesday month', () => {
  // July 2026 has 5 Wednesdays (1, 8, 15, 22, 29). Nov 2026 has 4. A full-month
  // start in July should bill more than November.
  const july = calculateProratedFirstMonth({
    startDate: '2026-07-01',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  });
  const november = calculateProratedFirstMonth({
    startDate: '2026-11-01',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  });
  assert.equal(july.totalHours, 10);
  assert.equal(november.totalHours, 8);
  assert.ok(july.amount > november.amount, 'July should bill more than November');
});

test('prorated: stacked weekly + biweekly slots starting Nov 1', () => {
  // Classic "dance studio" case: twice-weekly weekly slot + alternating Friday
  // workshop. Nov 2026:
  //   Wednesdays Nov 4, 11, 18, 25 (4 × 2 = 8 hrs)
  //   Biweekly Fridays anchored Nov 6: Nov 6, Nov 20 (2 × 4 = 8 hrs)
  //   Total: 16 hrs × $95 = $1,520.
  const { totalHours, amount, summaryText } = calculateProratedFirstMonth({
    startDate: '2026-11-01',
    slots: [
      { dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
      { dayOfWeek: 5, startTime: '7:00 PM', durationHours: 4, frequency: 'biweekly' },
    ],
  });
  assert.equal(totalHours, 16);
  assert.equal(amount, 1520);
  // The summary should list both weekday groupings for the client email.
  assert.ok(summaryText.includes('Wednesdays'));
  assert.ok(summaryText.includes('Fridays'));
  assert.ok(summaryText.includes('= 16 hrs'));
});

test('prorated: honors custom hourly rate (not just the $95 default)', () => {
  // Some series use different rates; the prorated math must scale accordingly.
  const { amount } = calculateProratedFirstMonth({
    startDate: '2026-11-01',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
    hourlyRate: 125,
  });
  // 8 hrs × $125 = $1,000.
  assert.equal(amount, 1000);
});

test('prorated: monthly-frequency slot charges once for the first month', () => {
  // Monthly Saturday starting Nov 1, 2026. First Saturday is Nov 7, 3 hrs.
  // 1 × 3 = 3 hrs × $95 = $285.
  const { totalHours, amount, occurrences } = calculateProratedFirstMonth({
    startDate: '2026-11-01',
    slots: [{ dayOfWeek: 6, startTime: '9:00 AM', durationHours: 3, frequency: 'monthly' }],
  });
  assert.equal(occurrences.length, 1);
  assert.deepEqual(occurrences.map((o) => o.date), ['2026-11-07']);
  assert.equal(totalHours, 3);
  assert.equal(amount, 285);
});

test('prorated: monthly-frequency slot that has already passed this month charges $0', () => {
  // Monthly Saturday, but startDate is Nov 10 — Nov 7 is already past.
  // Expected: 0 hours, 0 dollars. The first real charge is December's.
  const { totalHours, amount, occurrences } = calculateProratedFirstMonth({
    startDate: '2026-11-10',
    slots: [{ dayOfWeek: 6, startTime: '9:00 AM', durationHours: 3, frequency: 'monthly' }],
  });
  assert.equal(occurrences.length, 0);
  assert.equal(totalHours, 0);
  assert.equal(amount, 0);
});

test('prorated: start-date-on-a-Saturday with a Saturday slot includes that Saturday', () => {
  // Anchor parity check: if the booking opens on the exact weekday of the slot,
  // that day counts as occurrence #1.
  const { occurrences, totalHours } = calculateProratedFirstMonth({
    startDate: '2026-11-07', // Saturday
    slots: [{ dayOfWeek: 6, startTime: '9:00 AM', durationHours: 3, frequency: 'weekly' }],
  });
  assert.deepEqual(
    occurrences.map((o) => o.date),
    ['2026-11-07', '2026-11-14', '2026-11-21', '2026-11-28']
  );
  assert.equal(totalHours, 12);
});
