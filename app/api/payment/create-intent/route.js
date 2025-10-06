// app/api/payment/create-intent/route.js
// FIXED VERSION - Remove unnecessary status update

import { createSecurePaymentIntent } from '../../../lib/stripe-config.js';
import { getBooking } from '../../../lib/database.js';
import { supabase } from '../../../lib/database.js';

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
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Get booking details
    const booking = await getBooking(bookingId);
    if (!booking) {
      console.error('❌ [PAYMENT] Booking not found:', bookingId);
      return Response.json({ 
        error: 'Booking not found' 
      }, { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    console.log('✅ [PAYMENT] Booking found:', {
      id: booking.id,
      event_name: booking.event_name,
      amount: booking.total_amount,
      status: booking.status
    });

    // Check if booking is already confirmed
    if (booking.status === 'confirmed') {
      console.log('⚠️ [PAYMENT] Booking already confirmed, redirecting...');
      return Response.json({ 
        error: 'Booking is already confirmed',
        redirect: `/booking/success?booking_id=${bookingId}`
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Prepare booking data for Stripe
    const bookingDataForStripe = {
      id: booking.id,
      eventName: booking.event_name,
      selectedDate: booking.event_date,
      selectedTime: booking.event_time,
      email: booking.email,
      contactName: booking.contact_name,
      total: parseFloat(booking.total_amount)
    };

    console.log('💳 [PAYMENT] Creating Stripe payment intent...', {
      bookingId: booking.id,
      amount: bookingDataForStripe.total
    });

    // Create payment intent
    const paymentIntent = await createSecurePaymentIntent(bookingDataForStripe, paymentMethod);
    
    console.log('✅ [PAYMENT] Payment intent created:', paymentIntent.id);
    
    // FIXED: Store payment intent ID without changing status
    // The booking already has status 'pending_payment' from creation
    // We just need to link the payment intent
    console.log('💾 [PAYMENT] Storing payment intent ID...');
    
    const { data: updateData, error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select();

    if (updateError) {
      console.error('⚠️ [PAYMENT] Failed to store payment_intent_id:', updateError);
      // Don't fail the request - payment intent is created, this is just metadata
    } else {
      console.log('✅ [PAYMENT] Payment intent ID stored successfully');
    }

    return Response.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    }, { 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('❌ [PAYMENT] Payment intent creation error:', error);
    console.error('❌ [PAYMENT] Error stack:', error.stack);
    
    return Response.json({
      success: false,
      error: error.message || 'Failed to create payment intent'
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
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