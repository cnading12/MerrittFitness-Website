// Tests for the renter self-serve conflict-resolution options on recurring
// bookings.
//
// When the pre-submit calendar scan flags a date, the renter resolves it one
// of three ways — the conflicting date itself is NEVER kept:
//   * skip                — that week is dropped and never billed
//   * reschedule          — the renter picks a replacement date/time
//                           themselves. Saturdays are allowed, but bill at
//                           the Saturday band rate (never the weekday rate).
//   * resolve_with_staff  — the week is dropped from billing/calendar like a
//                           skip, and the setup emails flag the date so staff
//                           contact the renter to work out a replacement.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeOccurrences } from '../app/lib/recurring-occurrences.js';
import { recurringOccurrencesAmount } from '../app/lib/booking-pricing.js';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';
const { EMAIL_TEMPLATES } = await import('../app/lib/email.js');

// Every Wednesday at 6 PM for 2h, anchored July 2026 (Wednesdays: 1, 8, 15,
// 22, 29).
const wednesdayPattern = {
  startDate: '2026-07-01',
  slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
};

const dates = (occs) => occs.map((o) => o.date);

// ---------- resolve_with_staff behaves like skip in the engine ----------

test('resolve_with_staff drops the occurrence exactly like skip', () => {
  const viaSkip = computeOccurrences(wednesdayPattern, 2026, 7, {
    exceptions: [{ date: '2026-07-15', slotIdx: 0, action: 'skip' }],
  });
  const viaStaff = computeOccurrences(wednesdayPattern, 2026, 7, {
    exceptions: [{ date: '2026-07-15', slotIdx: 0, action: 'resolve_with_staff' }],
  });
  assert.deepEqual(dates(viaStaff), dates(viaSkip));
  assert.deepEqual(dates(viaStaff), ['2026-07-01', '2026-07-08', '2026-07-22', '2026-07-29']);
});

test('resolve_with_staff is never billed', () => {
  const occurrences = computeOccurrences(wednesdayPattern, 2026, 7, {
    exceptions: [{ date: '2026-07-15', slotIdx: 0, action: 'resolve_with_staff' }],
  });
  // 4 remaining Wednesdays × 2h × $95 — the dropped week contributes nothing.
  assert.equal(recurringOccurrencesAmount(occurrences, 95, 200), 4 * 2 * 95);
});

test('unknown exception actions are still dropped (occurrence kept)', () => {
  // Forward-compat guard: a bogus action must not silently skip billing.
  const occurrences = computeOccurrences(wednesdayPattern, 2026, 7, {
    exceptions: [{ date: '2026-07-15', slotIdx: 0, action: 'vanish' }],
  });
  assert.equal(occurrences.length, 5);
});

// ---------- self-serve reschedule pricing ----------

test('reschedule onto a weekday bills at the weekday rate', () => {
  // Move Wed 2026-07-15 to Thu 2026-07-16.
  const occurrences = computeOccurrences(wednesdayPattern, 2026, 7, {
    exceptions: [{ date: '2026-07-15', slotIdx: 0, action: 'reschedule', newDate: '2026-07-16' }],
  });
  assert.ok(dates(occurrences).includes('2026-07-16'));
  assert.equal(recurringOccurrencesAmount(occurrences, 95, 200), 5 * 2 * 95);
});

test('reschedule onto a Saturday bills at the Saturday rate — never the weekday rate', () => {
  // The renter may move a conflicting Wednesday to a Saturday, but that week
  // then bills at the Saturday band rate: same-price Saturday moves are not a
  // thing. Wed 2026-07-15 → Sat 2026-07-18.
  const occurrences = computeOccurrences(wednesdayPattern, 2026, 7, {
    exceptions: [{ date: '2026-07-15', slotIdx: 0, action: 'reschedule', newDate: '2026-07-18' }],
  });
  assert.ok(dates(occurrences).includes('2026-07-18'));
  const amount = recurringOccurrencesAmount(occurrences, 95, 200);
  assert.equal(amount, 4 * 2 * 95 + 2 * 200); // 4 weekday weeks + 1 Saturday week
  assert.notEqual(amount, 5 * 2 * 95); // and specifically NOT five weekday weeks
});

// ---------- setup emails surface the renter's resolutions ----------

const baseRecurringBooking = (exceptions) => ({
  id: 'booking_conflict_1',
  contact_name: 'Jane Doe',
  email: 'jane@example.com',
  event_name: 'Wednesday Flow',
  event_type: 'wellness',
  expected_attendees: 12,
  payment_method: 'ach',
  subtotal: 760,
  recurring_details: JSON.stringify({
    paymentPreference: 'ach',
    startDate: '2026-07-01',
    endDate: null,
    slots: wednesdayPattern.slots,
    exceptions,
    pricing: { hourlyRate: 76, saturdayHourlyRate: 160, volumeDiscountApplied: true },
  }),
});

test('manager email flags resolve_with_staff dates for follow-up', () => {
  const booking = baseRecurringBooking([
    { date: '2026-07-15', slotIdx: 0, action: 'resolve_with_staff', reason: 'calendar conflict' },
  ]);
  const { html } = EMAIL_TEMPLATES.recurringSetupManager(booking);
  assert.match(html, /Action needed — contact the renter/);
  assert.match(html, /July 15, 2026/);
  assert.match(html, /not calendared, not billed/);
});

test('manager email lists renter-made skips and reschedules, with a Saturday-rate flag', () => {
  const booking = baseRecurringBooking([
    { date: '2026-07-08', slotIdx: 0, action: 'skip' },
    { date: '2026-07-15', slotIdx: 0, action: 'reschedule', newDate: '2026-07-18', newStartTime: '2:00 PM' },
  ]);
  const { html } = EMAIL_TEMPLATES.recurringSetupManager(booking);
  assert.match(html, /Conflict resolutions the renter made/);
  assert.match(html, /July 8, 2026<\/strong> → renter skipped/);
  assert.match(html, /July 18, 2026/);
  assert.match(html, /Saturday — bills at the Saturday rate/);
  // Nothing chose resolve_with_staff, so no follow-up alarm.
  assert.doesNotMatch(html, /Action needed — contact the renter/);
});

test('client email confirms each resolution, including the Saturday rate charge', () => {
  const booking = baseRecurringBooking([
    { date: '2026-07-08', slotIdx: 0, action: 'skip' },
    { date: '2026-07-15', slotIdx: 0, action: 'reschedule', newDate: '2026-07-18', newStartTime: '2:00 PM' },
    { date: '2026-07-22', slotIdx: 0, action: 'resolve_with_staff' },
  ]);
  const { html } = EMAIL_TEMPLATES.recurringSetupClient(booking);
  assert.match(html, /Schedule Adjustments/);
  // Skip: dropped and unbilled.
  assert.match(html, /July 8, 2026<\/strong> skipped/);
  assert.match(html, /will not be billed/);
  // Reschedule to Saturday: moved, at the Saturday rate the schedule stores.
  assert.match(html, /July 18, 2026<\/strong> at 2:00 PM/);
  assert.match(html, /\$160\/hr Saturday rate/);
  // Resolve together: staff will reach out; the original date is not theirs.
  assert.match(html, /we'll reach out to find a replacement date together/);
  assert.match(html, /not reserved for you/);
});

test('emails omit the adjustments blocks when there are no exceptions', () => {
  const booking = baseRecurringBooking([]);
  const client = EMAIL_TEMPLATES.recurringSetupClient(booking);
  const manager = EMAIL_TEMPLATES.recurringSetupManager(booking);
  assert.doesNotMatch(client.html, /Schedule Adjustments/);
  assert.doesNotMatch(manager.html, /Conflict resolutions|Action needed/);
});
