import { createSecurePaymentIntent } from '../../../lib/stripe-config.js';
import { getBooking, updateBookingStatus } from '../../../lib/database.js';

export async function POST(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { bookingId, paymentMethod = 'card' } = await request.json();
    
    console.log('💳 [PAYMENT] Creating payment intent for booking:', bookingId);
    
    if (!bookingId) {
      return Response.json({ 
        error: 'Booking ID is required' 
      }, { status: 400, headers: corsHeaders });
    }

    const booking = await getBooking(bookingId);
    if (!booking) {
      return Response.json({ 
        error: 'Booking not found' 
      }, { status: 404, headers: corsHeaders });
    }

    console.log('💳 [PAYMENT] Booking found:', {
      id: booking.id,
      amount: booking.total_amount,
      status: booking.status
    });

    if (booking.status === 'confirmed') {
      return Response.json({ 
        error: 'Booking is already confirmed',
        redirect: `/booking/success?booking_id=${bookingId}`
      }, { status: 400, headers: corsHeaders });
    }

    // CRITICAL: Update status to payment_processing
    await updateBookingStatus(bookingId, 'payment_processing');
    console.log('💳 [PAYMENT] Status updated to payment_processing');

    const bookingDataForStripe = {
      id: booking.id,
      eventName: booking.event_name,
      selectedDate: booking.event_date,
      selectedTime: booking.event_time,
      email: booking.email,
      contactName: booking.contact_name,
      total: parseFloat(booking.total_amount)
    };

    console.log('💳 [PAYMENT] Creating Stripe payment intent...');
    const paymentIntent = await createSecurePaymentIntent(bookingDataForStripe, paymentMethod);
    
    // CRITICAL: Store payment intent ID immediately
    await updateBookingStatus(bookingId, 'payment_processing', {
      payment_intent_id: paymentIntent.id
    });
    
    console.log('✅ [PAYMENT] Payment intent created:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status
    });

    return Response.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ [PAYMENT] Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to create payment intent'
    }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}