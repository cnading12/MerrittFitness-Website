// app/api/webhooks/stripe/route.js
// FIXED VERSION - Proper webhook handling for payment completion

import { stripe } from '../../../lib/stripe-config.js';
import { updateBookingStatus, getBooking } from '../../../lib/database.js';
import { createCalendarEvent } from '../../../lib/calendar.js';
import { sendConfirmationEmails } from '../../../lib/email.js';
import { headers } from 'next/headers';

export async function POST(request) {
  console.log('🔔 Stripe webhook received');

  let body;
  let signature;

  try {
    body = await request.text();
    // FIXED: Don't await headers() in Next.js 15
    const headersList = headers();
    signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ No Stripe signature found');
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error reading webhook request:', error);
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

    console.log('✅ Webhook verified. Event:', event.type, 'ID:', event.id);

  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error.message);
    return Response.json({
      error: 'Invalid signature'
    }, { status: 400 });
  }

  try {
    // Handle different webhook events
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('💳 Processing payment success...');
        await handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        console.log('❌ Processing payment failure...');
        await handlePaymentFailure(event.data.object);
        break;

      case 'payment_intent.processing':
        console.log('⏳ Processing payment processing...');
        await handlePaymentProcessing(event.data.object);
        break;

      default:
        console.log('ℹ️ Unhandled webhook event:', event.type);
        return Response.json({
          received: true,
          handled: false,
          message: `Event ${event.type} not handled`
        });
    }

    console.log('✅ Webhook processed successfully');
    return Response.json({
      received: true,
      handled: true,
      eventType: event.type,
      eventId: event.id
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);

    return Response.json({
      error: 'Webhook processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Processing failed'
    }, { status: 500 });
  }
}

// FIXED: Enhanced payment success handler
async function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  console.log('🎯 Payment success for booking:', bookingId);

  if (!bookingId) {
    console.error('❌ No booking ID in payment intent metadata');
    throw new Error('Missing booking ID in payment intent metadata');
  }

  try {
    // Update booking status to confirmed
    console.log('📝 Updating booking status to confirmed...');
    await updateBookingStatus(bookingId, 'confirmed', {
      payment_intent_id: paymentIntent.id,
      payment_confirmed_at: new Date().toISOString(),
    });

    // Get booking details for calendar and email
    console.log('📖 Fetching booking details...');
    const booking = await getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    console.log('✅ Booking found:', booking.event_name);

    // Create calendar event (if not already created)
    if (!booking.calendar_event_id) {
      try {
        console.log('📅 Creating calendar event...');
        const calendarEvent = await createCalendarEvent(booking);

        if (calendarEvent && calendarEvent.id) {
          // Update booking with calendar event ID
          await updateBookingStatus(bookingId, 'confirmed', {
            calendar_event_id: calendarEvent.id,
            updated_at: new Date().toISOString()
          });

          console.log('✅ Calendar event created and linked:', calendarEvent.id);
        }
      } catch (calendarError) {
        console.error('📅 Calendar event creation failed:', calendarError.message);
        // Don't fail the webhook if calendar fails
      }
    } else {
      console.log('📅 Calendar event already exists:', booking.calendar_event_id);
    }

    // Send confirmation emails (if payment method was card)
    if (booking.payment_method === 'card') {
      try {
        console.log('📧 Sending confirmation emails...');
        await sendConfirmationEmails(booking);
        console.log('✅ Confirmation emails sent successfully');
      } catch (emailError) {
        console.error('📧 Email sending failed:', emailError.message);
        // Don't fail the webhook if email fails
      }
    }

    console.log('🎉 Payment success handling completed:', {
      bookingId,
      status: 'confirmed',
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('❌ Error handling payment success:', error);
    throw error;
  }
}

async function handlePaymentFailure(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;

  if (!bookingId) {
    throw new Error('Missing booking ID in payment intent metadata');
  }

  console.log('❌ Payment failed for booking:', bookingId);

  try {
    await updateBookingStatus(bookingId, 'payment_failed', {
      payment_intent_id: paymentIntent.id,
      failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
    });

    console.log('✅ Booking status updated to payment_failed');

  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
    throw error;
  }
}
// Replace the handlePaymentSuccess function
async function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;

  console.log('🎯 [WEBHOOK] Payment success for booking:', bookingId);
  console.log('🎯 [WEBHOOK] Payment intent:', {
    id: paymentIntent.id,
    amount: paymentIntent.amount,
    metadata: paymentIntent.metadata
  });

  if (!bookingId) {
    console.error('❌ [WEBHOOK] No booking ID in payment intent metadata');
    throw new Error('Missing booking ID in payment intent metadata');
  }

  try {
    // CRITICAL: Try to get booking with detailed logging
    console.log('📖 [WEBHOOK] Fetching booking from database...');
    const booking = await getBooking(bookingId);

    if (!booking) {
      console.error('❌ [WEBHOOK] Booking not found in database:', bookingId);

      // Try to find by payment_intent_id as fallback
      console.log('🔄 [WEBHOOK] Trying to find booking by payment_intent_id...');
      const { supabase } = await import('../../../lib/database.js');
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
    await updateBookingStatus(bookingId, 'confirmed', {
      payment_intent_id: paymentIntent.id,
      payment_confirmed_at: new Date().toISOString(),
    });

    console.log('✅ [WEBHOOK] Booking status updated to confirmed');

    // Re-fetch to get updated booking
    const updatedBooking = await getBooking(bookingId);

    // Create calendar event (if not already created)
    if (!updatedBooking.calendar_event_id) {
      try {
        console.log('📅 [WEBHOOK] Creating calendar event...');
        const calendarEvent = await createCalendarEvent(updatedBooking);

        if (calendarEvent && calendarEvent.id) {
          await updateBookingStatus(bookingId, 'confirmed', {
            calendar_event_id: calendarEvent.id,
            updated_at: new Date().toISOString()
          });

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

    console.log('🎉 [WEBHOOK] Payment success handling completed');

  } catch (error) {
    console.error('❌ [WEBHOOK] Error in handlePaymentSuccess:', error);
    console.error('❌ [WEBHOOK] Error stack:', error.stack);
    throw error;
  }
}

// Test endpoint to verify webhook is reachable
export async function GET() {
  return Response.json({
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '3.0.0'
  });
}