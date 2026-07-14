// app/lib/recurring-calendar.js
//
// Google Calendar sync for RECURRING bookings.
//
// One-time and sponsored bookings get their calendar event from
// booking-fulfillment.js (ensureCalendarEvent). Recurring bookings have no
// single event — they have a pattern — so this module expands the pattern
// into concrete occurrences and books each one onto the Google Calendar for
// a rolling window of RECURRING_CALENDAR_HORIZON_MONTHS months. Blocking the
// calendar is what makes the availability picker and the conflict check see
// the recurring renter's slots, so this is load-bearing for double-booking
// prevention — not just staff visibility.
//
// Called from three places (all best-effort — a calendar failure never blocks
// payment or emails):
//   1. app/api/payment/create-recurring-subscription/route.js — right after
//      the renter's auto-pay setup is finalized.
//   2. The Stripe webhook's setup_intent.succeeded handler — the safety net
//      when the client-side finalize call never lands.
//   3. app/lib/monthly-billing.js — the monthly cron re-syncs each active
//      booking, which rolls the horizon forward one month every cycle and
//      heals any occurrence a previous sync failed to create.
//
// Idempotency: every occurrence gets a DETERMINISTIC Google event id derived
// from (booking id, date, slot index). Re-inserting an existing id makes
// Google return 409, which we count as "already on the calendar" — so webhook
// retries, route/webhook races, and monthly re-syncs can all call this
// freely. A deliberate side effect: if staff manually DELETES an occurrence
// from the calendar, Google keeps the id reserved and re-sync will NOT
// resurrect the event — staff deletions stick.

import { computeOccurrences } from './recurring-occurrences.js';
import { createCalendarEvent } from './calendar.js';

// Matches the horizon of the pre-submit conflict check
// (app/api/recurring-conflicts, horizonMonths default 3): the same window the
// renter cleared of conflicts is the window we book out.
export const RECURRING_CALENDAR_HORIZON_MONTHS = 3;

function parseRecurringDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

// Today's calendar date in Denver, as YYYY-MM-DD. en-CA formats as ISO.
function denverTodayIso(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
}

// Google Calendar event ids must be 5–1024 chars from the base32hex charset
// ([a-v0-9], lowercase — note 'w'-'z' are NOT allowed). Booking ids are
// UUIDs — hex digits are a subset of base32hex, so stripping the hyphens is
// enough. 's' + slot index keeps two slots landing on the same date from
// colliding.
export function recurringOccurrenceEventId(bookingId, dateStr, slotIdx) {
  const idPart = String(bookingId).toLowerCase().replace(/[^a-v0-9]/g, '');
  const datePart = String(dateStr).replace(/-/g, '');
  return `merit${idPart}${datePart}s${Number(slotIdx) || 0}`;
}

function isAlreadyExistsError(err) {
  const status = Number(err?.code ?? err?.response?.status);
  if (status === 409) return true;
  return /already exists|identifier already/i.test(err?.message || '');
}

// Expand the booking's recurring pattern and create a Google Calendar event
// for every occurrence from today through the horizon. Never throws — returns
// a summary the caller can log:
//   { checked, created, alreadyExists, failed, errors: [...], skippedReason? }
export async function syncRecurringCalendarEvents(booking, options = {}) {
  const horizonMonths = options.horizonMonths ?? RECURRING_CALENDAR_HORIZON_MONTHS;
  const summary = { checked: 0, created: 0, alreadyExists: 0, failed: 0, errors: [] };

  const details = parseRecurringDetails(booking?.recurring_details);
  if (!details || !Array.isArray(details.slots) || details.slots.length === 0) {
    summary.skippedReason = 'recurring_details missing or has no slots';
    return summary;
  }

  const startDate = details.startDate || details.start_date || booking.event_date || null;
  if (!startDate) {
    summary.skippedReason = 'recurring_details is missing startDate';
    return summary;
  }
  const endDate = details.endDate || details.end_date || null;
  const exceptions = Array.isArray(details.exceptions) ? details.exceptions : [];

  // Only book out from today (Denver) forward — past occurrences are billing
  // history, not calendar inventory.
  const todayIso = denverTodayIso(options.now);
  const syncFrom = startDate > todayIso ? startDate : todayIso;
  const [fromYear, fromMonth] = syncFrom.split('-').map(Number);

  const occurrences = [];
  for (let i = 0; i < horizonMonths; i++) {
    const cursor = new Date(Date.UTC(fromYear, fromMonth - 1 + i, 1));
    occurrences.push(...computeOccurrences(
      details,
      cursor.getUTCFullYear(),
      cursor.getUTCMonth() + 1,
      { startDate, endDate, exceptions },
    ));
  }

  for (const occ of occurrences) {
    if (occ.date < syncFrom) continue;
    summary.checked++;

    const eventId = recurringOccurrenceEventId(booking.id, occ.date, occ.slotIdx ?? 0);
    // createCalendarEvent reads a single-event booking shape; overlay the
    // occurrence's concrete date/time/duration on top of the booking row.
    const occurrenceBooking = {
      ...booking,
      event_date: occ.date,
      event_time: occ.slot?.startTime || booking.event_time,
      hours_requested: occ.hours,
    };

    try {
      await createCalendarEvent(occurrenceBooking, false, {
        eventId,
        recurringLabel: occ.slotLabel,
      });
      summary.created++;
    } catch (err) {
      if (isAlreadyExistsError(err)) {
        summary.alreadyExists++;
        continue;
      }
      summary.failed++;
      summary.errors.push(`${occ.date}: ${err.message}`);
      console.error(
        `⚠️ [RECUR-CAL] Failed to create calendar event for booking ${booking.id} on ${occ.date}:`,
        err.message,
      );
    }
  }

  return summary;
}
