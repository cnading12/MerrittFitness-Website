// app/api/webhooks/stripe/route.js
// FIXED VERSION - Proper calendar integration on payment success

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

// FIXED: Enhanced payment success handler with calendar integration
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
    
    // Get booking details
    console.log('📖 Fetching booking details...');
    const booking = await getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }
    
    console.log('✅ Booking found:', booking.event_name);
    
    // FIXED: Create calendar event immediately after payment success
    let calendarEventId = null;
    try {
      console.log('📅 Creating calendar event...');
      const calendarEvent = await createCalendarEvent(booking, true);
      
      if (calendarEvent && calendarEvent.id) {
        calendarEventId = calendarEvent.id;
        
        // Update booking with calendar event ID
        await updateBookingStatus(bookingId, 'confirmed', {
          calendar_event_id: calendarEventId,
          updated_at: new Date().toISOString()
        });
        
        console.log('✅ Calendar event created and linked:', calendarEventId);
      }
    } catch (calendarError) {
      console.error('📅 Calendar event creation failed:', calendarError.message);
      // Don't fail the webhook, but log the error
    }
    
    // Send confirmation emails
    try {
      console.log('📧 Sending confirmation emails...');
      await sendConfirmationEmails(booking);
      console.log('✅ Confirmation emails sent successfully');
    } catch (emailError) {
      console.error('📧 Email sending failed:', emailError.message);
      // Don't fail the webhook, but log the error
    }
    
    console.log('🎉 Payment success handling completed:', {
      bookingId,
      calendarEventCreated: !!calendarEventId,
      status: 'confirmed'
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

async function handlePaymentProcessing(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  if (!bookingId) {
    throw new Error('Missing booking ID in payment intent metadata');
  }
  
  console.log('⏳ Payment processing for booking:', bookingId);
  
  try {
    await updateBookingStatus(bookingId, 'payment_processing', {
      payment_intent_id: paymentIntent.id,
    });
    
    console.log('✅ Booking status updated to payment_processing');
    
  } catch (error) {
    console.error('❌ Error handling payment processing:', error);
    throw error;
  }
}

export async function GET() {
  return Response.json({
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '3.0.0'
  });
}