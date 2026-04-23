// Tests the "when does the cron actually do work?" logic.
//
// The cron is scheduled `0 22 28-31 * *` in vercel.json, which fires on days
// 28, 29, 30, AND 31 of every month. The handler then calls isLastDayOfMonth
// to early-exit on all those days *except* the actual last day. If that check
// drifts, bookings either (a) get double-billed when the cron succeeds on
// multiple days in a row, or (b) miss a month if it never sees the real EOM.
//
// These tests also pin the nextMonth() rollover so December -> January
// doesn't regress (the bug that stops the new year's first invoice).

import test from 'node:test';
import assert from 'node:assert/strict';

import { isLastDayOfMonth, nextMonth } from '../app/lib/cron-schedule.js';

// Helper: build a Date at 22:00 UTC on the given calendar date. That's when
// the cron actually fires (matching vercel.json `0 22 28-31 * *`).
function at22UTC(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 22, 0, 0));
}

//
// isLastDayOfMonth
//

test('isLastDayOfMonth: Jan 31 is the last day', () => {
  assert.equal(isLastDayOfMonth(at22UTC(2026, 1, 31)), true);
});

test('isLastDayOfMonth: Jan 30 is NOT the last day', () => {
  assert.equal(isLastDayOfMonth(at22UTC(2026, 1, 30)), false);
});

test('isLastDayOfMonth: Feb 28 in a non-leap year IS the last day', () => {
  // 2025 is not a leap year.
  assert.equal(isLastDayOfMonth(at22UTC(2025, 2, 28)), true);
});

test('isLastDayOfMonth: Feb 28 in a leap year is NOT the last day', () => {
  // 2024 is a leap year; Feb 29 is the real EOM.
  assert.equal(isLastDayOfMonth(at22UTC(2024, 2, 28)), false);
  assert.equal(isLastDayOfMonth(at22UTC(2024, 2, 29)), true);
});

test('isLastDayOfMonth: April 30 IS the last day (30-day month)', () => {
  assert.equal(isLastDayOfMonth(at22UTC(2026, 4, 30)), true);
});

test('isLastDayOfMonth: April 29 is NOT the last day', () => {
  assert.equal(isLastDayOfMonth(at22UTC(2026, 4, 29)), false);
});

test('isLastDayOfMonth: Dec 31 IS the last day (year rollover boundary)', () => {
  assert.equal(isLastDayOfMonth(at22UTC(2026, 12, 31)), true);
});

test('isLastDayOfMonth: early in the month is always false', () => {
  assert.equal(isLastDayOfMonth(at22UTC(2026, 6, 1)), false);
  assert.equal(isLastDayOfMonth(at22UTC(2026, 6, 15)), false);
});

test('isLastDayOfMonth: midnight UTC on the last day still counts', () => {
  // Edge case: cron fires at 22:00 UTC but the function must also be correct
  // at any other UTC hour on that day (e.g. manual admin trigger at 00:01).
  const midnight = new Date(Date.UTC(2026, 0, 31, 0, 1, 0));
  assert.equal(isLastDayOfMonth(midnight), true);
});

test('isLastDayOfMonth: day 28 in all non-February months is NOT the last day', () => {
  // The cron uses `0 22 28-31 * *`, so days 28, 29, 30 fire in every month.
  // For any 30- or 31-day month, day 28 must early-exit.
  for (const month of [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    assert.equal(
      isLastDayOfMonth(at22UTC(2026, month, 28)),
      false,
      `month=${month} day=28 should not be EOM`
    );
  }
});

//
// nextMonth
//

test('nextMonth: Jan 31 -> February same year', () => {
  assert.deepEqual(nextMonth(at22UTC(2026, 1, 31)), { year: 2026, month: 2 });
});

test('nextMonth: Feb 28 (non-leap) -> March same year', () => {
  assert.deepEqual(nextMonth(at22UTC(2025, 2, 28)), { year: 2025, month: 3 });
});

test('nextMonth: Feb 29 (leap) -> March same year', () => {
  assert.deepEqual(nextMonth(at22UTC(2024, 2, 29)), { year: 2024, month: 3 });
});

test('nextMonth: Dec 31 wraps to January of the next year', () => {
  // This is the critical year-boundary case. If nextMonth returns month=13 or
  // year=2026, the cron mis-bills January.
  assert.deepEqual(nextMonth(at22UTC(2026, 12, 31)), { year: 2027, month: 1 });
});

test('nextMonth: Nov 30 -> December same year', () => {
  assert.deepEqual(nextMonth(at22UTC(2026, 11, 30)), { year: 2026, month: 12 });
});

test('nextMonth: mid-month date still returns the next calendar month', () => {
  // Admin manual triggers can run on any day. The returned month is "month
  // whose 1st is next" which for mid-June is July.
  assert.deepEqual(nextMonth(at22UTC(2026, 6, 15)), { year: 2026, month: 7 });
});

//
// The two together: whole-year march
//

test('cron schedule: every month-end in 2026 maps to the correct next month', () => {
  // Walk all 12 months of 2026 and confirm that for each month's EOM, (a) the
  // function recognizes it as the last day, and (b) nextMonth returns the
  // next calendar month (wrapping December -> January 2027). This is the
  // exact shape of the cron's decision for that year.
  const expected = [
    ['2026-01-31', { year: 2026, month: 2 }],
    ['2026-02-28', { year: 2026, month: 3 }], // 2026 is not a leap year
    ['2026-03-31', { year: 2026, month: 4 }],
    ['2026-04-30', { year: 2026, month: 5 }],
    ['2026-05-31', { year: 2026, month: 6 }],
    ['2026-06-30', { year: 2026, month: 7 }],
    ['2026-07-31', { year: 2026, month: 8 }],
    ['2026-08-31', { year: 2026, month: 9 }],
    ['2026-09-30', { year: 2026, month: 10 }],
    ['2026-10-31', { year: 2026, month: 11 }],
    ['2026-11-30', { year: 2026, month: 12 }],
    ['2026-12-31', { year: 2027, month: 1 }],
  ];

  for (const [iso, next] of expected) {
    const [y, m, d] = iso.split('-').map(Number);
    const eom = at22UTC(y, m, d);
    assert.equal(isLastDayOfMonth(eom), true, `${iso} should be EOM`);
    assert.deepEqual(nextMonth(eom), next, `nextMonth(${iso}) should roll forward`);
  }
});
