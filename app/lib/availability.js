// app/lib/availability.js
//
// Slot math for the booking calendar: which start times are still free on a
// given day, and whether a specific [start, start+duration) window collides
// with something already on the calendar.
//
// WHY THIS IS A SEPARATE, PURE MODULE
//
// The same question gets asked in three places — the time picker in
// app/book/page.tsx (a client component), /api/check-availability, and the
// conflict guard in /api/booking-request. They MUST answer identically: a
// renter who is shown a slot as free and then rejected at submit has had their
// time wasted, and a renter who is shown a slot as free and NOT rejected has
// double-booked the venue. One implementation, imported by all three.
//
// No imports, so the client component can use it without dragging anything
// server-side into the public JavaScript bundle (see promo-codes.js).
//
// THE DURATION BUG THIS FIXES
//
// Availability used to be computed on start times alone: a slot was blocked
// only when the slot's own start fell inside a busy range. With 6–8 PM booked,
// 5:00 PM still showed as available — and the form happily accepted a 3-hour
// duration that ran straight through the existing booking. Nothing downstream
// caught it, because nothing downstream checked. Every function here takes the
// duration into account.

// The bookable start times offered by the picker. Canonical list — the API and
// the booking form both read it from here so a slot can never exist in one and
// not the other.
export const TIME_SLOTS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM',
];

// Convert "H:MM AM/PM" (or a bare 24-hour "HH:MM") into minutes from midnight.
// Returns null when unparseable — callers must treat null as "cannot
// evaluate", never as "free".
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

// Render minutes-from-midnight back as "H:MM AM/PM", for error messages that
// tell a renter which window is taken.
export function minutesToTime(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total)) return '';
  const hour24 = Math.floor(total / 60) % 24;
  const minute = Math.round(total % 60);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

// Half-open interval intersection: [aStart, aEnd) vs [bStart, bEnd).
// Back-to-back bookings (one ends exactly when the next begins) do NOT
// collide — stacking bookings that way is deliberate, which is why the venue
// requires setup and breakdown to happen inside the booked window.
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// The minute window a booking occupies, or null if it can't be determined.
export function bookingWindow(startTime, hours) {
  const startMinutes = timeToMinutes(startTime);
  if (startMinutes === null) return null;
  const durationMinutes = Math.round((parseFloat(hours) || 0) * 60);
  if (durationMinutes <= 0) return null;
  return { startMinutes, endMinutes: startMinutes + durationMinutes };
}

// The first busy range a proposed booking collides with, or null when clear.
// `busyRanges` is Array<{ startMinutes, endMinutes, ... }> — already narrowed
// to the booking's own date by the caller.
export function findConflict(busyRanges, startTime, hours) {
  const window = bookingWindow(startTime, hours);
  if (!window || !Array.isArray(busyRanges)) return null;
  for (const range of busyRanges) {
    if (!range) continue;
    const start = Number(range.startMinutes);
    const end = Number(range.endMinutes);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (rangesOverlap(window.startMinutes, window.endMinutes, start, end)) return range;
  }
  return null;
}

// The shortest booking the form will accept (30 minutes). Used as the probe
// duration when the renter hasn't chosen one yet.
export const MIN_SLOT_PROBE_HOURS = 0.5;

// Map every bookable start time to whether it is still free, given the day's
// busy ranges.
//
// `durationHours` is what makes this honest. With a duration, a slot is free
// only if the WHOLE booking fits; without one (the picker before a duration is
// chosen), fall back to the minimum bookable block so the list isn't wildly
// optimistic — a slot shown as free must at least be able to hold the shortest
// booking the form allows.
export function slotAvailability(busyRanges, options = {}) {
  const duration = parseFloat(options.durationHours) || MIN_SLOT_PROBE_HOURS;
  const availability = {};
  for (const slot of TIME_SLOTS) {
    availability[slot] = findConflict(busyRanges, slot, duration) === null;
  }
  return availability;
}
