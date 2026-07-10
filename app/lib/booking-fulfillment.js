// app/lib/booking-fulfillment.js
//
// Shared post-confirmation side effects for a booking: create its Google
// Calendar event (once) and send the customer + manager + onboarding emails.
//
// Two callers use this:
//   1. The Stripe webhook (app/api/webhooks/stripe/route.js) after a paid
//      booking's payment_intent.succeeds.
//   2. The booking-request route (app/api/booking-request/route.js) for
//      SPONSORED bookings, which are confirmed immediately and never hit
//      Stripe — so no webhook fires and the route has to run these itself.
//
// Keeping the logic here means the calendar/email behavior (rate limiting,
// once-per-group onboarding, calendar-failure tolerance) stays identical
// across both paths instead of drifting between two copies.

import { createClient } from '@supabase/supabase-js';
import { createCalendarEvent } from './calendar.js';
import {
  sendBookingConfirmation,
  sendManagerNotification,
  sendClientOnboarding,
  sendPublicEventMarketing,
} from './email.js';

// A booking is public when the renter chose "public" on the form. Stored as a
// boolean `is_public` column; tolerate the legacy/string shapes just in case.
export function isPublicBooking(booking) {
  return booking?.is_public === true || booking?.is_public === 'public';
}

// Resend's free plan caps at ~2 requests/sec, so sends must be ≥500ms apart.
// But every extra millisecond of sleep also eats into the serverless function's
// maxDuration budget — a too-generous delay is exactly how the later emails in
// the pipeline (onboarding, marketing) got killed by the platform timeout and
// never reached clients. 600ms clears the rate limit with margin while keeping
// large multi-event groups inside the route's maxDuration. sendEmailWithRetry
// backstops any transient 429 anyway.
const EMAIL_RATE_LIMIT_DELAY_MS = 600;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Create the calendar event for a booking if it doesn't already have one, and
// persist the resulting event id. Calendar failures are logged and swallowed
// so they never block other bookings or the email sends.
export async function ensureCalendarEvent(booking) {
  if (booking.calendar_event_id) {
    console.log(`📅 [FULFILL] Calendar event already exists for ${booking.id}:`, booking.calendar_event_id);
    return;
  }

  try {
    console.log(`📅 [FULFILL] Creating calendar event for ${booking.id} (${booking.event_date} ${booking.event_time})...`);
    const calendarEvent = await createCalendarEvent(booking);

    if (calendarEvent && calendarEvent.id) {
      await supabase
        .from('bookings')
        .update({
          calendar_event_id: calendarEvent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);
      console.log(`✅ [FULFILL] Calendar event created for ${booking.id}:`, calendarEvent.id);
    }
  } catch (calendarError) {
    // Calendar failure should not block other bookings or emails — log and continue.
    console.error(`⚠️ [FULFILL] Calendar event failed for ${booking.id} (non-critical):`, calendarError.message);
  }
}

// Send the customer confirmation + manager notification for a booking, plus the
// generic onboarding email when `sendOnboarding` is true (the renter only needs
// onboarding once per group, not once per date). Pass `group` (every booking
// sharing this booking's master_booking_id) so multi-event emails can spell out
// "event X of N" and that the amount is the combined, charged-once total.
// Returns an array of error strings (empty when everything sent).
//
// ORDER MATTERS: every client-facing email (confirmation, onboarding, public
// marketing) goes out BEFORE the staff notification. If the function is ever
// cut short (platform timeout, crash), the client — the person who just paid —
// loses nothing; staff visibility is the acceptable casualty. Do not reorder.
export async function sendBookingEmails(booking, { sendOnboarding, sendPublicMarketing = false, group } = {}) {
  const errors = [];

  try {
    await sendBookingConfirmation(booking, { group });
    console.log(`✅ [FULFILL] Customer confirmation sent for ${booking.id} (${booking.event_date})`);
  } catch (err) {
    console.error(`❌ [FULFILL] Customer confirmation failed for ${booking.id}:`, err.message);
    errors.push(`customer:${booking.id}:${err.message}`);
  }
  await delay(EMAIL_RATE_LIMIT_DELAY_MS);

  if (sendOnboarding) {
    try {
      await sendClientOnboarding(booking);
      console.log(`✅ [FULFILL] Client onboarding sent (once for group)`);
    } catch (err) {
      console.error(`❌ [FULFILL] Client onboarding failed:`, err.message);
      errors.push(`onboarding:${booking.id}:${err.message}`);
    }
    await delay(EMAIL_RATE_LIMIT_DELAY_MS);
  }

  // Public events get the collaborative-marketing email (flyer + website +
  // social materials request). Sent once per group, like onboarding.
  if (sendPublicMarketing) {
    try {
      await sendPublicEventMarketing(booking);
      console.log(`✅ [FULFILL] Public-event marketing email sent for ${booking.id}`);
    } catch (err) {
      console.error(`❌ [FULFILL] Public-event marketing email failed for ${booking.id}:`, err.message);
      errors.push(`publicMarketing:${booking.id}:${err.message}`);
    }
    await delay(EMAIL_RATE_LIMIT_DELAY_MS);
  }

  // Staff notification goes LAST — see the ordering note above.
  try {
    await sendManagerNotification(booking, { group });
    console.log(`✅ [FULFILL] Manager notification sent for ${booking.id} (${booking.event_date})`);
  } catch (err) {
    console.error(`❌ [FULFILL] Manager notification failed for ${booking.id}:`, err.message);
    errors.push(`manager:${booking.id}:${err.message}`);
  }
  await delay(EMAIL_RATE_LIMIT_DELAY_MS);

  return errors;
}

// Run calendar + email side effects for an already-confirmed group of bookings.
// The onboarding email goes out exactly once for the whole group. Returns an
// array of error strings (empty when everything succeeded). Used by the
// sponsored-booking path, which confirms rows at insert time and therefore
// never receives a Stripe webhook to trigger these.
export async function fulfillConfirmedBookings(bookings) {
  let onboardingPending = true;
  let publicMarketingPending = true;
  const allErrors = [];

  for (const booking of bookings) {
    await ensureCalendarEvent(booking);

    const sendPublicMarketing = publicMarketingPending && isPublicBooking(booking);
    const emailErrors = await sendBookingEmails(booking, {
      sendOnboarding: onboardingPending,
      sendPublicMarketing,
      group: bookings,
    });
    if (onboardingPending && emailErrors.every((e) => !e.startsWith('onboarding:'))) {
      onboardingPending = false;
    }
    if (sendPublicMarketing && emailErrors.every((e) => !e.startsWith('publicMarketing:'))) {
      publicMarketingPending = false;
    }
    allErrors.push(...emailErrors);
  }

  return allErrors;
}
