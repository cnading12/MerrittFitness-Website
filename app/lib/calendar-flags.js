// Pure helpers for deciding which staff-attention flags show on a calendar
// booking, and which Google Calendar color the event should use. Kept free of
// googleapis / Supabase imports so tests can exercise it without those deps.
//
// The flags the manager cares about (per business rules):
//   1. Paid event supervision (>=40 attendees, non-exempt renter) → mandatory
//      SUPERVISION badge — supervisor stays for the entire event.
//   2. First event + paid on-site assistance → "FIRST EVENT" badge
//   3. Any other paid on-site (first-hour onboarding) assistance → "ON-SITE
//      ASSIST" badge
//   4. Paid setup / breakdown → "SETUP" / "BREAKDOWN" / combined badge
//   5. Full-floor mat → "MAT — STAFF SETUP" (paid) or "MAT (renter setup)"
//      (comped for a partner)
//
// Whether coverage is required is decided by the pricing engine, so these flags
// key off the persisted fees (event_supervision_fee / onsite_assistance_fee)
// rather than re-deriving the first-event / partner rules here.
//
// Tag ordering matters: supervision is the highest-stakes flag, so it goes
// first to stay visible even when calendar grid views truncate the title.

// Mirrors EVENT_SUPERVISION_GROUP_THRESHOLD in app/lib/booking-pricing.js. Kept
// duplicated so this module stays dependency-free; the booking-pricing tests
// still guard the canonical value.
export const SUPERVISION_GROUP_THRESHOLD = 40;

// Codes that comp the entire booking (no payment collected). Mirrors
// SPONSORED_PROMO_CODES in app/lib/booking-pricing.js — duplicated here so this
// module stays dependency-free (same rationale as SUPERVISION_GROUP_THRESHOLD).
export const SPONSORED_PROMO_CODES = ['MerrittSponsor100'];

// A booking is "sponsored" when it was comped via a sponsored promo code (or an
// explicit is_sponsored flag, if the column is ever added). Derived from the
// stored promo_code so the calendar / emails don't depend on a DB migration.
export function isSponsoredBooking(booking) {
  if (!booking) return false;
  if (booking.is_sponsored === true) return true;
  const code = (booking.promo_code || '').trim();
  return SPONSORED_PROMO_CODES.includes(code);
}

export function buildStaffAttentionFlags(booking) {
  const flags = [];
  if (!booking) return flags;

  const isFirstEvent = booking.is_first_event === true;
  const attendees = parseInt(booking.expected_attendees, 10) || 0;
  const supervisionFee = parseFloat(booking.event_supervision_fee) || 0;
  const supervisionHours =
    parseFloat(booking.event_supervision_hours) ||
    parseFloat(booking.hours_requested) ||
    0;
  const onsiteFee = parseFloat(booking.onsite_assistance_fee) || 0;
  const needsSetup = booking.needs_setup_help === true;
  const needsTeardown = booking.needs_teardown_help === true;
  const needsMat = booking.needs_mat === true;
  const matFee = parseFloat(booking.mat_rental_fee) || 0;

  // The pricing engine only charges a supervision fee when an on-site
  // supervisor is required, so the fee is the authoritative trigger.
  const supervisionTriggered = supervisionFee > 0;
  const hoursLabel = supervisionHours > 0 ? `the entire ${supervisionHours}hr event` : 'the entire event';

  if (supervisionTriggered) {
    flags.push({
      tag: '🛡️ SUPERVISION REQUIRED',
      detail:
        `MANDATORY ON-SITE SUPERVISION — ${attendees} expected attendees ` +
        `(threshold ${SUPERVISION_GROUP_THRESHOLD}+). Staff must be present for ` +
        `${hoursLabel}. Supervision fee paid: $${supervisionFee.toFixed(2)}.`,
    });
  } else if (isFirstEvent && onsiteFee > 0) {
    flags.push({
      tag: '🌟 FIRST EVENT — ON-SITE ASSIST',
      detail:
        `FIRST EVENT for this renter. First-hour onboarding/setup assistance ` +
        `has been paid ($${onsiteFee.toFixed(2)}). Staff must be present to ` +
        `onboard them.`,
    });
  } else if (onsiteFee > 0) {
    flags.push({
      tag: '🤝 ON-SITE ASSIST',
      detail:
        `First-hour onboarding/setup assistance paid ($${onsiteFee.toFixed(2)}). ` +
        `Staff must be present for the first hour.`,
    });
  }

  if (needsSetup && needsTeardown) {
    flags.push({
      tag: '🏗️ SETUP + 🧹 BREAKDOWN',
      detail:
        'Setup AND breakdown assistance paid — staff handles both before and after.',
    });
  } else if (needsSetup) {
    flags.push({
      tag: '🏗️ SETUP',
      detail: 'Setup assistance paid — staff handles event setup.',
    });
  } else if (needsTeardown) {
    flags.push({
      tag: '🧹 BREAKDOWN',
      detail: 'Breakdown assistance paid — staff handles event teardown.',
    });
  }

  // Full-floor mat. When it's paid ($100) WE roll it out and break it down;
  // when it's comped for a partner the renter does. Either way, the work must
  // stay inside the renter's booked window so bookings can be stacked.
  if (needsMat) {
    if (matFee > 0) {
      flags.push({
        tag: '🟦 MAT — STAFF SETUP',
        detail:
          `Full-floor mat rented ($${matFee.toFixed(2)}). Staff rolls it out and ` +
          `breaks it down — entirely within the booked window (do not run over).`,
      });
    } else {
      flags.push({
        tag: '🟦 MAT (renter setup)',
        detail:
          'Full-floor mat in use — comped for partner. The renter handles their ' +
          'own setup and breakdown, within the booked window.',
      });
    }
  }

  // Sponsored bookings are comped — surface this front and center so staff
  // immediately understand no payment was collected. Unshifted to the front so
  // the SPONSORED badge stays visible even when the calendar grid truncates the
  // title.
  if (isSponsoredBooking(booking)) {
    flags.unshift({
      tag: '🎁 SPONSORED',
      detail:
        'SPONSORED EVENT — fully comped, no payment was collected. Treat as a ' +
        'confirmed reservation.',
    });
  }

  return flags;
}

// Google Calendar colorId values:
// https://developers.google.com/calendar/api/v3/reference/colors
// We pick the most attention-grabbing color when supervision is required,
// a softer alert when staff just needs to be present, and leave the default
// "booked" color when nothing extra is needed.
export function pickCalendarColorId(flags) {
  if (!flags || flags.length === 0) return '11'; // Tomato — default booked
  const hasSponsored = flags.some((f) => f.tag.includes('SPONSORED'));
  if (hasSponsored) return '10';                 // Basil — comped / sponsored
  const hasSupervision = flags.some((f) => f.tag.includes('SUPERVISION'));
  if (hasSupervision) return '4';                // Flamingo — strongest alert
  const hasOnsite = flags.some(
    (f) => f.tag.includes('ASSIST') || f.tag.includes('FIRST EVENT')
  );
  if (hasOnsite) return '6';                     // Tangerine — staff present
  return '5';                                    // Banana — setup/breakdown only
}
