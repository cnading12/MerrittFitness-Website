// app/lib/booking-guards.js
//
// SERVER-ONLY. The rules that decide whether a submitted booking may be
// accepted at all — as opposed to what it costs, which is booking-pricing.js.
//
// WHY THESE RUN ON THE SERVER
//
// Both rules below existed only in the browser before this module. The booking
// form disabled taken time slots and the renter never saw a conflict, which is
// fine right up until it isn't: a stale tab holding yesterday's availability,
// two renters submitting the same slot seconds apart, a direct POST to the
// API, or simply a request that skips the form. None of those are exotic — the
// second one is a busy Saturday. The venue can only host one event at a time,
// so "no double-booking" has to be decided by the thing that writes the
// booking, not by the thing that draws the form.
//
// Imports promo-codes.js, so this module must never be reachable from a
// `use client` component (see the header of promo-codes.js).

import { promoCodeAllowsDaytime } from './promo-codes.js';
import {
  overlapsFlexSpaceHours,
  FLEX_SPACE_RESTRICTION_MESSAGE,
  FLEX_SPACE_WINDOW_FULL_LABEL,
} from './flex-space-hours.js';
import { bookingWindow, findConflict, minutesToTime, rangesOverlap } from './availability.js';

export { FLEX_SPACE_RESTRICTION_MESSAGE, FLEX_SPACE_WINDOW_FULL_LABEL };

// Bookings that would run inside the weekday window held for Merritt Workspace
// without a code that unlocks it.
//
// Returns Array<{ eventName, date, startTime, hours }> — empty when the
// submission is clear, either because nothing touches the window or because
// the renter holds a code that opens it.
export function findFlexSpaceViolations(bookings, promoCode = '') {
  if (!Array.isArray(bookings)) return [];
  // One lookup for the whole submission: the code is a property of the renter,
  // not of an individual date.
  if (promoCodeAllowsDaytime(promoCode)) return [];

  return bookings
    .filter((booking) =>
      overlapsFlexSpaceHours(booking?.selectedDate, booking?.selectedTime, booking?.hoursRequested))
    .map((booking) => ({
      eventName: booking.eventName || 'Your booking',
      date: booking.selectedDate,
      startTime: booking.selectedTime,
      hours: booking.hoursRequested,
    }));
}

// Group busy ranges (as returned by findBusyRangesInRange) by their date, so a
// per-booking lookup is O(1).
export function groupBusyRangesByDate(busyRanges) {
  const byDate = new Map();
  if (!Array.isArray(busyRanges)) return byDate;
  for (const range of busyRanges) {
    if (!range || !range.date) continue;
    const list = byDate.get(range.date) || [];
    list.push(range);
    byDate.set(range.date, list);
  }
  return byDate;
}

// Bookings in this submission that collide with something already on the
// calendar.
//
// Returns Array<{ eventName, date, startTime, hours, conflict: { startMinutes,
// endMinutes } }>. The colliding event's SUMMARY is deliberately dropped
// before this leaves the server: the response goes to an anonymous caller and
// calendar titles carry other renters' event names.
export function findCalendarConflicts(bookings, busyRanges) {
  if (!Array.isArray(bookings)) return [];
  const byDate = groupBusyRangesByDate(busyRanges);

  const conflicts = [];
  for (const booking of bookings) {
    const ranges = byDate.get(booking?.selectedDate);
    if (!ranges || ranges.length === 0) continue;
    const hit = findConflict(ranges, booking.selectedTime, booking.hoursRequested);
    if (!hit) continue;
    conflicts.push({
      eventName: booking.eventName || 'Your booking',
      date: booking.selectedDate,
      startTime: booking.selectedTime,
      hours: booking.hoursRequested,
      conflict: { startMinutes: hit.startMinutes, endMinutes: hit.endMinutes },
    });
  }
  return conflicts;
}

// Bookings within ONE submission that overlap each other.
//
// A multi-event application is a single form where the renter adds dates one
// after another, and nothing stopped them entering the same afternoon twice.
// The calendar check above cannot catch it: neither booking exists on the
// calendar yet, so both look clear and both get written.
//
// Returns Array<{ first, second, date }> with the human labels needed for the
// error message.
export function findSelfOverlaps(bookings) {
  if (!Array.isArray(bookings) || bookings.length < 2) return [];

  const overlaps = [];
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      const a = bookings[i];
      const b = bookings[j];
      if (!a?.selectedDate || a.selectedDate !== b?.selectedDate) continue;

      const windowA = bookingWindow(a.selectedTime, a.hoursRequested);
      const windowB = bookingWindow(b.selectedTime, b.hoursRequested);
      if (!windowA || !windowB) continue;

      if (rangesOverlap(windowA.startMinutes, windowA.endMinutes, windowB.startMinutes, windowB.endMinutes)) {
        overlaps.push({
          first: a.eventName || `Booking ${i + 1}`,
          second: b.eventName || `Booking ${j + 1}`,
          date: a.selectedDate,
        });
      }
    }
  }
  return overlaps;
}

// Renter-facing description of a conflict: "Tuesday, September 1 — 6:00 PM to
// 8:00 PM is already reserved". Times only; never the other event's name.
export function describeConflict({ date, conflict }) {
  const window = `${minutesToTime(conflict.startMinutes)} to ${minutesToTime(conflict.endMinutes)}`;
  return `${formatDateLabel(date)} — ${window} is already reserved`;
}

// "Tuesday, September 1". Built from the date parts directly so the label
// doesn't shift by a day depending on the server's timezone.
export function formatDateLabel(dateString) {
  if (typeof dateString !== 'string') return String(dateString);
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateString;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}
