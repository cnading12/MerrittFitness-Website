// app/api/payment/create-recurring-setup/route.js
//
// Creates a Stripe SetupIntent for a recurring booking. The renter confirms
// the SetupIntent client-side (Financial Connections for ACH, card element
// for card), then the create-recurring-subscription route wires up the
// Customer + Subscription. ACH is the default and strongly preferred since
// monthly auto-debit avoids the 3% card processing fee on every invoice.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: false,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function getOrCreateCustomerForBooking(booking, paymentMethod) {
  // Reuse the Stripe Customer if one was already created for this booking —
  // this handles the case where the renter starts ACH, bails, and comes back
  // to try card (or vice versa). We don't want orphaned customers per attempt.
  if (booking.stripe_customer_id) {
    try {
      const existing = await stripe.customers.retrieve(booking.stripe_customer_id);
      if (existing && !existing.deleted) {
        return existing;
      }
    } catch (err) {
      console.warn('⚠️ Stored stripe_customer_id was stale, creating a new one:', err.message);
    }
  }

  const customer = await stripe.customers.create({
    name: booking.contact_name,
    email: booking.email,
    phone: booking.phone || undefined,
    address: booking.home_address
      ? { line1: booking.home_address }
      : undefined,
    metadata: {
      bookingId: booking.id,
      masterBookingId: booking.master_booking_id || booking.id,
      eventName: booking.event_name,
      paymentMethodPreference: paymentMethod,
    },
  });

  // Persist the customer id so retries don't create duplicates. Tolerate the
  // column missing pre-migration; the subscription route will re-persist.
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id);

  if (updateError && updateError.code !== 'PGRST204') {
    console.warn('⚠️ Could not persist stripe_customer_id:', updateError.message);
  }

  return customer;
}

export async function POST(request) {
  try {
    const { bookingId, paymentMethod } = await request.json();

    if (!bookingId) {
      return Response.json(
        { error: 'Booking ID is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (paymentMethod !== 'ach' && paymentMethod !== 'card') {
      return Response.json(
        { error: 'paymentMethod must be "ach" or "card"' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { data: booking, error: lookupError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (lookupError || !booking) {
      console.error('❌ Booking not found for recurring setup:', bookingId, lookupError);
      return Response.json(
        { error: 'Booking not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Already has an active subscription — short-circuit rather than creating
    // another SetupIntent that would leave Stripe in an ambiguous state.
    if (booking.stripe_subscription_id) {
      return Response.json(
        {
          error: 'Recurring subscription already set up',
          redirect: `/booking/success?booking_id=${bookingId}&application_type=recurring`,
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const customer = await getOrCreateCustomerForBooking(booking, paymentMethod);

    const setupIntentParams = {
      customer: customer.id,
      usage: 'off_session',
      metadata: {
        bookingId: booking.id,
        masterBookingId: booking.master_booking_id || booking.id,
        applicationType: 'recurring',
        paymentMethod,
      },
    };

    if (paymentMethod === 'ach') {
      setupIntentParams.payment_method_types = ['us_bank_account'];
      setupIntentParams.payment_method_options = {
        us_bank_account: {
          // Financial Connections gives us instant account verification + the
          // bank's routing/account numbers without requiring microdeposits.
          financial_connections: {
            permissions: ['payment_method'],
          },
          verification_method: 'instant',
        },
      };
    } else {
      setupIntentParams.payment_method_types = ['card'];
    }

    const setupIntent = await stripe.setupIntents.create(setupIntentParams);

    console.log('✅ Recurring SetupIntent created:', {
      bookingId,
      setupIntentId: setupIntent.id,
      customerId: customer.id,
      paymentMethod,
    });

    return Response.json(
      {
        success: true,
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
        customerId: customer.id,
        paymentMethod,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('❌ Recurring SetupIntent creation failed:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to create setup intent',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}
