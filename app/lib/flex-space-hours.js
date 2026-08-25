// app/lib/flex-space-hours.js
//
// The weekday daytime window during which the main hall is NOT freely
// bookable, because Merritt Workspace next door is using the building.
//
// WHY THIS RULE EXISTS
//
// The two properties share a wall. A loud party, a concert, or a 100-person
// celebration in the main hall at 11 AM on a Tuesday lands directly on people
// who are next door trying to work — and they are paying members too. So the
// weekday daytime block belongs to the workspace by default.
//
// This is deliberately NOT a blanket ban. Daytime programming that BENEFITS
// both sides — a yoga class, a meditation sit, a workshop the members can walk
// into — is exactly what we want in that window. Those bookings are unlocked
// with a promo code we hand out after talking to the renter, which is what
// makes the difference between "quiet, collaborative, welcome" and "amplified
// DJ set" a human decision rather than something a form has to guess.
//
// WHY THIS MODULE HAS NO IMPORTS
//
// The booking page (app/book/page.tsx) is a `use client` component and has to
// render the restriction in the time picker, so it imports these helpers
// directly. Anything reachable from a client component ships in the public
// JavaScript bundle — which is why app/lib/promo-codes.js and
// app/lib/booking-pricing.js must never be imported from here (see the header
// of promo-codes.js for the three times a promo code leaked that way).
//
// So this file holds ONLY the window itself and the date/time math. Whether a
// given renter's code unlocks the window is decided server-side, by
// promoCodeAllowsDaytime() in app/lib/promo-codes.js; the client learns the
// answer as a boolean from /api/validate-promo and never sees a code.

// Window bounds, in minutes from midnight, Denver wall-clock.
export const FLEX_SPACE_START_MINUTES = 8 * 60;  // 8:00 AM
export const FLEX_SPACE_END_MINUTES = 16 * 60;   // 4:00 PM

// Days the window applies to, as JS day-of-week numbers (0 = Sunday).
// Monday through Friday: the workspace next door is a weekday operation, so
// Saturday and Sunday daytime stay freely bookable.
export const FLEX_SPACE_DAYS = [1, 2, 3, 4, 5];

// Human-readable forms, kept here so the UI copy, the API error message and
// the calendar badge can never drift from the numbers above.
export const FLEX_SPACE_WINDOW_LABEL = '8:00 AM to 4:00 PM';
export const FLEX_SPACE_DAYS_LABEL = 'Monday through Friday';
export const FLEX_SPACE_WINDOW_FULL_LABEL =
  `${FLEX_SPACE_WINDOW_LABEL}, ${FLEX_SPACE_DAYS_LABEL}`;

// Convert "H:MM AM/PM" (or a bare 24-hour "HH:MM") into minutes from
// midnight. Returns null when the string isn't a time — callers treat null as
// "can't evaluate", never as "allowed".
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  const period = match[3] ? match[3].toUpperCase() : null;
  if (period === 'PM' && hour !== 12) hour += 12;
  else if (period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

// True iff `dateString` (YYYY-MM-DD) falls on a day the window applies to.
// Parses the parts directly rather than going through Date parsing, so the
// answer doesn't depend on the timezone of whichever Vercel region serves the
// request — the same reason isSaturday() in booking-pricing.js does this.
export function isFlexSpaceDay(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return false;
  return FLEX_SPACE_DAYS.includes(date.getDay());
}

// True iff a booking of `hours` starting at `startTime` on `dateString` would
// run into the workspace window at all.
//
// Intervals are half-open — [start, end) against [8:00, 16:00) — so a booking
// that ENDS at exactly 8:00 AM and one that STARTS at exactly 4:00 PM are both
// clear. Those are the two handoff cases and they need to stay bookable.
export function overlapsFlexSpaceHours(dateString, startTime, hours) {
  if (!isFlexSpaceDay(dateString)) return false;

  const startMinutes = timeToMinutes(startTime);
  if (startMinutes === null) return false;

  const durationMinutes = Math.round((parseFloat(hours) || 0) * 60);
  if (durationMinutes <= 0) return false;
  const endMinutes = startMinutes + durationMinutes;

  return startMinutes < FLEX_SPACE_END_MINUTES && FLEX_SPACE_START_MINUTES < endMinutes;
}

// True iff a booking STARTING at this time on this date would land inside the
// window regardless of how long it runs. Used by the time picker to disable
// start times before a duration has even been chosen.
export function startsInFlexSpaceHours(dateString, startTime) {
  if (!isFlexSpaceDay(dateString)) return false;
  const startMinutes = timeToMinutes(startTime);
  if (startMinutes === null) return false;
  return startMinutes >= FLEX_SPACE_START_MINUTES && startMinutes < FLEX_SPACE_END_MINUTES;
}

// The one explanation of this rule, shared by the booking form, the API error
// response and the rental-information copy. Written to be read by a renter who
// has just been told no — so it says why, and says what to do next.
export const FLEX_SPACE_RESTRICTION_MESSAGE =
  `The main hall is reserved for Merritt Workspace ${FLEX_SPACE_WINDOW_LABEL}, ` +
  `${FLEX_SPACE_DAYS_LABEL} — members are working next door, so we can't host ` +
  `general events in that window. Daytime programming that the whole building ` +
  `benefits from (yoga, meditation, classes, quiet workshops) is genuinely ` +
  `welcome: reach out and we'll issue you a code that unlocks these hours. ` +
  `Otherwise, please choose a start time from 4:00 PM onward, or book a ` +
  `Saturday or Sunday.`;
