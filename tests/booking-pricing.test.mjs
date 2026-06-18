// Tests for the single-event pricing engine and the recurring-slot overlap
// detector. Both live in app/lib/booking-pricing.js and feed
// app/api/booking-request/route.js. Each test uses literal numbers from the
// rental rules so a regression that changes a rate or fee causes a clear,
// human-readable failure.
//
// On-site staff coverage policy exercised below:
//   * >=40 attendees → on-site supervisor at $30/hr for the ENTIRE event (no cap).
//   * <40 attendees  → first-hour onboarding assistance, flat $35 once.
//   * Required for EVERY renter who isn't an exempt recurring partner.
//   * A recurring partner = the 20% partnership promo code (MerrittMagic). They
//     are exempt on repeat events, but pay on their first event like anyone.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isSaturday,
  endsBy10PM,
  calculateAccuratePricing,
  findRecurringSlotConflicts,
  isPartnerPromoCode,
  HOURLY_RATE,
  SATURDAY_RATE,
  ON_SITE_ASSISTANCE_FEE,
  EVENT_SUPERVISION_RATE,
  MAT_RENTAL_FEE,
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

// ---------- isPartnerPromoCode ----------

test('isPartnerPromoCode: MerrittMagic is the partnership (recurring-partner) code', () => {
  assert.equal(isPartnerPromoCode('MerrittMagic'), true);
});

test('isPartnerPromoCode: other codes and junk are not partner codes', () => {
  assert.equal(isPartnerPromoCode('EXTENDED15'), false);
  assert.equal(isPartnerPromoCode('MerrittSponsor100'), false);
  assert.equal(isPartnerPromoCode(''), false);
  assert.equal(isPartnerPromoCode(null), false);
});

// ---------- calculateAccuratePricing — single weekday booking ----------

test('pricing: weekday, 2 hours, returning non-partner pays base + required onboarding ($35)', () => {
  // A returning renter who is NOT a recurring partner still owes first-hour
  // onboarding assistance under the new policy.
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 10 }],
    { isFirstEvent: false, wantsOnsiteAssistance: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.totalHours, 2);
  assert.equal(result.baseAmount, 2 * HOURLY_RATE);
  assert.equal(result.saturdayCharges, 0);
  assert.equal(result.onsiteAssistanceFee, ON_SITE_ASSISTANCE_FEE);
  assert.equal(result.eventSupervisionFee, 0);
  assert.equal(result.subtotal, 190 + 35);
  assert.equal(result.stripeFee, 0);
  assert.equal(result.total, 225);
});

test('pricing: card adds 3% Stripe fee on top of subtotal', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 10 }],
    { isFirstEvent: false, wantsOnsiteAssistance: false, paymentMethod: 'card' },
    ''
  );
  // Subtotal 225 (190 + 35 onboarding). 225 * 0.03 = 6.75 -> rounded to 7.
  assert.equal(result.subtotal, 225);
  assert.equal(result.stripeFee, 7);
  assert.equal(result.total, 232);
});

// ---------- 2-hour minimum ----------

test('pricing: 1-hour booking is bumped to the 2-hour single-event minimum', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 1, expectedAttendees: 5 }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.totalHours, 2);
  assert.equal(result.baseAmount, 2 * HOURLY_RATE); // minimum applied to base
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
  assert.equal(result.baseAmount, HOURLY_RATE);
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
  // $600 venue time + $35 required onboarding.
  assert.equal(result.subtotal, 3 * SATURDAY_RATE + ON_SITE_ASSISTANCE_FEE);
});

// ---------- On-site assistance vs. event supervision ----------

test('pricing: first-time renter under 40 attendees pays $35 onboarding', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 20 }],
    { isFirstEvent: true, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.onsiteAssistanceFee, ON_SITE_ASSISTANCE_FEE);
  assert.equal(result.eventSupervisionFee, 0);
  assert.equal(result.subtotal, 190 + 35);
});

test('pricing: returning non-partner under 40 attendees is REQUIRED to pay $35 onboarding', () => {
  // New policy: being a returning renter no longer makes coverage optional.
  // wantsOnsiteAssistance is irrelevant — they owe it either way.
  const declined = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 20 }],
    { isFirstEvent: false, wantsOnsiteAssistance: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(declined.onsiteAssistanceFee, ON_SITE_ASSISTANCE_FEE);
  assert.equal(declined.subtotal, 190 + 35);
});

test('pricing: recurring partner on a repeat event is EXEMPT from onboarding', () => {
  // MerrittMagic = 20% partnership code = recurring partner. On a non-first
  // event they owe no coverage fee (just the 20% discount on base time).
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 20 }],
    { isFirstEvent: false, wantsOnsiteAssistance: false, paymentMethod: 'ach' },
    'MerrittMagic'
  );
  assert.equal(result.isRecurringPartner, true);
  assert.equal(result.onsiteAssistanceFee, 0);
  assert.equal(result.eventSupervisionFee, 0);
  assert.equal(result.preDiscountSubtotal, 190); // base only, no fee
  assert.equal(result.promoDiscount, 38); // 20% of 190
  assert.equal(result.subtotal, 152);
});

test('pricing: recurring partner who opts in still pays the $35 onboarding', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 20 }],
    { isFirstEvent: false, wantsOnsiteAssistance: true, paymentMethod: 'ach' },
    'MerrittMagic'
  );
  assert.equal(result.onsiteAssistanceFee, ON_SITE_ASSISTANCE_FEE);
  assert.equal(result.preDiscountSubtotal, 190 + 35);
});

test('pricing: recurring partner STILL pays for their first event', () => {
  // The exemption never applies to a first event — everyone pays the first time.
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 20 }],
    { isFirstEvent: true, wantsOnsiteAssistance: false, paymentMethod: 'ach' },
    'MerrittMagic'
  );
  assert.equal(result.isRecurringPartner, true);
  assert.equal(result.onsiteAssistanceFee, ON_SITE_ASSISTANCE_FEE);
  assert.equal(result.preDiscountSubtotal, 190 + 35);
});

test('pricing: first-event with 40+ attendees triggers $30/hr supervision for the ENTIRE event', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 6, expectedAttendees: 60 }],
    { isFirstEvent: true, paymentMethod: 'ach' },
    ''
  );
  // No 4-hour cap — supervisor covers all 6 hours.
  assert.equal(result.eventSupervisionHours, 6);
  assert.equal(result.eventSupervisionFee, 6 * EVENT_SUPERVISION_RATE); // $180
  // Supervision and the $35 onboarding fee are mutually exclusive.
  assert.equal(result.onsiteAssistanceFee, 0);
});

test('pricing: supervision scales to the full requested hours', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 3, expectedAttendees: 40 }],
    { isFirstEvent: true, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.eventSupervisionHours, 3);
  assert.equal(result.eventSupervisionFee, 3 * EVENT_SUPERVISION_RATE); // $90
});

test('pricing: 40+ attendees on a RETURNING NON-PARTNER DOES trigger supervision', () => {
  // New policy: returning status alone does not exempt anyone. A casual
  // returning renter with a large event still gets the supervisor.
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 3, expectedAttendees: 60 }],
    { isFirstEvent: false, wantsOnsiteAssistance: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.eventSupervisionHours, 3);
  assert.equal(result.eventSupervisionFee, 3 * EVENT_SUPERVISION_RATE); // $90
  assert.equal(result.onsiteAssistanceFee, 0);
});

test('pricing: 40+ attendees on a recurring partner repeat event is EXEMPT from supervision', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 3, expectedAttendees: 60 }],
    { isFirstEvent: false, wantsOnsiteAssistance: false, paymentMethod: 'ach' },
    'MerrittMagic'
  );
  assert.equal(result.eventSupervisionFee, 0);
  assert.equal(result.onsiteAssistanceFee, 0);
});

test('pricing: 40+ attendees on a recurring partner FIRST event still triggers supervision', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 3, expectedAttendees: 60 }],
    { isFirstEvent: true, wantsOnsiteAssistance: false, paymentMethod: 'ach' },
    'MerrittMagic'
  );
  assert.equal(result.eventSupervisionHours, 3);
  assert.equal(result.eventSupervisionFee, 3 * EVENT_SUPERVISION_RATE);
});

test('pricing: 39 attendees first-event takes the onboarding path, not supervision', () => {
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

// ---------- Full-floor mat rental ----------

test('mat: non-partner pays the flat $100 mat fee on top of the booking', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5, needsMat: true }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.matRentalFee, MAT_RENTAL_FEE); // $100
  assert.equal(result.matRentalCount, 1);
  assert.equal(result.matWaived, false);
  // 2 hrs * $95 = $190 base, + $100 mat, + $35 mandatory onboarding (non-partner,
  // <40 attendees, no supervision) = $325.
  assert.equal(result.onsiteAssistanceFee, ON_SITE_ASSISTANCE_FEE);
  assert.equal(result.preDiscountSubtotal, 190 + MAT_RENTAL_FEE + ON_SITE_ASSISTANCE_FEE);
  assert.equal(result.subtotal, 325);
});

test('mat: partner (MerrittMagic) uses the mat at no charge', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5, needsMat: true }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    'MerrittMagic'
  );
  assert.equal(result.matRentalFee, 0);   // waived for partners
  assert.equal(result.matRentalCount, 1); // still recorded as requested
  assert.equal(result.matWaived, true);
  // No mat fee in the subtotal: $190 base, 20% partnership discount = $38 off.
  assert.equal(result.preDiscountSubtotal, 190);
  assert.equal(result.promoDiscount, 38);
  assert.equal(result.subtotal, 152);
});

test('mat: fee accumulates per booking for non-partners', () => {
  const result = calculateAccuratePricing(
    [
      { selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5, needsMat: true },
      { selectedDate: '2026-11-05', hoursRequested: 2, expectedAttendees: 5, needsMat: true },
      { selectedDate: '2026-11-06', hoursRequested: 2, expectedAttendees: 5, needsMat: false },
    ],
    { isFirstEvent: false, paymentMethod: 'ach' },
    ''
  );
  assert.equal(result.matRentalCount, 2);
  assert.equal(result.matRentalFee, 2 * MAT_RENTAL_FEE); // $200
});

test('mat: not requested means no fee and matWaived stays false', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5 }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    'MerrittMagic'
  );
  assert.equal(result.matRentalFee, 0);
  assert.equal(result.matRentalCount, 0);
  assert.equal(result.matWaived, false); // waived flag only when a mat was actually requested
});

// ---------- Promo codes ----------

test('pricing: MerrittMagic discounts the pre-discount subtotal by 20% (partner exempt, base only)', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5 }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    'MerrittMagic'
  );
  assert.equal(result.preDiscountSubtotal, 190); // exempt partner → no onboarding fee
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

test('pricing: EXTENDED15 applies once total hours reaches 8 (not a partner code)', () => {
  const result = calculateAccuratePricing(
    [{ selectedDate: '2026-11-04', hoursRequested: 8, expectedAttendees: 5 }],
    { isFirstEvent: false, paymentMethod: 'ach' },
    'EXTENDED15'
  );
  // EXTENDED15 is NOT a recurring-partner code, so the $35 onboarding still
  // applies: 8 * $95 + $35 = $795 pre-discount, 15% = $119 (round(119.25)).
  assert.equal(result.isRecurringPartner, false);
  assert.equal(result.preDiscountSubtotal, 760 + 35);
  assert.equal(result.promoDiscount, 119);
  assert.equal(result.subtotal, 676);
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
  // Returning non-partner still owes the $35 onboarding fee.
  assert.equal(result.subtotal, 190 + 35);
});

// ---------- Multi-booking aggregation ----------

test('pricing: multi-booking sums hours and applies the onboarding fee once per submission', () => {
  // Three bookings on weekdays, returning non-partner. The $35 onboarding fee
  // is charged once (not per booking).
  const result = calculateAccuratePricing(
    [
      { selectedDate: '2026-11-04', hoursRequested: 2, expectedAttendees: 5 },
      { selectedDate: '2026-11-05', hoursRequested: 3, expectedAttendees: 5 },
      { selectedDate: '2026-11-06', hoursRequested: 4, expectedAttendees: 5 },
    ],
    { isFirstEvent: false, wantsOnsiteAssistance: false, paymentMethod: 'ach' },
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
  // Base 4 * 95 = $380, plus $210 surcharge, plus $35 required onboarding.
  assert.equal(
    result.subtotal,
    4 * HOURLY_RATE + 2 * (SATURDAY_RATE - HOURLY_RATE) + ON_SITE_ASSISTANCE_FEE
  );
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
