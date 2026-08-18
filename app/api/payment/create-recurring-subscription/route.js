// app/api/payment/create-recurring-subscription/route.js
//
// Finalizes a recurring booking after the client confirms the SetupIntent.
// Creates the Stripe Subscription, attaches the prorated first-month invoice
// item, flips `pending_recurring_setup` to false, and fires confirmation
// emails. Idempotent — safe to re-call if the client retries.

import { finalizeRecurringSetup } from '../../../lib/recurring-billing.js';
import { sendRecurringSetupEmails } from '../../../lib/email.js';
import { syncRecurringCalendarEvents } from '../../../lib/recurring-calendar.js';
import { enforceRateLimit } from '../../../lib/rate-limit.js';
import { corsHeaders, corsPreflightResponse } from '../../../lib/http.js';

// CRITICAL: This route sends the recurring setup + onboarding emails inline.
// Without this, Vercel's default (~10s) function timeout kills the handler
// mid-pipeline and the later emails silently never send. Every route that
// sends email MUST export a maxDuration.
export const maxDuration = 60;

// Creates a Stripe Subscription and sends the recurring email set. Idempotent,
// but each call still costs Stripe API traffic and email budget.
const RATE_LIMIT = { bucket: 'create-recurring-subscription', limit: 10, windowMs: 60_000 };

export async function POST(request) {
  const CORS_HEADERS = corsHeaders(request);

  const limited = enforceRateLimit(request, RATE_LIMIT, CORS_HEADERS);
  if (limited) return limited;

  try {
    const { bookingId, setupIntentId } = await request.json();

    if (!bookingId || !setupIntentId) {
      return Response.json(
        { error: 'bookingId and setupIntentId are required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { booking, subscription, alreadyDone } = await finalizeRecurringSetup({
      bookingId,
      setupIntentId,
    });

    if (!alreadyDone) {
      try {
        await sendRecurringSetupEmails(booking);
      } catch (emailError) {
        // Emails are best-effort — the subscription is real and will bill.
        console.error('⚠️ Recurring setup emails failed:', emailError);
      }
    }

    // Book the recurring slots onto the Google Calendar ~3 months out.
    // Runs even when `alreadyDone` (a prior attempt may have died before
    // reaching this step) — deterministic event ids make re-runs no-ops.
    // AFTER emails on purpose: if the function is cut short, the client's
    // emails must lose nothing, and the monthly cron re-syncs the calendar.
    try {
      const calendarSync = await syncRecurringCalendarEvents(booking);
      console.log('📅 Recurring calendar sync:', calendarSync);
    } catch (calendarError) {
      console.error('⚠️ Recurring calendar sync failed (non-critical):', calendarError);
    }

    return Response.json(
      {
        success: true,
        alreadyDone,
        subscriptionId: subscription?.id || booking.stripe_subscription_id,
        bookingId: booking.id,
        redirect: `/booking/success?booking_id=${booking.id}&application_type=recurring`,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('❌ Recurring subscription creation failed:', error);
    return Response.json(
      {
        success: false,
        // Stripe / database messages stay in the log, not the response.
        error: 'Failed to create recurring subscription',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS(request) {
  return corsPreflightResponse(request);
}
