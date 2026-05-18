// Pure helpers for deciding which staff-attention flags show on a calendar
// booking, and which Google Calendar color the event should use. Kept free of
// googleapis / Supabase imports so tests can exercise it without those deps.
//
// The three flags the manager cares about (per business rules):
//   1. First event + paid on-site assistance → "FIRST EVENT" badge
//   2. First event with >=40 expected attendees → mandatory SUPERVISION
//      (4hr max) — supersedes the FIRST EVENT badge
//   3. Returning renter who opted into on-site assistance → "ON-SITE ASSIST"
//   4. Paid setup / breakdown → "SETUP" / "BREAKDOWN" / combined badge
//
// Tag ordering matters: supervision is the highest-stakes flag, so it goes
// first to stay visible even when calendar grid views truncate the title.

// Mirrors EVENT_SUPERVISION_GROUP_THRESHOLD in app/lib/booking-pricing.js. Kept
// duplicated so this module stays dependency-free; the booking-pricing tests
// still guard the canonical value.
export const SUPERVISION_GROUP_THRESHOLD = 40;
export const SUPERVISION_MAX_HOURS = 4;

export function buildStaffAttentionFlags(booking) {
  const flags = [];
  if (!booking) return flags;

  const isFirstEvent = booking.is_first_event === true;
  const attendees = parseInt(booking.expected_attendees, 10) || 0;
  const supervisionFee = parseFloat(booking.event_supervision_fee) || 0;
  const supervisionHours =
    parseFloat(booking.event_supervision_hours) || SUPERVISION_MAX_HOURS;
  const wantsOnsite = booking.wants_onsite_assistance === true;
  const onsiteFee = parseFloat(booking.onsite_assistance_fee) || 0;
  const needsSetup = booking.needs_setup_help === true;
  const needsTeardown = booking.needs_teardown_help === true;

  const supervisionTriggered =
    isFirstEvent && attendees >= SUPERVISION_GROUP_THRESHOLD;

  if (supervisionTriggered) {
    flags.push({
      tag: '🛡️ SUPERVISION REQUIRED',
      detail:
        `MANDATORY ON-SITE SUPERVISION — first-event renter with ${attendees} ` +
        `expected attendees (threshold ${SUPERVISION_GROUP_THRESHOLD}+). ` +
        `Staff must be present for up to ${supervisionHours}hr. ` +
        `Supervision fee paid: $${supervisionFee.toFixed(2)}.`,
    });
  } else if (isFirstEvent && onsiteFee > 0) {
    flags.push({
      tag: '🌟 FIRST EVENT — ON-SITE ASSIST',
      detail:
        `FIRST EVENT for this renter. On-site assistance has been paid ` +
        `($${onsiteFee.toFixed(2)}). Staff must be present to onboard them.`,
    });
  } else if (wantsOnsite && onsiteFee > 0) {
    flags.push({
      tag: '🤝 ON-SITE ASSIST',
      detail:
        `On-site assistance paid ($${onsiteFee.toFixed(2)}). ` +
        `Staff must be present during the event.`,
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

  return flags;
}

// Google Calendar colorId values:
// https://developers.google.com/calendar/api/v3/reference/colors
// We pick the most attention-grabbing color when supervision is required,
// a softer alert when staff just needs to be present, and leave the default
// "booked" color when nothing extra is needed.
export function pickCalendarColorId(flags) {
  if (!flags || flags.length === 0) return '11'; // Tomato — default booked
  const hasSupervision = flags.some((f) => f.tag.includes('SUPERVISION'));
  if (hasSupervision) return '4';                // Flamingo — strongest alert
  const hasOnsite = flags.some(
    (f) => f.tag.includes('ASSIST') || f.tag.includes('FIRST EVENT')
  );
  if (hasOnsite) return '6';                     // Tangerine — staff present
  return '5';                                    // Banana — setup/breakdown only
}
