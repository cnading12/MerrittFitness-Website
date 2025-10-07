// app/api/webhooks/stripe/route.js
// COMPLETE FIXED VERSION - Replace entire file

import { stripe } from '../../../lib/stripe-config.js';
import { updateBookingStatus, getBooking } from '../../../lib/database.js';
import { createCalendarEvent } from '../../../lib/calendar.js';
import { sendConfirmationEmails } from '../../../lib/email.js';
import { headers } from 'next/headers';
import { supabase } from '../../../lib/database.js';

export async function POST(request) {
  console.log('🔔 [WEBHOOK] Stripe webhook received');
  
  let body;
  let signature;
  
  try {
    body = await request.text();
    const headersList = headers();
    signature = headersList.get('stripe-signature');
    
    if (!signature) {
      console.error('❌ [WEBHOOK] No Stripe signature found');
      return Response.json({ error: 'No signature' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error reading webhook request:', error);
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  
  let event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    console.log('✅ [WEBHOOK] Webhook verified. Event:', event.type, 'ID:', event.id);
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Webhook signature verification failed:', error.message);
    return Response.json({ 
      error: 'Invalid signature'
    }, { status: 400 });
  }
  
  try {
    // Handle different webhook events
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('💳 [WEBHOOK] Processing payment success...');
        await handlePaymentSuccess(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        console.log('❌ [WEBHOOK] Processing payment failure...');
        await handlePaymentFailure(event.data.object);
        break;
        
      case 'payment_intent.processing':
        console.log('⏳ [WEBHOOK] Processing payment processing...');
        await handlePaymentProcessing(event.data.object);
        break;
        
      default:
        console.log('ℹ️ [WEBHOOK] Unhandled webhook event:', event.type);
        return Response.json({ 
          received: true, 
          handled: false,
          message: `Event ${event.type} not handled`
        });
    }
    
    console.log('✅ [WEBHOOK] Webhook processed successfully');
    return Response.json({ 
      received: true, 
      handled: true,
      eventType: event.type,
      eventId: event.id
    });
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Webhook processing error:', error);
    
    return Response.json({ 
      error: 'Webhook processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Processing failed'
    }, { status: 500 });
  }
}

// FIXED: Enhanced payment success handler
async function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  console.log('🎯 [WEBHOOK] Payment success for booking:', bookingId);
  console.log('🎯 [WEBHOOK] Payment intent:', {
    id: paymentIntent.id,
    amount: paymentIntent.amount,
    metadata: paymentIntent.metadata
  });
  
  if (!bookingId) {
    console.error('❌ .[WEBHOOK] No booking ID in payment intent metadata');
    throw new Error('Missing booking ID in payment intent metadata');
  }
  
  try {
    // Get booking with detailed logging
    console.log('📖 [WEBHOOK] Fetching booking from database...');
    let booking = await getBooking(bookingId);
    
    if (!booking) {
      console.error('❌ [WEBHOOK] Booking not found in database:', bookingId);
      
      // Try to find by payment_intent_id as fallback
      console.log('🔄 [WEBHOOK] Trying to find booking by payment_intent_id...');
      const { data: bookingByPI, error: piError } = await supabase
        .from('bookings')
        .select('*')
        .eq('payment_intent_id', paymentIntent.id)
        .single();
      
      if (bookingByPI) {
        console.log('✅ [WEBHOOK] Found booking by payment_intent_id:', bookingByPI.id);
        booking = bookingByPI;
      } else {
        console.error('❌ [WEBHOOK] Could not find booking by ID or payment_intent_id');
        console.error('Available metadata:', paymentIntent.metadata);
        throw new Error(`Booking not found: ${bookingId}`);
      }
    }
    
    console.log('✅ [WEBHOOK] Booking found:', {
      id: booking.id,
      event_name: booking.event_name,
      current_status: booking.status,
      payment_intent_id: booking.payment_intent_id
    });
    
    // Update booking status to confirmed
    console.log('📝 [WEBHOOK] Updating booking status to confirmed...');
    
    const { data: updatedData, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_intent_id: paymentIntent.id,
        payment_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id)
      .select();
    
    if (updateError) {
      console.error('❌ [WEBHOOK] Failed to update booking status:', updateError);
      throw updateError;
    }
    
    console.log('✅ [WEBHOOK] Booking status updated to confirmed');
    
    // Re-fetch to get updated booking
    const updatedBooking = await getBooking(booking.id);
    
    // Create calendar event (if not already created)
    if (!updatedBooking.calendar_event_id) {
      try {
        console.log('📅 [WEBHOOK] Creating calendar event...');
        const calendarEvent = await createCalendarEvent(updatedBooking);
        
        if (calendarEvent && calendarEvent.id) {
          await supabase
            .from('bookings')
            .update({
              calendar_event_id: calendarEvent.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', booking.id);
          
          console.log('✅ [WEBHOOK] Calendar event created:', calendarEvent.id);
        }
      } catch (calendarError) {
        console.error('📅 [WEBHOOK] Calendar event creation failed:', calendarError.message);
        // Don't fail the webhook if calendar fails
      }
    } else {
      console.log('📅 [WEBHOOK] Calendar event already exists:', updatedBooking.calendar_event_id);
    }
    
    // Send confirmation emails
    try {
      console.log('📧 [WEBHOOK] Sending confirmation emails...');
      await sendConfirmationEmails(updatedBooking);
      console.log('✅ [WEBHOOK] Confirmation emails sent successfully');
    } catch (emailError) {
      console.error('📧 [WEBHOOK] Email sending failed:', emailError.message);
      // Don't fail the webhook if email fails
    }
    
    console.log('🎉 [WEBHOOK] Payment success handling completed:', {
      bookingId: booking.id,
      status: 'confirmed',
      paymentIntentId: paymentIntent.id
    });
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error handling payment success:', error);
    throw error;
  }
}

async function handlePaymentFailure(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  if (!bookingId) {
    throw new Error('Missing booking ID in payment intent metadata');
  }
  
  console.log('❌ [WEBHOOK] Payment failed for booking:', bookingId);
  
  try {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'payment_failed',
        payment_intent_id: paymentIntent.id,
        failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);
    
    if (error) {
      console.error('❌ [WEBHOOK] Failed to update booking to payment_failed:', error);
      throw error;
    }
    
    console.log('✅ [WEBHOOK] Booking status updated to payment_failed');
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error handling payment failure:', error);
    throw error;
  }
}

async function handlePaymentProcessing(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  if (!bookingId) {
    throw new Error('Missing booking ID in payment intent metadata');
  }
  
  console.log('⏳ [WEBHOOK] Payment processing for booking:', bookingId);
  
  try {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'payment_processing',
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);
    
    if (error) {
      console.error('❌ [WEBHOOK] Failed to update booking to payment_processing:', error);
      throw error;
    }
    
    console.log('✅ [WEBHOOK] Booking status updated to payment_processing');
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error handling payment processing:', error);
    throw error;
  }
}

// Test endpoint to verify webhook is reachable
export async function GET() {
  return Response.json({
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    version: '3.0.0'
  });
}