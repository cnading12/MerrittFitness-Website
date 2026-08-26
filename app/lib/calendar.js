// app/lib/calendar.js - TIMEZONE FIX
// Properly handles Denver timezone without shifting issues

import { google } from 'googleapis';
import { buildStaffAttentionFlags, pickCalendarColorId, isSponsoredBooking } from './calendar-flags.js';

// Re-export so callers (and tests that already use the full path) keep working.
export { buildStaffAttentionFlags, pickCalendarColorId };

async function getGoogleAuth() {
  try {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Missing Google Calendar credentials');
    }

    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (typeof privateKey === 'string') {
      privateKey = privateKey.replace(/^["']|["']$/g, '');
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('Private key must start with -----BEGIN PRIVATE KEY-----');
      }
      if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
        throw new Error('Private key must end with -----END PRIVATE KEY-----');
      }

      privateKey = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----\s*/, '-----BEGIN PRIVATE KEY-----\n')
        .replace(/\s*-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
        .replace(/\n{2,}/g, '\n');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
        type: 'service_account',
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    return auth;

  } catch (error) {
    console.error('❌ Google Auth setup error:', error);
    throw error;
  }
}

// Convert time string to 24-hour format
function timeStringTo24Hour(timeStr) {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  
  let hour24 = hours;
  if (period === 'AM' && hours === 12) hour24 = 0;
  if (period === 'PM' && hours !== 12) hour24 = hours + 12;
  
  return { hour: hour24, minute: minutes };
}

// Busy ranges for a single day, in minutes-from-midnight (Denver wall-clock).
// Thin wrapper over findBusyRangesInRange so there is exactly ONE piece of
// code turning Google's timestamps into local minute windows.
//
// It did not used to be one. This function had its own event parser that read
// each event through a 12-hour toLocaleString and re-parsed the result, while
// findBusyRangesInRange (used by the recurring conflict check) parsed the same
// events in 24-hour form and additionally clipped multi-day events per day.
// Two parsers answering the same question is a bug waiting for the day they
// disagree — an all-day or overnight event was already handled by one and not
// the other. Now the availability picker and the conflict checks see exactly
// the same busy ranges.
export async function getDayBusyRanges(date) {
  const ranges = await findBusyRangesInRange(date, date);
  return ranges
    .filter((range) => range.date === date)
    .map(({ startMinutes, endMinutes, summary }) => ({ startMinutes, endMinutes, summary }));
}

// Fetch every busy range across a date span (inclusive). Used by the
// recurring conflict-check endpoint so we don't have to make one Google API
// call per candidate occurrence — one window query covers them all.
//
// Returns Array<{ date: 'YYYY-MM-DD', startMinutes, endMinutes, summary }>
// where startMinutes / endMinutes are minutes-from-midnight in Denver time.
// If a single calendar event spans multiple days the function emits one row
// per day, clipped to that day, so the overlap math at the call site stays
// trivial (compare on the same date).
export async function findBusyRangesInRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) {
    throw new Error('findBusyRangesInRange requires startDateStr and endDateStr');
  }

  const auth = await getGoogleAuth();
  const calendar = google.calendar('v3');

  const startTime = new Date(startDateStr + 'T00:00:00-07:00');
  const endTime = new Date(endDateStr + 'T23:59:59-07:00');

  const response = await calendar.events.list({
    auth,
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    timeMin: startTime.toISOString(),
    timeMax: endTime.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: 'America/Denver',
    maxResults: 2500,
  });

  const events = response.data.items || [];
  const ranges = [];

  for (const event of events) {
    if (!event.start?.dateTime || !event.end?.dateTime) continue;

    // Local Denver components for the event boundaries.
    const startLocal = new Date(event.start.dateTime).toLocaleString('en-US', {
      timeZone: 'America/Denver',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const endLocal = new Date(event.end.dateTime).toLocaleString('en-US', {
      timeZone: 'America/Denver',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

    const startParts = parseLocalDateTime(startLocal);
    const endParts = parseLocalDateTime(endLocal);
    if (!startParts || !endParts) continue;

    if (startParts.date === endParts.date) {
      ranges.push({
        date: startParts.date,
        startMinutes: startParts.hour * 60 + startParts.minute,
        endMinutes: endParts.hour * 60 + endParts.minute,
        summary: event.summary || '(busy)',
      });
    } else {
      // Multi-day event: emit one row per day inside the span. The first day
      // gets [start..23:59], the last day gets [00:00..end], full days in
      // between are [00:00..23:59].
      let cursorIso = startParts.date;
      while (cursorIso <= endParts.date) {
        const isFirst = cursorIso === startParts.date;
        const isLast = cursorIso === endParts.date;
        ranges.push({
          date: cursorIso,
          startMinutes: isFirst ? startParts.hour * 60 + startParts.minute : 0,
          endMinutes: isLast ? endParts.hour * 60 + endParts.minute : 24 * 60,
          summary: event.summary || '(busy)',
        });
        cursorIso = nextIsoDate(cursorIso);
      }
    }
  }

  return ranges;
}

// Parse "MM/DD/YYYY, HH:MM" (Denver wall-clock) into pieces. Returns null on
// any deviation from that exact shape.
function parseLocalDateTime(localStr) {
  const m = localStr.match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, mm, dd, yyyy, hh, min] = m;
  return {
    date: `${yyyy}-${mm}-${dd}`,
    hour: Number(hh),
    minute: Number(min),
  };
}

function nextIsoDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

// COMPLETELY FIXED: Calendar event creation with proper timezone handling
//
// options:
//   eventId        — client-supplied Google event id (base32hex: [a-v0-9],
//                    5-1024 chars). Passing a deterministic id makes creation
//                    idempotent: re-inserting the same id fails with 409,
//                    which callers treat as "already on the calendar". Used
//                    by the recurring sync so webhook retries / monthly
//                    re-syncs never duplicate an occurrence.
//   recurringLabel — human label of the recurring slot (e.g. "Every
//                    Wednesday 6:00 PM"). Marks the event as one occurrence
//                    of a recurring booking and swaps the amount line for
//                    "billed monthly" (per-occurrence dollar amounts don't
//                    exist — the monthly invoicer computes them).
export async function createCalendarEvent(booking, includeAttendees = false, options = {}) {
  try {
    console.log('📅 Creating calendar event for booking:', booking.id);
    console.log('📅 Event details:', {
      date: booking.event_date,
      time: booking.event_time,
      duration: booking.hours_requested
    });

    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');

    // Parse the time correctly
    const { hour, minute } = timeStringTo24Hour(booking.event_time);
    const duration = parseFloat(booking.hours_requested) || 2;

    console.log('⏰ Parsed time:', { hour, minute, duration });

    // CRITICAL FIX: Build the datetime string correctly in Denver timezone
    // DON'T add timezone offset - let Google Calendar handle it with timeZone field
    // Format: YYYY-MM-DDTHH:MM:SS
    const [year, month, day] = booking.event_date.split('-');
    const hourStr = String(hour).padStart(2, '0');
    const minuteStr = String(minute).padStart(2, '0');
    
    // Create the datetime string WITHOUT timezone offset
    // We'll use timeZone: 'America/Denver' instead
    const startDateTimeString = `${year}-${month}-${day}T${hourStr}:${minuteStr}:00`;
    console.log('📅 Start datetime string:', startDateTimeString);

    // Calculate end time by adding hours directly to the hour value
    // This avoids any Date object timezone conversion issues
    let endHour = hour + Math.floor(duration);
    let endMinute = minute + ((duration % 1) * 60);
    
    // Handle minute overflow
    if (endMinute >= 60) {
      endHour += 1;
      endMinute -= 60;
    }
    
    // Handle day overflow (if event goes past midnight)
    let endDay = parseInt(day);
    if (endHour >= 24) {
      endHour -= 24;
      endDay += 1;
    }
    
    const endHourStr = String(endHour).padStart(2, '0');
    const endMinuteStr = String(endMinute).padStart(2, '0');
    const endDayStr = String(endDay).padStart(2, '0');
    const endDateTimeString = `${year}-${month}-${endDayStr}T${endHourStr}:${endMinuteStr}:00`;
    
    console.log('📅 End datetime string:', endDateTimeString);
    console.log('⏰ Full event time:', {
      start: startDateTimeString,
      end: endDateTimeString,
      durationHours: duration,
      timezone: 'America/Denver'
    });

    // Build staff-attention flags so they're visible at a glance on the
    // calendar grid (in the title) and spelled out in the description.
    const flags = buildStaffAttentionFlags(booking);
    const titlePrefix = flags.length
      ? `${flags.map((f) => f.tag).join(' | ')} — `
      : '';
    const flagBlock = flags.length
      ? `⚠️ STAFF ATTENTION REQUIRED ⚠️\n${flags
          .map((f) => `• ${f.detail}`)
          .join('\n')}\n\n`
      : '';

    // Human-readable summaries of the booking's logistics so on-site staff can
    // see at a glance — directly on the calendar event — exactly what the client
    // expects (guest count, equipment, mat, alcohol, public/private, cost).
    const sponsored = isSponsoredBooking(booking);
    const visibilityLine =
      booking.is_public === true || booking.is_public === 'public'
        ? 'PUBLIC — open to the community'
        : 'Private';
    const equipmentParts = [];
    if (booking.needs_tables) equipmentParts.push('Tables');
    if (booking.needs_chairs) equipmentParts.push('Chairs');
    const equipmentLine = equipmentParts.length ? equipmentParts.join(' + ') : 'None requested';
    const matLine = booking.needs_mat
      ? Number(booking.mat_rental_fee) > 0
        ? 'Yes — staff sets up & breaks down (within the booked window)'
        : 'Yes — partner handles their own setup & breakdown'
      : 'No';
    const dividerLine = booking.needs_divider_removal
      ? 'REMOVED for this event — staff takes the glass & wood dividers out and breaks down all cafe tables & chairs before the event, then restores everything after (cafe/lounge opens into the main hall)'
      : 'In place (cafe/lounge separated from the main hall)';
    const alcoholLine =
      booking.serving_alcohol === true
        ? booking.coi_document_data
          ? 'Yes — COI on file'
          : 'Yes — ⚠️ COI MISSING (contact renter)'
        : booking.serving_alcohol === false
          ? 'No'
          : 'Not specified';
    const paymentLabel =
      booking.payment_method === 'card' ? 'Card'
      : booking.payment_method === 'ach' ? 'ACH'
      : booking.payment_method === 'pay-later' ? 'Pay later'
      : booking.payment_method || 'n/a';
    const recurringLabel = options.recurringLabel || null;
    const amountLine = recurringLabel
      ? `Recurring rental — billed monthly (${paymentLabel})`
      : sponsored
        ? '$0.00 — Sponsored (no payment collected)'
        : booking.total_amount != null
          ? `$${Number(booking.total_amount).toFixed(2)} (${paymentLabel})`
          : 'n/a';
    const recurringLine = recurringLabel
      ? `Recurring schedule: ${recurringLabel}\n`
      : '';

    const event = {
      ...(options.eventId ? { id: options.eventId } : {}),
      summary: `🔒 ${titlePrefix}BOOKED${recurringLabel ? ' (recurring)' : ''}: ${booking.event_name}`,
      description: `
BOOKING CONFIRMED - This Time Slot is RESERVED

${flagBlock}Event: ${booking.event_name}
Type: ${booking.event_type || 'Not specified'}
${recurringLine}Visibility: ${visibilityLine}
Organizer (event host): ${booking.contact_name}
${booking.business_name ? `Business: ${booking.business_name}\n` : ''}Email: ${booking.email}
Phone: ${booking.phone || 'Not provided'}
Duration: ${duration} hours
Guest count: ${booking.expected_attendees ?? 'n/a'}

— Setup & logistics —
Tables / Chairs: ${equipmentLine}
Full-floor mat: ${matLine}
Cafe/lounge dividers: ${dividerLine}
Alcohol: ${alcoholLine}
Amount: ${amountLine}
${booking.special_requests ? `\nSpecial Requests: ${booking.special_requests}\n` : ''}
Booking ID: ${booking.id}
Contact clientservices@merrittwellness.net for changes.
      `.trim(),
      start: {
        dateTime: startDateTimeString,
        timeZone: 'America/Denver',
      },
      end: {
        dateTime: endDateTimeString,
        timeZone: 'America/Denver',
      },
      location: 'Merritt Wellness, 2246 Irving St, Denver, CO 80211',
      colorId: pickCalendarColorId(flags),
      transparency: 'opaque',
      visibility: 'private'
    };

    console.log('📤 Sending event to Google Calendar:', {
      summary: event.summary,
      start: event.start,
      end: event.end
    });

    const response = await calendar.events.insert({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
      sendUpdates: 'none'
    });

    console.log('✅ Calendar event created:', response.data.id);
    console.log('✅ Event link:', response.data.htmlLink);
    
    // Verify the created event time
    console.log('✅ Verified event times:', {
      start: response.data.start.dateTime,
      end: response.data.end.dateTime
    });

    return response.data;

  } catch (error) {
    console.error('❌ Calendar event creation failed:', error);
    throw error;
  }
}