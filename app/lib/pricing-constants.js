// Rate, fee and discount constants — the numbers, and nothing else.
//
// WHY THIS MODULE IS SEPARATE FROM booking-pricing.js
//
// The marketing pages must never hardcode a dollar figure (a rate change in
// the engine has to update the copy automatically), so app/lib/venue-rates.ts
// imports these constants — and venue-rates is reachable from `app/page.tsx`,
// which is a CLIENT component. Anything venue-rates imports is therefore
// compiled into the public JavaScript bundle, transitively.
//
// venue-rates used to import straight from booking-pricing.js, which also
// holds VALID_PROMO_CODES. That dragged the entire promo dictionary into
// /_next/static — including the code that comps a booking 100%, skips Stripe,
// self-confirms and books the live calendar. Reading devtools on the HOME PAGE
// was enough to rent the venue for free. (Tree-shaking did not save us: the
// derived `Object.entries(VALID_PROMO_CODES)` lists kept the dictionary alive.)
//
// So the split is a security boundary, not tidiness:
//
//   pricing-constants.js  — safe to ship to a browser. Numbers only.
//   booking-pricing.js    — SERVER ONLY. Promo codes, pricing engine.
//
// RULES
//   * Never import booking-pricing.js from venue-rates.ts, a `use client`
//     component, or anything either of them imports.
//   * Never put a promo code, secret, or anything else non-public in here.
//
// booking-pricing.js re-exports everything below, so server-side callers and
// tests can keep importing from either module.
// tests/promo-code-privacy.test.mjs walks the client import graph and fails if
// a promo code becomes reachable from a client component again.

// Pricing constants. Mirror the "Important Rental Information" copy on the
// booking page. Changing any of these without updating the UI copy will create
// a discrepancy between what the renter sees and what they're charged, so
// always update both.
export const HOURLY_RATE = 95;            // Base weekday rate (0–30 guests)
export const SATURDAY_RATE = 200;         // Base Saturday rate (0–30 guests)

// Guest-based rate tiers. The venue prices in three attendee bands and each
// band up adds a fixed increment to the base hourly rate. On Saturdays the
// per-band increment doubles (on top of the higher Saturday base), so large
// Saturday events scale up twice as fast:
//
//   Guests   Weekday   Saturday
//   ------    -------   --------
//   0–30      $95       $200
//   30–60     $125      $260
//   60+       $155      $320
//
// Thresholds use >= (matching the supervision/equipment thresholds below), so a
// 30-guest event sits in the middle band and a 60-guest event in the top band.
export const RATE_TIER_INCREMENT = 30;       // Per-band increase, weekdays
export const SATURDAY_RATE_INCREMENT = 60;   // Per-band increase, Saturdays
export const RATE_TIER_MID_THRESHOLD = 30;   // >= this many guests → middle band
export const RATE_TIER_HIGH_THRESHOLD = 60;  // >= this many guests → top band

// Number of rate bands above the base for `attendees` guests: 0, 1, or 2.
export function rateTierFor(attendees) {
  const n = parseInt(attendees, 10) || 0;
  if (n >= RATE_TIER_HIGH_THRESHOLD) return 2;
  if (n >= RATE_TIER_MID_THRESHOLD) return 1;
  return 0;
}

// Hourly rate for a booking with `attendees` guests, on a Saturday or a weekday.
export function hourlyRateFor(attendees, isSat = false) {
  const tier = rateTierFor(attendees);
  return isSat
    ? SATURDAY_RATE + tier * SATURDAY_RATE_INCREMENT
    : HOURLY_RATE + tier * RATE_TIER_INCREMENT;
}
// Recurring volume discount. A recurring schedule whose slots guarantee at
// least 8 hours in EVERY calendar month (weekly slots land ≥4×, biweekly ≥2×,
// monthly 1×) automatically bills 20% off the attendee-tiered hourly rate —
// both the weekday and Saturday band rates. This mirrors the partnership
// partnership discount (also 20% for 8+ hrs/month) but applies itself: no
// promo code needed on the recurring application. The discount is decided
// once at intake from the schedule and baked into the stored rates, so every
// month bills at the discounted rate even in 5-week months.
export const RECURRING_VOLUME_DISCOUNT = 0.20;
export const RECURRING_VOLUME_DISCOUNT_MIN_MONTHLY_HOURS = 8;
// Recover the Saturday rate from a stored weekday band rate. Used by the
// monthly invoicer for older recurring records persisted before the Saturday
// rate was stored alongside the weekday rate.
export function saturdayRateForWeekdayRate(weekdayRate) {
  const tier = Math.max(
    0,
    Math.min(2, Math.round((Number(weekdayRate) - HOURLY_RATE) / RATE_TIER_INCREMENT)),
  );
  return SATURDAY_RATE + tier * SATURDAY_RATE_INCREMENT;
}
export const ON_SITE_ASSISTANCE_FEE = 35;          // First-hour onboarding/setup help (flat, once per submission)
export const EVENT_SUPERVISION_RATE = 30;          // $/hr for 40+ attendee events — billed for the ENTIRE event (no cap)
export const EVENT_SUPERVISION_GROUP_THRESHOLD = 40;
export const STRIPE_FEE_PERCENTAGE = 3;            // % surcharge for card payments

// Equipment fees for tables and chairs. Charged per item type, per booking, and
// scaled by group size. Renters on the partnership code are waived
// these fees entirely (see calculateAccuratePricing).
export const TABLES_CHAIRS_FEE_SMALL = 25;         // < 40 attendees, per item type (tables / chairs)
export const TABLES_CHAIRS_FEE_LARGE = 50;         // 40+ attendees, per item type (tables / chairs)
export const TABLES_CHAIRS_GROUP_THRESHOLD = 40;   // Attendee count that bumps each fee from $25 to $50

// Full-floor roll-out mat. One mat that fills the main hall, used for martial
// arts, yoga, sound baths, etc. Renters can add it per booking. A flat $100
// covers use of the mat PLUS our staff setting it up and breaking it down. The
// fee is waived for recurring partners (the partnership promo code — see
// isPartnerPromoCode below) — they use the mat for free but are then
// responsible for their own setup and breakdown. In every case the mat setup
// and breakdown happen INSIDE the renter's booked window (never before or after
// it) so bookings can be stacked back-to-back.
export const MAT_RENTAL_FEE = 100;                 // $/booking, waived for partners

// Cafe/lounge divider removal. Large glass-and-wood dividers separate the
// cafe/lounge from the main hall; renters can have them removed to open the
// two spaces into one for their event. A flat $1,000 per booking covers our
// staff removing the dividers — including breaking down all cafe tables and
// chairs — before the event, and restoring everything after.
// NOT waived for partners — unlike the mat, this is heavy specialty work with
// a real cost every time. (Sponsored promo codes still comp it along with the
// rest of the subtotal, same as every other line item.) Single-event bookings
// only — the recurring path has no per-add-on billing.
export const DIVIDER_REMOVAL_FEE = 1000;           // $/booking, flat

// Automatic extended-booking discount. Single-event submissions totalling 8+
// hours get 10% off the pre-discount subtotal — applied automatically, no
// promo code needed (this replaced the old EXTENDED15 promo code, which was
// 15% and code-gated). It does NOT stack with promo codes: whichever single
// discount is larger wins, and every current code (20% partner, 100%
// sponsored) beats 10%, so a valid code always takes precedence. Advertised
// in the "Important Rental Information" copy on the booking page — keep the
// UI copy in sync when changing these.
export const EXTENDED_BOOKING_DISCOUNT = 0.10;
export const EXTENDED_BOOKING_DISCOUNT_MIN_HOURS = 8;
export const EXTENDED_BOOKING_DISCOUNT_DESCRIPTION =
  `Extended Booking Discount (${EXTENDED_BOOKING_DISCOUNT * 100}% off, ${EXTENDED_BOOKING_DISCOUNT_MIN_HOURS}+ hours)`;