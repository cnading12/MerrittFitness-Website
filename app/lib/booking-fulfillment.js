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

// Resend's free plan caps at ~2 requests/sec. Space individual sends out so a
// group of bookings doesn't burst past the limit.
const EMAIL_RATE_LIMIT_DELAY_MS = 1000;
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
// onboarding once per group, not once per date). Returns an array of error
// strings (empty when everything sent).
export async function sendBookingEmails(booking, { sendOnboarding, sendPublicMarketing = false }) {
  const errors = [];

  try {
    await sendBookingConfirmation(booking);
    console.log(`✅ [FULFILL] Customer confirmation sent for ${booking.id} (${booking.event_date})`);
  } catch (err) {
    console.error(`❌ [FULFILL] Customer confirmation failed for ${booking.id}:`, err.message);
    errors.push(`customer:${booking.id}:${err.message}`);
  }
  await delay(EMAIL_RATE_LIMIT_DELAY_MS);

  try {
    await sendManagerNotification(booking);
    console.log(`✅ [FULFILL] Manager notification sent for ${booking.id} (${booking.event_date})`);
  } catch (err) {
    console.error(`❌ [FULFILL] Manager notification failed for ${booking.id}:`, err.message);
    errors.push(`manager:${booking.id}:${err.message}`);
  }
  await delay(EMAIL_RATE_LIMIT_DELAY_MS);

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
