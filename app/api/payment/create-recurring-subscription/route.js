// app/api/payment/create-recurring-subscription/route.js
//
// Finalizes a recurring booking after the client confirms the SetupIntent.
// Creates the Stripe Subscription, attaches the prorated first-month invoice
// item, flips `pending_recurring_setup` to false, and fires confirmation
// emails. Idempotent — safe to re-call if the client retries.

import { finalizeRecurringSetup } from '../../../lib/recurring-billing.js';
import { sendRecurringSetupEmails } from '../../../lib/email.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request) {
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
        error: error.message || 'Failed to create recurring subscription',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}
