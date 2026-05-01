// Tests for the single-event pricing engine and the recurring-slot overlap
// detector. Both live in app/lib/booking-pricing.js and feed
// app/api/booking-request/route.js. Each test uses literal numbers from the
// rental rules so a regression that changes a rate or fee causes a clear,
// human-readable failure.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isSaturday,
  endsBy10PM,
  calculateAccuratePricing,
  findRecurringSlotConflicts,
  HOURLY_RATE,
  SATURDAY_RATE,
  ON_SITE_ASSISTANCE_FEE,
  EVENT_SUPERVISION_RATE,
  EVENT_SUPERVISION_MAX_HOURS,
} from '../app/lib/booking-pricing.js';

// ---------- isSaturday ----------

test('isSaturday: detects a known Saturday', () => {
  // 2026-01-03 is a Saturday.
  assert.equal(isSaturday('2026-01-03'), true);
});

test('isSaturday: returns false for non-Saturdays', () => {
  assert.equal(isSaturday('2026-01-02'), false); // Friday
  assert.equal(isSaturday('2026-01-04'), false); // Sunday
  assert.equal(isSaturday('2026-11-04'), false); // Wednesday
});

test('isSaturday: rejects invalid input safely', () => {
  assert.equal(isSaturday(''), false);
  assert.equal(isSaturday(null), false);
  assert.equal(isSaturday(undefined), false);
  assert.equal(isSaturday('not-a-date'), false);
});

// ---------- endsBy10PM ----------

test('endsBy10PM: 6 PM start with 4 hours ends exactly at 10 PM', () => {
  assert.equal(endsBy10PM('6:00 PM', 4), true);
});

test('endsBy10PM: 8 PM start with 2 hours ends at 10 PM', () => {
  assert.equal(endsBy10PM('8:00 PM', 2), true);
});

test('endsBy10PM: 8 PM start with 2.5 hours runs past 10 PM', () => {
  assert.equal(endsBy10PM('8:00 PM', 2.5), false);
});

test('endsBy10PM: 12:00 PM (noon) start with 4 hours stays within window', () => {
  assert.equal(endsBy10PM('12:00 PM', 4), true);
});

test('endsBy10PM: 12:00 AM (midnight) start with 1 hour stays within window', () => {
  assert.equal(endsBy10PM('12:00 AM', 1), true);
});

test('endsBy10PM: half-hour start times are handled', () => {
  assert.equal(endsBy10PM('9:30 PM', 0.5), true);
  assert.equal(endsBy10PM('9:30 PM', 0.6), false); // 10:06 PM
});

test('endsBy10PM: returns true when inputs are missing (validated elsewhere)', () => {
  assert.equal(endsBy10PM('', 2), true);
  assert.equal(endsBy10PM('6:00 PM', 0), true);
});

// ---------- calculateAccuratePricing — single weekday booking ----------

test('pricing: weekday, 2 hours, returning renter, ACH = $190 even', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 10 }],
    { isFirstEvent: false, wantsOnsiteAssistance: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.totalHours, 2);
  assert.equal(result.baseAmount, 2 * HOURLY_RATE);
  assert.equal(result.saturdayCharges, 0);
  assert.equal(result.onsiteAssistanceFee, 0);
  assert.equal(result.eventSupervisionFee, 0);
  assert.equal(result.subtotal, 190);
  assert.equal(result.stripeFee, 0);
  assert.equal(result.total, 190);
});

test('pricing: card adds 3% Stripe fee on top of subtotal', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 10 }],
    { isFirstEvent: false, wantsOnsiteAssistance: false, paymentMethod: 'card' },
    ''
  );
  // 190 * 0.03 = 5.7 -> rounded to 6
  assert.equal(result.stripeFee, 6);
  assert.equal(result.total, 196);
});

// ---------- 2-hour minimum ----------

test('pricing: 1-hour booking is bumped to the 2-hour single-event minimum', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 1, expectedAttendees: 5 }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.totalHours, 2);
  assert.equal(result.subtotal, 190);
});

test('pricing: minimum does NOT apply when isRecurring=true', () => {
  // Recurring path bypasses the 2-hour floor since per-occurrence durations
  // are validated by the recurring schema instead.
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 1, expectedAttendees: 5 }],
    { isRecurring: true, isFirstEvent: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.totalHours, 1);
  assert.equal(result.subtotal, HOURLY_RATE);
});

// ---------- Saturday surcharge ----------

test('pricing: Saturday booking charges $200/hr', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-01-03', hoursRequested: 3, expectedAttendees: 5 }], // Saturday
    { isFirstEvent: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.totalHours, 3);
  assert.equal(result.baseAmount, 3 * HOURLY_RATE); // $285 base
  assert.equal(result.saturdayCharges, 3 * (SATURDAY_RATE - HOURLY_RATE)); // +$315 surcharge
  assert.equal(result.subtotal, 3 * SATURDAY_RATE); // $600 total
  assert.equal(result.total, 600);
});

// ---------- On-site assistance vs. event supervision ----------

test('pricing: first-time renter under 40 attendees pays $35 on-site assistance', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 20 }],
    { isFirstEvent: true, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.onsiteAssistanceFee, ON_SITE_ASSISTANCE_FEE);
  assert.equal(result.eventSupervisionFee, 0);
  assert.equal(result.subtotal, 190 + 35);
});

test('pricing: returning renter who opts in pays $35 on-site assistance', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 20 }],
    { isFirstEvent: false, wantsOnsiteAssistance: true, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.onsiteAssistanceFee, ON_SITE_ASSISTANCE_FEE);
  assert.equal(result.subtotal, 190 + 35);
});

test('pricing: returning renter who declines is NOT charged on-site assistance', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 20 }],
    { isFirstEvent: false, wantsOnsiteAssistance: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.onsiteAssistanceFee, 0);
  assert.equal(result.subtotal, 190);
});

test('pricing: first-event with 40+ attendees triggers $30/hr facility host (capped at 4 hrs)', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 6, expectedAttendees: 60 }],
    { isFirstEvent: true, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.eventSupervisionHours, EVENT_SUPERVISION_MAX_HOURS); // capped at 4
  assert.equal(result.eventSupervisionFee, EVENT_SUPERVISION_MAX_HOURS * EVENT_SUPERVISION_RATE); // $120
  // Facility host and on-site assistance are mutually exclusive.
  assert.equal(result.onsiteAssistanceFee, 0);
});

test('pricing: facility host scales to actual hours when below the 4-hour cap', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 3, expectedAttendees: 40 }],
    { isFirstEvent: true, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.eventSupervisionHours, 3);
  assert.equal(result.eventSupervisionFee, 3 * EVENT_SUPERVISION_RATE); // $90
});

test('pricing: 40+ attendees on a RETURNING renter does NOT trigger facility host', () => {
  // The supervision rule is gated on isFirstEvent=true. Returning renters are
  // assumed to know the venue.
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 3, expectedAttendees: 60 }],
    { isFirstEvent: false, wantsOnsiteAssistance: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.eventSupervisionFee, 0);
  assert.equal(result.onsiteAssistanceFee, 0);
});

test('pricing: 39 attendees first-event is below the supervision threshold', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 3, expectedAttendees: 39 }],
    { isFirstEvent: true, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.eventSupervisionFee, 0);
  assert.equal(result.onsiteAssistanceFee, ON_SITE_ASSISTANCE_FEE);
});

// ---------- Setup / teardown fees ----------

test('pricing: setup help adds $50; teardown adds $50; both add $100', () => {
  const both = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5,
       needsSetupHelp: true, needsTeardownHelp: true }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(both.setupTeardownFees, 100);

  const setupOnly = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5,
       needsSetupHelp: true, needsTeardownHelp: false }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(setupOnly.setupTeardownFees, 50);
});

// ---------- Promo codes ----------

test('pricing: MerrittMagic discounts the pre-discount subtotal by 20%', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5 }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    'MerrittMagic'
  );
  assert.equal(result.preDiscountSubtotal, 190);
  assert.equal(result.promoDiscount, 38); // 20% of 190
  assert.equal(result.subtotal, 152);
  assert.equal(result.promoCode, 'MerrittMagic');
});

test('pricing: EXTENDED15 is rejected when total hours < 8', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 4, expectedAttendees: 5 }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    'EXTENDED15'
  );
  assert.equal(result.promoDiscount, 0);
  assert.equal(result.promoCode, '');
});

test('pricing: EXTENDED15 applies once total hours reaches 8', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 8, expectedAttendees: 5 }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    'EXTENDED15'
  );
  // 8 hrs * $95 = $760, 15% = $114.
  assert.equal(result.preDiscountSubtotal, 760);
  assert.equal(result.promoDiscount, 114);
  assert.equal(result.subtotal, 646);
  assert.equal(result.promoCode, 'EXTENDED15');
});

test('pricing: invalid promo codes are silently ignored, not errored', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5 }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    'NOPE2025'
  );
  assert.equal(result.promoDiscount, 0);
  assert.equal(result.promoCode, '');
  assert.equal(result.subtotal, 190);
});

// ---------- Multi-booking aggregation ----------

test('pricing: multi-booking sums hours and applies fees once per submission', () => {
  // Three bookings on weekdays, returning renter who wants assistance. The
  // $35 on-site fee is charged once (not per booking).
  const result = calculateAccuratePricing(
    [
      { selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5 },
      { selectedDate: '2026-11-05', hoursRequested: 3, expectedAttendees: 5 },
      { selectedDate: '2026-11-06', hoursRequested: 4, expectedAttendees: 5 },
    ],
    { isFirstEvent: false, wantsOnsiteAssistance: true, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.totalBookings, 3);
  assert.equal(result.totalHours, 9);
  assert.equal(result.baseAmount, 9 * HOURLY_RATE);
  assert.equal(result.onsiteAssistanceFee, ON_SITE_ASSISTANCE_FEE);
  assert.equal(result.subtotal, 9 * HOURLY_RATE + ON_SITE_ASSISTANCE_FEE);
});

test('pricing: setup/teardown fees DO accumulate per booking', () => {
  // Setup/teardown is a per-event need, so multi-booking sums the fees.
  const result = calculateAccuratePricing(
    [
      { selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5,
        needsSetupHelp: true, needsTeardownHelp: true },
      { selectedDate: '2026-11-05', hoursRequested: 2, expectedAttendees: 5,
        needsSetupHelp: true, needsTeardownHelp: false },
    ],
    { isFirstEvent: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.setupTeardownFees, 50 + 50 + 50);
});

test('pricing: mixed weekday + Saturday correctly applies surcharge only once', () => {
  const result = calculateAccuratePricing(
    [
      { selectedDate: '2026-01-02', hoursRequested: 2, expectedAttendees: 5 }, // Friday
      { selectedDate: '2026-01-03', hoursRequested: 2, expectedAttendees: 5 }, // Saturday
    ],
    { isFirstEvent: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.totalHours, 4);
  // 2 Saturday hours * ($200 - $95) = $210 surcharge.
  assert.equal(result.saturdayCharges, 2 * (SATURDAY_RATE - HOURLY_RATE));
  // Base 4 * 95 = $380, plus $210 surcharge = $590.
  assert.equal(result.subtotal, 4 * HOURLY_RATE + 2 * (SATURDAY_RATE - HOURLY_RATE));
});

// ---------- findRecurringSlotConflicts ----------

test('slot conflicts: empty / single slot is never a conflict', () => {
  assert.deepEqual(findRecurringSlotConflicts([]), []);
  assert.deepEqual(
    findRecurringSlotConflicts([
      { dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
    ]),
    []
  );
});

test('slot conflicts: same day, overlapping windows is a conflict', () => {
  const conflicts = findRecurringSlotConflicts([
    { dayOfWeek: 1, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },   // 6–8 PM
    { dayOfWeek: 1, startTime: '7:00 PM', durationHours: 2, frequency: 'weekly' },   // 7–9 PM
  ]);
  assert.equal(conflicts.length, 1);
  assert.match(conflicts[0], /Monday/);
});

test('slot conflicts: same day, back-to-back (touching, not overlapping) is OK', () => {
  // 6–8 PM and 8–10 PM share an instant but neither owns 8:00 itself.
  const conflicts = findRecurringSlotConflicts([
    { dayOfWeek: 1, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
    { dayOfWeek: 1, startTime: '8:00 PM', durationHours: 2, frequency: 'weekly' },
  ]);
  assert.deepEqual(conflicts, []);
});

test('slot conflicts: different weekdays never conflict', () => {
  const conflicts = findRecurringSlotConflicts([
    { dayOfWeek: 1, startTime: '6:00 PM', durationHours: 4, frequency: 'weekly' },
    { dayOfWeek: 2, startTime: '6:00 PM', durationHours: 4, frequency: 'weekly' },
  ]);
  assert.deepEqual(conflicts, []);
});

test('slot conflicts: weekly + biweekly on same weekday + same window IS a conflict', () => {
  // Cadence doesn't matter — the dates eventually collide and the hours stack.
  const conflicts = findRecurringSlotConflicts([
    { dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
    { dayOfWeek: 3, startTime: '6:30 PM', durationHours: 2, frequency: 'biweekly' },
  ]);
  assert.equal(conflicts.length, 1);
});

test('slot conflicts: detects multiple distinct overlaps', () => {
  const conflicts = findRecurringSlotConflicts([
    { dayOfWeek: 1, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
    { dayOfWeek: 1, startTime: '7:00 PM', durationHours: 2, frequency: 'weekly' },
    { dayOfWeek: 1, startTime: '7:30 PM', durationHours: 1, frequency: 'weekly' },
  ]);
  // Slots 1&2, 1&3, 2&3 all overlap.
  assert.equal(conflicts.length, 3);
});
