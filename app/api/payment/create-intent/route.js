import { createSecurePaymentIntent } from '../../../lib/stripe-config.js';
import { getBooking } from '../../../lib/database.js';
import { supabaseServer as supabase } from '../../../lib/supabase-server.js';
import { enforceRateLimit } from '../../../lib/rate-limit.js';
import { corsHeaders, corsPreflightResponse } from '../../../lib/http.js';

// Creates a real Stripe PaymentIntent per call. Anyone holding a booking id can
// call it, so cap the rate: a renter needs a couple of attempts, not dozens.
const RATE_LIMIT = { bucket: 'create-intent', limit: 15, windowMs: 60_000 };

export async function POST(request) {
  const headers = corsHeaders(request);

  const limited = enforceRateLimit(request, RATE_LIMIT, headers);
  if (limited) return limited;

  try {
    const { bookingId, paymentMethod = 'card' } = await request.json();
    
    console.log('💳 Creating payment intent for booking:', bookingId);
    
    if (!bookingId) {
      return Response.json({ 
        error: 'Booking ID is required' 
      }, { status: 400, headers });
    }

    // Get booking details
    const booking = await getBooking(bookingId);
    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      return Response.json({ 
        error: 'Booking not found' 
      }, { status: 404, headers });
    }

    console.log('📋 Found booking:', booking.event_name, 'Amount:', booking.total_amount);

    // Check if already confirmed
    if (booking.status === 'confirmed') {
      return Response.json({
        error: 'Booking is already confirmed',
        redirect: `/booking/success?booking_id=${bookingId}`
      }, { status: 400, headers });
    }

    // Sponsored / zero-amount bookings never require payment. Guard against a
    // Stripe PaymentIntent being created for them (Stripe rejects $0 anyway) and
    // send the renter straight to the confirmation page.
    if (parseFloat(booking.total_amount) <= 0) {
      return Response.json({
        error: 'No payment required for this booking',
        redirect: `/booking/success?booking_id=${bookingId}`
      }, { status: 400, headers });
    }

    // Prepare data for Stripe
    const bookingDataForStripe = {
      id: booking.id,
      eventName: booking.event_name,
      selectedDate: booking.event_date,
      selectedTime: booking.event_time,
      email: booking.email,
      contactName: booking.contact_name,
      total: parseFloat(booking.total_amount)
    };

    console.log('💳 Creating Stripe payment intent...');
    const paymentIntent = await createSecurePaymentIntent(bookingDataForStripe, paymentMethod);
    
    // Store payment intent ID (don't change status)
    console.log('💾 Storing payment intent ID...');
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.warn('⚠️ Failed to store payment_intent_id:', updateError);
    } else {
      console.log('✅ Payment intent ID stored');
    }

    return Response.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    }, { headers });

  } catch (error) {
    console.error('❌ Payment intent creation error:', error);
    
    return Response.json({
      success: false,
      error: error.message || 'Failed to create payment intent'
    }, { status: 500, headers });
  }
}

export async function OPTIONS(request) {
  return corsPreflightResponse(request);
}