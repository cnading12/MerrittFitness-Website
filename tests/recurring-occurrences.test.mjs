// Unit tests for app/lib/recurring-occurrences.js.
//
// Uses Node's built-in test runner (node:test) so the repo doesn't pull in a
// new test framework just for this file. Run with:
//   npm test
// or directly:
//   node --test tests/

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeOccurrences, summarizeOccurrences, _internal }
  from '../app/lib/recurring-occurrences.js';

// Helper to pluck dates out of the result for readable assertions.
const dates = (occs) => occs.map((o) => o.date);

test('weekly slot: November 2026 has 4 Wednesdays', () => {
  const pattern = {
    startDate: '2026-01-01',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  };
  const occs = computeOccurrences(pattern, 2026, 11);
  assert.deepEqual(dates(occs), ['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25']);
  assert.equal(occs.every((o) => o.hours === 2), true);
});

test('weekly slot: July 2026 has 5 Wednesdays', () => {
  // Sanity check for a 5-Wednesday month. Picks up the fact that totals in
  // five-week months are materially larger than four-week months.
  const pattern = {
    startDate: '2026-01-01',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  };
  const occs = computeOccurrences(pattern, 2026, 7);
  assert.equal(occs.length, 5);
  assert.deepEqual(dates(occs), [
    '2026-07-01', '2026-07-08', '2026-07-15', '2026-07-22', '2026-07-29',
  ]);
});

test('biweekly slot: parity relative to anchor', () => {
  // Anchor is 2026-11-06 (a Friday). Biweekly Fridays should land Nov 6 and
  // Nov 20, NOT Nov 13 or 27.
  const pattern = {
    startDate: '2026-11-06',
    slots: [{ dayOfWeek: 5, startTime: '6:00 PM', durationHours: 4, frequency: 'biweekly' }],
  };
  const occs = computeOccurrences(pattern, 2026, 11);
  assert.deepEqual(dates(occs), ['2026-11-06', '2026-11-20']);
});

test('biweekly slot: anchor on a different weekday still produces correct parity', () => {
  // Anchor is Nov 2 (Monday) but the slot is for Fridays. The first Friday
  // on-or-after Nov 2 is Nov 6, so biweekly Fridays should fall Nov 6 and
  // Nov 20. Checks that parity derives from the first matching weekday,
  // not the anchor weekday itself.
  const pattern = {
    startDate: '2026-11-02',
    slots: [{ dayOfWeek: 5, startTime: '6:00 PM', durationHours: 4, frequency: 'biweekly' }],
  };
  const occs = computeOccurrences(pattern, 2026, 11);
  assert.deepEqual(dates(occs), ['2026-11-06', '2026-11-20']);
});

test('biweekly slot: carries parity across month boundary', () => {
  // If November gave us Nov 6 and Nov 20, then December's biweekly Fridays
  // must be Dec 4 and Dec 18 (not Dec 11 and Dec 25).
  const pattern = {
    startDate: '2026-11-06',
    slots: [{ dayOfWeek: 5, startTime: '6:00 PM', durationHours: 4, frequency: 'biweekly' }],
  };
  const occs = computeOccurrences(pattern, 2026, 12);
  assert.deepEqual(dates(occs), ['2026-12-04', '2026-12-18']);
});

test('booking endDate mid-month clips occurrences', () => {
  // Booking ends Nov 15, 2026. Weekly Wednesdays should only include Nov 4
  // and Nov 11 — Nov 18 and Nov 25 are past the end date.
  const pattern = {
    startDate: '2026-01-01',
    endDate: '2026-11-15',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  };
  const occs = computeOccurrences(pattern, 2026, 11);
  assert.deepEqual(dates(occs), ['2026-11-04', '2026-11-11']);
});

test('booking startDate mid-month clips occurrences', () => {
  // Booking starts Nov 12, 2026. Weekly Wednesdays should only include the
  // two Wednesdays on or after that date.
  const pattern = {
    startDate: '2026-11-12',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  };
  const occs = computeOccurrences(pattern, 2026, 11);
  assert.deepEqual(dates(occs), ['2026-11-18', '2026-11-25']);
});

test('multiple stacked slots sum correctly (dance-group case)', () => {
  // Weekly Wednesday 2 hrs + biweekly Friday 4 hrs, both starting Nov 1.
  // November 2026:
  //   Wednesdays: Nov 4, 11, 18, 25 -> 4 occurrences x 2 hrs = 8 hrs
  //   Biweekly Fridays: anchor first Friday on-or-after Nov 1 is Nov 6.
  //     Nov 6 and Nov 20 -> 2 occurrences x 4 hrs = 8 hrs
  //   Grand total: 16 hrs.
  const pattern = {
    startDate: '2026-11-01',
    slots: [
      { dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
      { dayOfWeek: 5, startTime: '7:00 PM', durationHours: 4, frequency: 'biweekly' },
    ],
  };
  const occs = computeOccurrences(pattern, 2026, 11);
  assert.deepEqual(dates(occs), [
    '2026-11-04', '2026-11-06', '2026-11-11', '2026-11-18', '2026-11-20', '2026-11-25',
  ]);
  const summary = summarizeOccurrences(occs);
  assert.equal(summary.totalHours, 16);
  assert.ok(summary.text.includes('= 16 hrs'));
});

test('monthly slot fires on the first matching weekday of the month', () => {
  // Monthly Saturday starting Nov 1, 2026.
  // First Saturday in Nov is Nov 7, in Dec is Dec 5.
  const pattern = {
    startDate: '2026-11-01',
    slots: [{ dayOfWeek: 6, startTime: '9:00 AM', durationHours: 3, frequency: 'monthly' }],
  };
  assert.deepEqual(dates(computeOccurrences(pattern, 2026, 11)), ['2026-11-07']);
  assert.deepEqual(dates(computeOccurrences(pattern, 2026, 12)), ['2026-12-05']);
});

test('month entirely before startDate returns zero occurrences', () => {
  const pattern = {
    startDate: '2026-11-01',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  };
  assert.equal(computeOccurrences(pattern, 2026, 10).length, 0);
});

test('month entirely after endDate returns zero occurrences', () => {
  const pattern = {
    startDate: '2026-01-01',
    endDate: '2026-10-31',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  };
  assert.equal(computeOccurrences(pattern, 2026, 11).length, 0);
});

test('throws without a startDate (parity would be ambiguous)', () => {
  const pattern = {
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'biweekly' }],
  };
  assert.throws(() => computeOccurrences(pattern, 2026, 11), /startDate/);
});

test('summarizeOccurrences: groups by weekday and hours', () => {
  const summary = summarizeOccurrences([
    { date: '2026-11-04', hours: 2, slotLabel: '' },
    { date: '2026-11-06', hours: 4, slotLabel: '' },
    { date: '2026-11-11', hours: 2, slotLabel: '' },
    { date: '2026-11-18', hours: 2, slotLabel: '' },
    { date: '2026-11-20', hours: 4, slotLabel: '' },
    { date: '2026-11-25', hours: 2, slotLabel: '' },
  ]);
  assert.equal(summary.totalHours, 16);
  assert.equal(summary.parts.length, 2);
  assert.ok(summary.text.includes('4 Wednesdays x 2 hrs'));
  assert.ok(summary.text.includes('2 Fridays x 4 hrs'));
});

test('_internal.dayOfWeek is timezone-independent for YYYY-MM-DD strings', () => {
  // 2026-11-04 is a Wednesday in any timezone — calendar dates are TZ-free.
  assert.equal(_internal.dayOfWeek('2026-11-04'), 3);
  // 2026-11-06 is Friday.
  assert.equal(_internal.dayOfWeek('2026-11-06'), 5);
});

test('options.startDate overrides pattern.startDate for clipping', () => {
  const pattern = {
    startDate: '2026-01-01',
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
  };
  const occs = computeOccurrences(pattern, 2026, 11, { startDate: '2026-11-12' });
  assert.deepEqual(dates(occs), ['2026-11-18', '2026-11-25']);
});
