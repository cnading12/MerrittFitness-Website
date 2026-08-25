// Pure pricing + scheduling helpers for one-off (single) bookings.
//
// Extracted from app/api/booking-request/route.js so the rules can be unit
// tested without spinning up Supabase, Stripe, or the Next.js request layer.
// Behavior is intentionally identical to the in-route version that shipped
// before this extraction — every rate, fee, threshold, and rounding rule is
// preserved. The route now imports these helpers instead of redefining them.

import { computeOccurrences } from './recurring-occurrences.js';
// Used by calculateAccuratePricing below. Imported as well as re-exported —
// `export ... from` does not create a local binding.
import {
  lookupPromoCode,
  isPartnerPromoCode,
  isStaffingBilledPromoCode,
  waivesStaffCoveragePromoCode,
} from './promo-codes.js';

// Rate, fee and discount constants live in ./pricing-constants.js.
//
// They are split out because app/lib/venue-rates.ts (and through it the home
// page, a CLIENT component) needs the numbers for the marketing copy. Importing
// them from THIS module pulled VALID_PROMO_CODES below into the public
// JavaScript bundle — see the header of pricing-constants.js for the full
// story. Keep the numbers there and the promo codes here.
//
// Re-exported so every existing server-side importer of booking-pricing.js
// keeps working unchanged.
import {
  HOURLY_RATE,
  SATURDAY_RATE,
  RATE_TIER_INCREMENT,
  SATURDAY_RATE_INCREMENT,
  RATE_TIER_MID_THRESHOLD,
  RATE_TIER_HIGH_THRESHOLD,
  rateTierFor,
  hourlyRateFor,
  saturdayRateForWeekdayRate,
  RECURRING_VOLUME_DISCOUNT,
  RECURRING_VOLUME_DISCOUNT_MIN_MONTHLY_HOURS,
  ON_SITE_ASSISTANCE_FEE,
  EVENT_SUPERVISION_RATE,
  EVENT_SUPERVISION_GROUP_THRESHOLD,
  STRIPE_FEE_PERCENTAGE,
  TABLES_CHAIRS_FEE_SMALL,
  TABLES_CHAIRS_FEE_LARGE,
  TABLES_CHAIRS_GROUP_THRESHOLD,
  MAT_RENTAL_FEE,
  DIVIDER_REMOVAL_FEE,
  EXTENDED_BOOKING_DISCOUNT,
  EXTENDED_BOOKING_DISCOUNT_MIN_HOURS,
  EXTENDED_BOOKING_DISCOUNT_DESCRIPTION,
} from './pricing-constants.js';

export {
  HOURLY_RATE,
  SATURDAY_RATE,
  RATE_TIER_INCREMENT,
  SATURDAY_RATE_INCREMENT,
  RATE_TIER_MID_THRESHOLD,
  RATE_TIER_HIGH_THRESHOLD,
  rateTierFor,
  hourlyRateFor,
  saturdayRateForWeekdayRate,
  RECURRING_VOLUME_DISCOUNT,
  RECURRING_VOLUME_DISCOUNT_MIN_MONTHLY_HOURS,
  ON_SITE_ASSISTANCE_FEE,
  EVENT_SUPERVISION_RATE,
  EVENT_SUPERVISION_GROUP_THRESHOLD,
  STRIPE_FEE_PERCENTAGE,
  TABLES_CHAIRS_FEE_SMALL,
  TABLES_CHAIRS_FEE_LARGE,
  TABLES_CHAIRS_GROUP_THRESHOLD,
  MAT_RENTAL_FEE,
  DIVIDER_REMOVAL_FEE,
  EXTENDED_BOOKING_DISCOUNT,
  EXTENDED_BOOKING_DISCOUNT_MIN_HOURS,
  EXTENDED_BOOKING_DISCOUNT_DESCRIPTION,
};

// Guaranteed minimum hours in any calendar month for a set of recurring
// slots: weekly slots occur at least 4 times a month, biweekly at least
// twice, monthly exactly once. Mirrors calculateMonthlyHourRange().min on the
// booking page.
export function recurringMonthlyMinHours(slots) {
  if (!Array.isArray(slots)) return 0;
  return slots.reduce((sum, slot) => {
    const hours = parseFloat(slot?.durationHours) || 0;
    const minOccurrences = slot?.frequency === 'weekly' ? 4
      : slot?.frequency === 'biweekly' ? 2
      : 1;
    return sum + hours * minOccurrences;
  }, 0);
}

// True iff a recurring schedule qualifies for the automatic 20% volume
// discount: the slots guarantee 8+ hours every month.
export function recurringVolumeDiscountApplies(slots) {
  return recurringMonthlyMinHours(slots) >= RECURRING_VOLUME_DISCOUNT_MIN_MONTHLY_HOURS;
}

// Weekday + Saturday hourly rates for a recurring series: the attendee-tiered
// band rate (same tiers as single events), with the 20% volume discount
// applied when the schedule guarantees 8+ hrs/month. Returns both the billed
// and undiscounted rates so UIs and emails can show the markdown.
export function recurringRatesFor(attendees, slots) {
  const undiscountedHourlyRate = hourlyRateFor(attendees, false);
  const undiscountedSaturdayHourlyRate = hourlyRateFor(attendees, true);
  const monthlyMinHours = recurringMonthlyMinHours(slots);
  const volumeDiscountApplied =
    monthlyMinHours >= RECURRING_VOLUME_DISCOUNT_MIN_MONTHLY_HOURS;
  const factor = volumeDiscountApplied ? 1 - RECURRING_VOLUME_DISCOUNT : 1;
  return {
    hourlyRate: Math.round(undiscountedHourlyRate * factor * 100) / 100,
    saturdayHourlyRate: Math.round(undiscountedSaturdayHourlyRate * factor * 100) / 100,
    undiscountedHourlyRate,
    undiscountedSaturdayHourlyRate,
    volumeDiscountApplied,
    monthlyMinHours,
  };
}

// Total dollar charge for a month's recurring occurrences, applying the
// Saturday premium to any occurrence landing on a Saturday. `occurrences` is
// the array produced by computeOccurrences (each entry has a `date` and
// `hours`). Saturday occurrences bill at `saturdayRate`, all others at
// `weekdayRate`. Returns dollars rounded to the cent.
export function recurringOccurrencesAmount(occurrences, weekdayRate, saturdayRate) {
  if (!Array.isArray(occurrences)) return 0;
  const total = occurrences.reduce((sum, occ) => {
    const hours = Number(occ?.hours) || 0;
    const rate = isSaturday(occ?.date) ? saturdayRate : weekdayRate;
    return sum + hours * rate;
  }, 0);
  return Math.round(total * 100) / 100;
}

// Server-side recurring intake pricing. The booking page shows an estimate,
// but this is what actually gets persisted and billed — the API recomputes
// everything from the schedule itself rather than trusting client-sent
// numbers (matching how single events re-validate via
// calculateAccuratePricing). Rates are attendee-tiered and carry the 20%
// volume discount when the schedule qualifies (see recurringRatesFor).
//
// `schedule` = { slots, expectedAttendees, startDate, endDate?, exceptions?,
// paymentPreference }. Returns the pricing object persisted into
// recurring_details.pricing and echoed to the client.
export function computeRecurringIntakePricing(schedule) {
  const {
    slots = [],
    expectedAttendees,
    startDate,
    endDate = null,
    exceptions = [],
    paymentPreference = 'ach',
  } = schedule || {};

  const rates = recurringRatesFor(expectedAttendees, slots);
  const rateForSlot = (slot) =>
    Number(slot?.dayOfWeek) === 6 ? rates.saturdayHourlyRate : rates.hourlyRate;

  // Weekly-average hours: biweekly slots contribute half, monthly ≈ 1/4.33.
  const weeklyHours = slots.reduce((sum, slot) => {
    const hours = parseFloat(slot?.durationHours) || 0;
    const multiplier = slot?.frequency === 'weekly' ? 1
      : slot?.frequency === 'biweekly' ? 0.5
      : 1 / 4.33;
    return sum + hours * multiplier;
  }, 0);

  // Monthly hour/charge bands: weekly slots land 4–5× per month, biweekly
  // 2–3×, monthly exactly once. Saturday slots (dayOfWeek 6) use the Saturday
  // band rate.
  let monthlyMinHours = 0;
  let monthlyMaxHours = 0;
  let monthlyMinCharge = 0;
  let monthlyMaxCharge = 0;
  slots.forEach((slot) => {
    const hours = parseFloat(slot?.durationHours) || 0;
    const rate = rateForSlot(slot);
    const [minOcc, maxOcc] = slot?.frequency === 'weekly' ? [4, 5]
      : slot?.frequency === 'biweekly' ? [2, 3]
      : [1, 1];
    monthlyMinHours += hours * minOcc;
    monthlyMaxHours += hours * maxOcc;
    monthlyMinCharge += hours * minOcc * rate;
    monthlyMaxCharge += hours * maxOcc * rate;
  });

  // First (possibly partial) month: expand the actual occurrences from the
  // start date through month end with the same engine the monthly invoicer
  // uses, honoring any skip/reschedule exceptions the renter already chose.
  let firstMonthHours = 0;
  let firstMonthCharge = 0;
  const startMatch = typeof startDate === 'string' && startDate.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (startMatch) {
    const occurrences = computeOccurrences({ slots }, Number(startMatch[1]), Number(startMatch[2]), {
      startDate,
      endDate,
      exceptions,
    });
    firstMonthHours = occurrences.reduce((sum, occ) => sum + (Number(occ.hours) || 0), 0);
    firstMonthCharge = recurringOccurrencesAmount(occurrences, rates.hourlyRate, rates.saturdayHourlyRate);
  }

  const firstMonthFee = paymentPreference === 'card'
    ? Math.round(firstMonthCharge * (STRIPE_FEE_PERCENTAGE / 100))
    : 0;

  return {
    weeklyHours,
    monthlyMinHours,
    monthlyMaxHours,
    monthlyMinCharge: Math.round(monthlyMinCharge * 100) / 100,
    monthlyMaxCharge: Math.round(monthlyMaxCharge * 100) / 100,
    firstMonthHours,
    firstMonthCharge,
    firstMonthFee,
    firstMonthTotal: Math.round((firstMonthCharge + firstMonthFee) * 100) / 100,
    hourlyRate: rates.hourlyRate,
    saturdayHourlyRate: rates.saturdayHourlyRate,
    undiscountedHourlyRate: rates.undiscountedHourlyRate,
    undiscountedSaturdayHourlyRate: rates.undiscountedSaturdayHourlyRate,
    volumeDiscountApplied: rates.volumeDiscountApplied,
    volumeDiscountPercent: rates.volumeDiscountApplied ? RECURRING_VOLUME_DISCOUNT * 100 : 0,
    hasSaturdaySlot: slots.some((slot) => Number(slot?.dayOfWeek) === 6),
    paymentPreference,
  };
}

// Promo codes. The code STRINGS live in environment variables and are read by
// app/lib/promo-codes.js — they are NOT in this file, and must never be put
// back. This repository is public, so a code committed here is a code
// published to github.com, in the working tree and permanently in history.
// That is how two generations of codes leaked before the bundle was ever the
// problem. See the header of promo-codes.js for the full history.
//
// Re-exported here so the pricing engine and its callers keep one import.
export {
  validPromoCodes,
  lookupPromoCode,
  sponsoredPromoCodes,
  partnerPromoCodes,
  staffingBilledPromoCodes,
  isSponsoredPromoCode,
  isPartnerPromoCode,
  isStaffingBilledPromoCode,
  promoCodeAllowsDaytime,
  waivesStaffCoveragePromoCode,
  daytimeAllowedPromoCodes,
} from './promo-codes.js';

// True iff `dateString` (YYYY-MM-DD) lands on a Saturday in local time. Parses
// the parts directly so the result doesn't depend on the runtime timezone of
// whichever Vercel region serves the request.
export function isSaturday(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.getDay() === 6;
}

// True iff a booking starting at `startTime` (e.g. "6:00 PM") for
// `hoursRequested` hours finishes by 10 PM (22:00). The booking page enforces
// this at submit time and the API repeats the check so a hand-crafted POST
// can't slip past.
export function endsBy10PM(startTime, hoursRequested) {
  if (!startTime || !hoursRequested) return true;

  const [time, period] = String(startTime).split(' ');
  if (!time || !period) return false;
  const [hourStr, minStr] = time.split(':');
  let startHour = parseInt(hourStr, 10);
  const startMin = parseInt(minStr, 10) || 0;
  if (Number.isNaN(startHour)) return false;

  if (period === 'PM' && startHour !== 12) startHour += 12;
  else if (period === 'AM' && startHour === 12) startHour = 0;

  const startMinutes = startHour * 60 + startMin;
  const durationMinutes = parseFloat(hoursRequested) * 60;
  if (Number.isNaN(durationMinutes)) return false;
  const endMinutes = startMinutes + durationMinutes;

  const tenPMMinutes = 22 * 60;
  return endMinutes <= tenPMMinutes;
}

// Compute the totals for one or more single-event bookings sharing a contact.
// Mirrors the production rules:
//   * Guest-tiered base rate (see hourlyRateFor): $95/$125/$155 per hour on
//     weekdays for the 0–30 / 30–60 / 60+ attendee bands, and $200/$260/$320
//     on Saturdays. The Saturday premium is charged as a delta on top of the
//     weekday base for the same band.
//   * 2-hour minimum per booking unless the renter is recurring.
//   * Tables and chairs each add an equipment fee, per booking, scaled by group
//     size: <40 attendees = $25, 40+ = $50. Tables and chairs stack (a 60-person
//     event using both pays $50 + $50 = $100). Renters on the partnership code
//     partnership code are waived these fees entirely.
//   * Cafe/lounge divider removal adds a flat $1,000 per booking that requests
//     it (staff removes and reinstalls the glass/wood dividers). Never waived.
//   * On-site staff coverage rules:
//       - >=40 attendees: an on-site supervisor at $30/hr for the ENTIRE event
//         (no hour cap). REQUIRED for every renter who isn't an exempt recurring
//         partner.
//       - <40 attendees: first-hour onboarding/setup assistance, a flat $35
//         charged once per submission. This is a ONE-TIME FIRST-EVENT fee — it's
//         required only on the renter's first event. Renters who have been to
//         the space before (not their first event) are NOT charged it, though
//         they may opt in to first-hour assistance.
//     Supervision and the $35 onboarding fee are mutually exclusive — a
//     submission never pays for both.
//   * Recurring partners (renters on the 20% partnership code) are EXEMPT from
//     the >=40 supervisor coverage on repeat events. Everyone, partners
//     included, pays on their first event. A renter on a repeat event may still
//     opt in to the $35 onboarding help.
//   * Promo discount applies to the pre-discount subtotal; minHours is enforced.
//   * 8+ total hours automatically earn the 10% extended-booking discount (no
//     code). Discounts never stack — the largest single discount wins.
//   * Card adds a 3% surcharge; ACH does not.
//
// `clientPromoCode` is whatever the renter typed; we re-validate here rather
// than trusting the client. Returns the same shape the route used to build
// directly so the response payload is unchanged.
export function calculateAccuratePricing(bookings, contactInfo, clientPromoCode = '') {
  let totalHours = 0;
  let totalBookings = 0;
  let baseAmount = 0;
  let topHourlyRate = HOURLY_RATE; // Highest weekday band rate seen — used for display
  let saturdayCharges = 0;
  let onsiteAssistanceFee = 0;
  let eventSupervisionFee = 0;
  let eventSupervisionHours = 0;
  let tablesChairsFees = 0;
  let matRentalFee = 0;
  let matRentalCount = 0;
  let dividerRemovalFee = 0;
  let dividerRemovalCount = 0;

  // Recurring partners (booking with the partnership promo code) get the mat at
  // no charge; everyone else pays the flat fee per booking that uses it.
  const matWaived = isPartnerPromoCode(clientPromoCode);

  // A recurring partner is a renter on the 20% partnership code. They're exempt
  // from mandatory staff coverage, but the exemption does NOT apply to their
  // first event — everyone pays the first time. Being a returning renter alone
  // does not grant the exemption; only the partnership code does.
  const isRecurringPartner = isPartnerPromoCode(clientPromoCode);

  // The partnership code also waives the tables/chairs equipment
  // fees. Unlike the staff-coverage exemption, this waiver has no first-event
  // caveat — anyone on the partnership code pays no equipment fee.
  const waivesEquipmentFees = isPartnerPromoCode(clientPromoCode);
  // The community daytime code comps staff coverage outright — no Facility
  // Host charge and no first-hour onboarding fee, whatever the attendee count
  // and even on a first event. Unlike the partnership exemption below, it has
  // no first-event caveat: the code is issued by hand to renters we've already
  // spoken to, and the coverage it comps is a cost we're choosing to absorb to
  // make daytime programming happen.
  const waivesStaffCoverage = waivesStaffCoveragePromoCode(clientPromoCode);

  const exemptFromStaffCoverage =
    waivesStaffCoverage || (isRecurringPartner && contactInfo.isFirstEvent !== true);

  // The staffing-billed sponsorship code comps everything except
  // staff coverage — so staffing is always charged: small events carry the $35
  // first-hour onboarding even for returning renters who didn't opt in, and 40+
  // attendee events pay full-event supervision as usual.
  const staffingBilledSponsor = isStaffingBilledPromoCode(clientPromoCode);

  bookings.forEach((booking) => {
    let hours = parseFloat(booking.hoursRequested) || 0;
    const isSat = isSaturday(booking.selectedDate);
    const attendees = parseInt(booking.expectedAttendees, 10) || 0;

    if (!contactInfo.isRecurring && hours < 2) {
      hours = 2; // 2-hour minimum on single events
    }

    // Base venue time is billed at the weekday rate for the booking's guest
    // band; Saturdays add the band's Saturday premium as a separate surcharge.
    const weekdayRate = hourlyRateFor(attendees, false);
    baseAmount += hours * weekdayRate;
    if (weekdayRate > topHourlyRate) topHourlyRate = weekdayRate;

    if (isSat) {
      saturdayCharges += hours * (hourlyRateFor(attendees, true) - weekdayRate);
    }

    if (booking.needsMat) {
      matRentalCount++;
      if (!matWaived) matRentalFee += MAT_RENTAL_FEE;
    }

    // Cafe/lounge divider removal — flat fee per booking, never waived (see
    // DIVIDER_REMOVAL_FEE above).
    if (booking.needsDividerRemoval) {
      dividerRemovalCount++;
      dividerRemovalFee += DIVIDER_REMOVAL_FEE;
    }

    if (!exemptFromStaffCoverage && attendees >= EVENT_SUPERVISION_GROUP_THRESHOLD) {
      // Supervisor stays for the entire event — bill the full requested hours.
      eventSupervisionFee += hours * EVENT_SUPERVISION_RATE;
      eventSupervisionHours += hours;
    }

    // Tables / chairs equipment fees. Each item type is billed separately and
    // scaled by group size; they stack when both are used. Waived for renters on
    // the partnership code.
    if (!waivesEquipmentFees) {
      const equipmentFeePerItem = attendees >= TABLES_CHAIRS_GROUP_THRESHOLD
        ? TABLES_CHAIRS_FEE_LARGE
        : TABLES_CHAIRS_FEE_SMALL;
      if (booking.needsTables) tablesChairsFees += equipmentFeePerItem;
      if (booking.needsChairs) tablesChairsFees += equipmentFeePerItem;
    }

    totalHours += hours;
    totalBookings++;
  });

  // On-site (first-hour) onboarding assistance is mutually exclusive with the
  // supervisor and is a one-time first-event fee. Charge it once when no
  // supervision applied AND either it's the renter's first event (required), a
  // returning renter opted in, or the booking is on the staffing-billed
  // sponsorship code (staffing is mandatory on every sponsored event). Renters
  // who have been to the space before are not charged unless they opt in.
  // `waivesStaffCoverage` (the community daytime code) suppresses this fee
  // outright — it comps ALL staff coverage, so a first-event renter on that
  // code is not charged the onboarding hour either.
  if (
    !waivesStaffCoverage &&
    eventSupervisionFee === 0 &&
    (contactInfo.isFirstEvent === true || contactInfo.wantsOnsiteAssistance || staffingBilledSponsor)
  ) {
    onsiteAssistanceFee = ON_SITE_ASSISTANCE_FEE;
  }

  const preDiscountSubtotal =
    baseAmount + saturdayCharges + onsiteAssistanceFee + eventSupervisionFee + tablesChairsFees + matRentalFee + dividerRemovalFee;

  let promoDiscount = 0;
  let promoDescription = '';
  let validatedPromoCode = '';
  let sponsored = false;

  const promoData = lookupPromoCode(clientPromoCode);
  if (promoData) {
    if (promoData.minHours && totalHours < promoData.minHours) {
      // Silently ignored: the client surfaces an error already.
    } else {
      // Staffing-billed sponsorships discount everything EXCEPT staff
      // coverage: the onboarding / supervision fees stay payable in full.
      const discountBase = promoData.staffingBilled === true
        ? preDiscountSubtotal - onsiteAssistanceFee - eventSupervisionFee
        : preDiscountSubtotal;
      promoDiscount = Math.round(discountBase * promoData.discount);
      promoDescription = promoData.description;
      validatedPromoCode = clientPromoCode;
      sponsored = promoData.sponsored === true;
    }
  }

  // Automatic extended-booking discount: 8+ total hours → 10% off, no code
  // needed. Discounts never stack — the larger one wins, so a valid promo
  // code keeps precedence over the automatic discount whenever it's worth more.
  let extendedDiscountApplied = false;
  if (totalHours >= EXTENDED_BOOKING_DISCOUNT_MIN_HOURS) {
    const extendedDiscount = Math.round(preDiscountSubtotal * EXTENDED_BOOKING_DISCOUNT);
    if (extendedDiscount > promoDiscount) {
      promoDiscount = extendedDiscount;
      promoDescription = EXTENDED_BOOKING_DISCOUNT_DESCRIPTION;
      sponsored = false;
      extendedDiscountApplied = true;
      // Clearing the code here used to be right, because every code was a
      // discount and a losing discount is not "applied". The community daytime
      // code broke that: it discounts nothing (it buys ACCESS to the weekday
      // daytime window and comps staff coverage), so the extended discount
      // always beats it — and blanking the code would erase the only record of
      // WHY this booking was allowed into workspace hours, from the booking
      // row, the calendar badge and the staff email alike. So a code that was
      // never a discount survives; a code that lost on price still clears.
      if (promoData?.discount) validatedPromoCode = '';
    }
  }

  const subtotal = preDiscountSubtotal - promoDiscount;
  const stripeFee = contactInfo.paymentMethod === 'card'
    ? Math.round(subtotal * (STRIPE_FEE_PERCENTAGE / 100))
    : 0;
  const total = subtotal + stripeFee;

  return {
    totalHours,
    totalBookings,
    hourlyRate: topHourlyRate,
    baseAmount,
    saturdayCharges,
    onsiteAssistanceFee,
    eventSupervisionFee,
    eventSupervisionHours,
    tablesChairsFees,
    matRentalFee,
    matRentalCount,
    matWaived: matWaived && matRentalCount > 0,
    dividerRemovalFee,
    dividerRemovalCount,
    isFirstEvent: contactInfo.isFirstEvent,
    isRecurringPartner,
    wantsOnsiteAssistance: contactInfo.wantsOnsiteAssistance,
    preDiscountSubtotal,
    promoCode: validatedPromoCode,
    promoDiscount,
    promoDescription,
    extendedDiscountApplied,
    sponsored,
    // True when the applied code is the staffing-billed sponsorship — the
    // subtotal is exactly the staff-coverage fee(s) and payment IS collected.
    staffingBilledSponsor: staffingBilledSponsor && validatedPromoCode !== '',
    subtotal,
    stripeFee,
    total,
    paymentMethod: contactInfo.paymentMethod,
  };
}

// Detect overlapping recurring slots that share a day-of-week. Two slots
// overlap when their [start, start+duration) intervals intersect on the same
// weekday — billing the renter twice for the same hour would otherwise be
// possible since each slot contributes hours independently to the monthly
// invoice. Returns an array of human-readable conflict strings (empty = OK).
export function findRecurringSlotConflicts(slots) {
  if (!Array.isArray(slots) || slots.length < 2) return [];

  const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const toMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [time, period] = String(timeStr).split(' ');
    if (!time || !period) return null;
    const [h, m] = time.split(':').map(Number);
    let hour = h;
    if (period === 'PM' && hour !== 12) hour += 12;
    else if (period === 'AM' && hour === 12) hour = 0;
    if (Number.isNaN(hour)) return null;
    return hour * 60 + (Number.isNaN(m) ? 0 : m);
  };

  const conflicts = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (Number(a.dayOfWeek) !== Number(b.dayOfWeek)) continue;

      // Different cadences (weekly vs biweekly etc.) can co-exist on the same
      // weekday only if their time windows don't intersect — the cadence
      // doesn't matter when they do, because eventually both fall on the same
      // calendar date and the hours stack.
      const aStart = toMinutes(a.startTime);
      const bStart = toMinutes(b.startTime);
      if (aStart == null || bStart == null) continue;
      const aEnd = aStart + (Number(a.durationHours) || 0) * 60;
      const bEnd = bStart + (Number(b.durationHours) || 0) * 60;

      const overlap = aStart < bEnd && bStart < aEnd;
      if (overlap) {
        const day = DAY_LABELS[Number(a.dayOfWeek)] || 'Day';
        conflicts.push(
          `Slots ${i + 1} and ${j + 1} overlap on ${day} (${a.startTime} for ${a.durationHours}h vs. ${b.startTime} for ${b.durationHours}h)`
        );
      }
    }
  }
  return conflicts;
}
