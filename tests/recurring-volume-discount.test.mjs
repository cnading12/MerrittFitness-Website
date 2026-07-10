// Tests for the automatic recurring volume discount and the server-side
// recurring intake pricing (app/lib/booking-pricing.js).
//
// Rules exercised:
//   * A recurring schedule whose slots guarantee 8+ hours in EVERY calendar
//     month (weekly slots land at least 4×, biweekly at least 2×, monthly 1×)
//     automatically bills 20% off the hourly rate — no promo code.
//   * The discount applies ON TOP of the attendee-tiered band rate, to both
//     the weekday and Saturday rates:
//         Guests   Weekday   Saturday   Weekday -20%   Saturday -20%
//         0–30      $95       $200        $76            $160
//         30–60     $125      $260        $100           $208
//         60+       $155      $320        $124           $256
//   * computeRecurringIntakePricing is what the API persists and bills from —
//     the client-sent pricing block is display-only.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  recurringMonthlyMinHours,
  recurringVolumeDiscountApplies,
  recurringRatesFor,
  computeRecurringIntakePricing,
  RECURRING_VOLUME_DISCOUNT,
  RECURRING_VOLUME_DISCOUNT_MIN_MONTHLY_HOURS,
} from '../app/lib/booking-pricing.js';

const weeklySlot = (hours, dayOfWeek = 3) => ({
  dayOfWeek,
  startTime: '6:00 PM',
  durationHours: String(hours),
  frequency: 'weekly',
});

// ---------- recurringMonthlyMinHours ----------

test('recurringMonthlyMinHours: weekly slots count 4 occurrences minimum', () => {
  assert.equal(recurringMonthlyMinHours([weeklySlot(2)]), 8);
});

test('recurringMonthlyMinHours: biweekly slots count 2, monthly count 1', () => {
  assert.equal(recurringMonthlyMinHours([
    { dayOfWeek: 1, durationHours: '3', frequency: 'biweekly' }, // 6
    { dayOfWeek: 5, durationHours: '4', frequency: 'monthly' },  // 4
  ]), 10);
});

test('recurringMonthlyMinHours: handles empty and malformed input', () => {
  assert.equal(recurringMonthlyMinHours([]), 0);
  assert.equal(recurringMonthlyMinHours(null), 0);
  assert.equal(recurringMonthlyMinHours([{ frequency: 'weekly' }]), 0);
});

// ---------- recurringVolumeDiscountApplies ----------

test('volume discount: 8 guaranteed hours/month qualifies (weekly 2h)', () => {
  assert.equal(recurringVolumeDiscountApplies([weeklySlot(2)]), true);
});

test('volume discount: below 8 guaranteed hours does not qualify', () => {
  // Weekly 1.75h → 7 guaranteed hours (even though 5-week months reach 8.75).
  assert.equal(recurringVolumeDiscountApplies([weeklySlot(1.75)]), false);
  // Biweekly 3h → 6 guaranteed hours.
  assert.equal(recurringVolumeDiscountApplies([
    { dayOfWeek: 2, durationHours: '3', frequency: 'biweekly' },
  ]), false);
});

test('volume discount: slots stack toward the threshold', () => {
  // Two biweekly 2h slots → 2 × (2h × 2) = 8 guaranteed hours.
  assert.equal(recurringVolumeDiscountApplies([
    { dayOfWeek: 1, durationHours: '2', frequency: 'biweekly' },
    { dayOfWeek: 4, durationHours: '2', frequency: 'biweekly' },
  ]), true);
});

// ---------- recurringRatesFor ----------

test('recurringRatesFor: qualifying schedule takes 20% off the base band', () => {
  const rates = recurringRatesFor(25, [weeklySlot(2)]);
  assert.equal(rates.volumeDiscountApplied, true);
  assert.equal(rates.hourlyRate, 76);            // $95 − 20%
  assert.equal(rates.saturdayHourlyRate, 160);   // $200 − 20%
  assert.equal(rates.undiscountedHourlyRate, 95);
  assert.equal(rates.undiscountedSaturdayHourlyRate, 200);
});

test('recurringRatesFor: discount stacks on the attendee tier (30–60 band)', () => {
  const rates = recurringRatesFor(45, [weeklySlot(2)]);
  assert.equal(rates.hourlyRate, 100);           // $125 − 20%
  assert.equal(rates.saturdayHourlyRate, 208);   // $260 − 20%
});

test('recurringRatesFor: discount stacks on the attendee tier (60+ band)', () => {
  const rates = recurringRatesFor(70, [weeklySlot(2)]);
  assert.equal(rates.hourlyRate, 124);           // $155 − 20%
  assert.equal(rates.saturdayHourlyRate, 256);   // $320 − 20%
});

test('recurringRatesFor: non-qualifying schedule keeps the full tiered rate', () => {
  const rates = recurringRatesFor(45, [weeklySlot(1)]); // 4 hrs/month min
  assert.equal(rates.volumeDiscountApplied, false);
  assert.equal(rates.hourlyRate, 125);
  assert.equal(rates.saturdayHourlyRate, 260);
});

test('discount constants: 20% at 8 hours/month', () => {
  assert.equal(RECURRING_VOLUME_DISCOUNT, 0.20);
  assert.equal(RECURRING_VOLUME_DISCOUNT_MIN_MONTHLY_HOURS, 8);
});

// ---------- computeRecurringIntakePricing ----------
// August 2026: the 1st is a Saturday; Wednesdays fall on the 5th, 12th, 19th,
// and 26th. A start date of 2026-08-10 leaves 3 Wednesday occurrences.

test('intake pricing: qualifying weekly slot bills everything at the discounted rate', () => {
  const pricing = computeRecurringIntakePricing({
    slots: [weeklySlot(2, 3)], // Wednesdays, 2h weekly → 8 hrs/month guaranteed
    expectedAttendees: 25,
    startDate: '2026-08-10',
    paymentPreference: 'ach',
  });

  assert.equal(pricing.volumeDiscountApplied, true);
  assert.equal(pricing.hourlyRate, 76);
  assert.equal(pricing.monthlyMinHours, 8);
  assert.equal(pricing.monthlyMaxHours, 10);
  assert.equal(pricing.monthlyMinCharge, 8 * 76);   // $608
  assert.equal(pricing.monthlyMaxCharge, 10 * 76);  // $760
  assert.equal(pricing.firstMonthHours, 6);         // Aug 12, 19, 26 × 2h
  assert.equal(pricing.firstMonthCharge, 6 * 76);   // $456
  assert.equal(pricing.firstMonthFee, 0);           // ACH — no card fee
  assert.equal(pricing.firstMonthTotal, 456);
  assert.equal(pricing.weeklyHours, 2);
  assert.equal(pricing.hasSaturdaySlot, false);
});

test('intake pricing: card payment adds the 3% fee on the discounted charge', () => {
  const pricing = computeRecurringIntakePricing({
    slots: [weeklySlot(2, 3)],
    expectedAttendees: 25,
    startDate: '2026-08-10',
    paymentPreference: 'card',
  });
  assert.equal(pricing.firstMonthFee, Math.round(456 * 0.03)); // $14
  assert.equal(pricing.firstMonthTotal, 456 + 14);
});

test('intake pricing: Saturday slots bill at the discounted Saturday band rate', () => {
  const pricing = computeRecurringIntakePricing({
    slots: [weeklySlot(2, 6)], // Saturdays, 2h weekly
    expectedAttendees: 25,
    startDate: '2026-08-01', // Saturdays: 1, 8, 15, 22, 29 → 5 occurrences
    paymentPreference: 'ach',
  });
  assert.equal(pricing.hasSaturdaySlot, true);
  assert.equal(pricing.saturdayHourlyRate, 160);
  assert.equal(pricing.monthlyMinCharge, 8 * 160);   // $1280
  assert.equal(pricing.firstMonthHours, 10);
  assert.equal(pricing.firstMonthCharge, 10 * 160);  // $1600
});

test('intake pricing: non-qualifying schedule keeps the full tiered rate', () => {
  const pricing = computeRecurringIntakePricing({
    slots: [weeklySlot(1.5, 3)], // 6 hrs/month guaranteed — under the threshold
    expectedAttendees: 45,
    startDate: '2026-08-10',
    paymentPreference: 'ach',
  });
  assert.equal(pricing.volumeDiscountApplied, false);
  assert.equal(pricing.hourlyRate, 125);
  assert.equal(pricing.firstMonthCharge, 3 * 1.5 * 125); // $562.50
});

test('intake pricing: renter-chosen skip exceptions reduce the first-month charge', () => {
  const pricing = computeRecurringIntakePricing({
    slots: [weeklySlot(2, 3)],
    expectedAttendees: 25,
    startDate: '2026-08-10',
    exceptions: [{ date: '2026-08-12', action: 'skip' }],
    paymentPreference: 'ach',
  });
  assert.equal(pricing.firstMonthHours, 4);        // Aug 19 + 26 only
  assert.equal(pricing.firstMonthCharge, 4 * 76);  // $304
});

test('intake pricing: attendee tier and volume discount combine (45 guests)', () => {
  const pricing = computeRecurringIntakePricing({
    slots: [weeklySlot(2, 3)],
    expectedAttendees: 45,
    startDate: '2026-08-10',
    paymentPreference: 'ach',
  });
  assert.equal(pricing.hourlyRate, 100);            // $125 − 20%
  assert.equal(pricing.saturdayHourlyRate, 208);    // $260 − 20%
  assert.equal(pricing.firstMonthCharge, 6 * 100);  // $600
});
