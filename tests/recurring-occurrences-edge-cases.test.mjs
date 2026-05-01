// Additional coverage for app/lib/recurring-occurrences.js focused on edge
// cases the original suite didn't exercise:
//   * year boundary (Dec -> Jan)
//   * leap-year February
//   * DST transitions (calendar dates should be DST-immune)
//   * monthly slot when the target weekday doesn't occur in some months
//   * multiple same-weekday slots stacking on the same date
//   * pattern hygiene: bare-array, empty slots, Date object inputs
//   * summarize edge cases
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeOccurrences, summarizeOccurrences, _internal }
  from '../app/lib/recurring-occurrences.js';

const dates = (occs) => occs.map((o) => o.date);

// ---------- Year boundary ----------

test('weekly slot: carries parity across the Dec -> Jan boundary', () => {
  // Anchor 2026-01-01 (Thursday). Every Thursday in Dec 2026: 3, 10, 17, 24, 31.
  const pattern = {
    startDate: '2026-01-01',
    slots: [{ dayOfWeek: 4, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  };
  const dec = computeOccurrences(pattern, 2026, 12);
  assert.deepEqual(dates(dec), [
    '2026-12-03', '2026-12-10', '2026-12-17', '2026-12-24', '2026-12-31',
  ]);
  // First Thursday of January 2027 must be Jan 7.
  const jan = computeOccurrences(pattern, 2027, 1);
  assert.deepEqual(dates(jan), ['2027-01-07', '2027-01-14', '2027-01-21', '2027-01-28']);
});

test('biweekly slot: maintains parity across a full year', () => {
  // Friday biweekly anchored on 2026-01-02. The schedule is fixed regardless
  // of how many months elapse, so checking November and December the next
  // year gives a strong signal that arithmetic doesn't drift.
  const pattern = {
    startDate: '2026-01-02',
    slots: [{ dayOfWeek: 5, startTime: '6:00 PM', durationHours: 2, frequency: 'biweekly' }],
  };
  // 2026-01-02 + 14d * n: 01-02, 01-16, 01-30, 02-13, ... eventually 2027-01-01,
  // 2027-01-15, 2027-01-29.
  const jan2027 = computeOccurrences(pattern, 2027, 1);
  assert.deepEqual(dates(jan2027), ['2027-01-01', '2027-01-15', '2027-01-29']);
});

// ---------- Leap year ----------

test('weekly slot: leap-year February has a Feb 29 occurrence on the right weekday', () => {
  // Feb 29, 2028 is a Tuesday. Weekly Tuesdays in Feb 2028: 1, 8, 15, 22, 29.
  const pattern = {
    startDate: '2028-01-01',
    slots: [{ dayOfWeek: 2, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  };
  const feb = computeOccurrences(pattern, 2028, 2);
  assert.deepEqual(dates(feb), [
    '2028-02-01', '2028-02-08', '2028-02-15', '2028-02-22', '2028-02-29',
  ]);
});

test('weekly slot: non-leap February has 28 days', () => {
  // 2027 is not a leap year. Last day = Feb 28 (Sunday).
  const pattern = {
    startDate: '2027-01-01',
    slots: [{ dayOfWeek: 0, startTime: '9:00 AM', durationHours: 1, frequency: 'weekly' }],
  };
  const feb = computeOccurrences(pattern, 2027, 2);
  assert.deepEqual(dates(feb), ['2027-02-07', '2027-02-14', '2027-02-21', '2027-02-28']);
});

// ---------- DST transitions ----------

test('weekly slot: DST spring-forward week still produces the right date', () => {
  // 2027-03-14 is the second Sunday of March (US DST starts 2 AM). Calendar
  // dates are DST-free, so a Sunday slot must include 2027-03-14.
  const pattern = {
    startDate: '2027-01-01',
    slots: [{ dayOfWeek: 0, startTime: '9:00 AM', durationHours: 1, frequency: 'weekly' }],
  };
  const march = computeOccurrences(pattern, 2027, 3);
  assert.ok(dates(march).includes('2027-03-14'));
});

test('weekly slot: DST fall-back week still produces the right date', () => {
  // 2027-11-07 is the first Sunday of November (DST ends).
  const pattern = {
    startDate: '2027-01-01',
    slots: [{ dayOfWeek: 0, startTime: '9:00 AM', durationHours: 1, frequency: 'weekly' }],
  };
  const nov = computeOccurrences(pattern, 2027, 11);
  assert.ok(dates(nov).includes('2027-11-07'));
});

// ---------- Monthly slot edge cases ----------

test('monthly slot: months without that weekday until the n-th occurrence still yield the first matching weekday', () => {
  // Every month has at least four of every weekday, so "first matching
  // weekday in the month" always exists. February 2026: first Friday is
  // Feb 6. Verify monthly slot finds it.
  const pattern = {
    startDate: '2026-02-01',
    slots: [{ dayOfWeek: 5, startTime: '7:00 PM', durationHours: 2, frequency: 'monthly' }],
  };
  const feb = computeOccurrences(pattern, 2026, 2);
  assert.deepEqual(dates(feb), ['2026-02-06']);
});

test('monthly slot: respects clipStart that lands AFTER the first matching weekday of the month', () => {
  // If the renter started Feb 10, the monthly Friday in Feb shouldn't fire
  // (Feb 6 is before the start). It should resume in March.
  const pattern = {
    startDate: '2026-02-10',
    slots: [{ dayOfWeek: 5, startTime: '7:00 PM', durationHours: 2, frequency: 'monthly' }],
  };
  assert.equal(computeOccurrences(pattern, 2026, 2).length, 0);
  const march = computeOccurrences(pattern, 2026, 3);
  assert.deepEqual(dates(march), ['2026-03-06']); // first Friday of March 2026
});

// ---------- Multiple slots stacking on the same date ----------

test('multiple slots: two weekly slots on the same weekday produce two entries on that date', () => {
  const pattern = {
    startDate: '2026-11-01',
    slots: [
      { dayOfWeek: 3, startTime: '9:00 AM', durationHours: 1, frequency: 'weekly' },
      { dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
    ],
  };
  const occs = computeOccurrences(pattern, 2026, 11);
  // 4 Wednesdays * 2 slots = 8 occurrences.
  assert.equal(occs.length, 8);
  // Every Wednesday should appear twice in the list.
  const counts = {};
  for (const o of occs) counts[o.date] = (counts[o.date] || 0) + 1;
  for (const c of Object.values(counts)) assert.equal(c, 2);
});

test('summarize: multi-duration same-weekday groups distinct hours', () => {
  // 4 Wednesdays * 1 hr + 4 Wednesdays * 2 hrs = 12 hrs total.
  const pattern = {
    startDate: '2026-11-01',
    slots: [
      { dayOfWeek: 3, startTime: '9:00 AM', durationHours: 1, frequency: 'weekly' },
      { dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
    ],
  };
  const summary = summarizeOccurrences(computeOccurrences(pattern, 2026, 11));
  assert.equal(summary.totalHours, 12);
  assert.equal(summary.parts.length, 2);
  assert.ok(summary.text.includes('= 12 hrs'));
});

// ---------- Pattern hygiene ----------

test('bare slots array is accepted as a pattern when an explicit startDate is passed in options', () => {
  const slots = [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }];
  const occs = computeOccurrences(slots, 2026, 11, { startDate: '2026-11-01' });
  assert.deepEqual(dates(occs), ['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25']);
});

test('empty slots array yields zero occurrences (no crash)', () => {
  const occs = computeOccurrences({ startDate: '2026-11-01', slots: [] }, 2026, 11);
  assert.deepEqual(occs, []);
});

test('null pattern yields zero occurrences (no crash)', () => {
  assert.deepEqual(computeOccurrences(null, 2026, 11), []);
});

test('Date object as startDate is normalized to YYYY-MM-DD', () => {
  const pattern = {
    startDate: new Date(Date.UTC(2026, 10, 1)), // 2026-11-01
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  };
  const occs = computeOccurrences(pattern, 2026, 11);
  assert.equal(occs.length, 4);
});

// ---------- summarizeOccurrences edge cases ----------

test('summarizeOccurrences: empty input returns "0 hrs"', () => {
  const s = summarizeOccurrences([]);
  assert.equal(s.totalHours, 0);
  assert.equal(s.text, '0 hrs');
  assert.deepEqual(s.parts, []);
});

test('summarizeOccurrences: handles fractional hours without distortion', () => {
  const s = summarizeOccurrences([
    { date: '2026-11-04', hours: 1.5, slotLabel: '' },
    { date: '2026-11-11', hours: 1.5, slotLabel: '' },
  ]);
  assert.equal(s.totalHours, 3);
  assert.ok(s.text.includes('2 Wednesdays x 1.5 hrs'));
});

// ---------- _internal helpers ----------

test('_internal.daysBetween: counts integer days regardless of order', () => {
  assert.equal(_internal.daysBetween('2026-11-04', '2026-11-18'), 14);
  assert.equal(_internal.daysBetween('2026-11-18', '2026-11-04'), -14);
});

test('_internal.daysInMonth: returns correct day counts including leap year', () => {
  assert.equal(_internal.daysInMonth(2026, 2), 28);
  assert.equal(_internal.daysInMonth(2028, 2), 29); // leap
  assert.equal(_internal.daysInMonth(2026, 4), 30);
  assert.equal(_internal.daysInMonth(2026, 12), 31);
});

test('_internal.firstMatchingDayOnOrAfter: returns same date when weekday matches', () => {
  // 2026-11-04 is a Wednesday; asking for the first Wednesday on-or-after
  // that date should return the same date.
  assert.equal(_internal.firstMatchingDayOnOrAfter('2026-11-04', 3), '2026-11-04');
});

test('_internal.firstMatchingDayOnOrAfter: wraps to the next week when needed', () => {
  // 2026-11-04 is Wed; first Tuesday on-or-after = 2026-11-10.
  assert.equal(_internal.firstMatchingDayOnOrAfter('2026-11-04', 2), '2026-11-10');
});
