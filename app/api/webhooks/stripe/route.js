import { stripe } from '../../../lib/stripe-config.js';
import { updateBookingStatus, getBooking } from '../../../lib/database.js';
import { createCalendarEvent } from '../../../lib/calendar.js';
import { sendConfirmationEmails } from '../../../lib/email.js';
import { headers } from 'next/headers';

export async function POST(request) {
  console.log('🔔 Webhook endpoint hit');
  
  let body;
  let signature;
  
  try {
    // Get raw body - critical for webhook signature verification
    body = await request.text();
    console.log('📝 Raw body length:', body.length);
    
    // FIXED: Await headers before using
    const headersList = await headers();
    signature = headersList.get('stripe-signature');
    console.log('🔐 Signature present:', !!signature);
    
    if (!signature) {
      console.error('❌ No Stripe signature found');
      return Response.json({ error: 'No signature' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Error reading request:', error);
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  
  let event;
  
  try {
    // Verify webhook signature for security
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    console.log('✅ Webhook signature verified. Event type:', event.type, 'ID:', event.id);
    
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error.message);
    return Response.json({ 
      error: 'Invalid signature',
      details: error.message 
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
        
      case 'payment_intent.requires_action':
        console.log('🔐 Processing requires action...');
        await handlePaymentRequiresAction(event.data.object);
        break;
        
      case 'payment_intent.canceled':
        console.log('🚫 Processing payment canceled...');
        await handlePaymentCanceled(event.data.object);
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
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

// Test endpoint to verify webhook is reachable
export async function GET() {
  return Response.json({
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}

// FIXED: Simplified webhook handler with safer database updates
async function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  console.log('🎯 Payment success for booking:', bookingId);
  
  if (!bookingId) {
    console.error('❌ No booking ID in payment intent metadata');
    console.log('📋 Available metadata:', paymentIntent.metadata);
    return;
  }
  
  try {
    // Update booking status with only basic fields first
    console.log('📝 Updating booking status to confirmed...');
    await updateBookingStatus(bookingId, 'confirmed', {
      payment_intent_id: paymentIntent.id,
      payment_confirmed_at: new Date().toISOString(),
      // Skip amount_paid and payment_method_type for now until DB schema is updated
    });
    
    // Get booking for email/calendar
    console.log('📖 Fetching booking details...');
    const booking = await getBooking(bookingId);
    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      return;
    }
    
    console.log('✅ Booking found:', booking.event_name);
    
    // Send confirmations and create calendar event in parallel
    console.log('📧 Sending confirmations and creating calendar event...');
    const [calendarResult, emailResult] = await Promise.allSettled([
      createCalendarEvent(booking, true),
      sendConfirmationEmails(booking)
    ]);
    
    // Log results
    if (calendarResult.status === 'fulfilled') {
      console.log('📅 Calendar event created successfully');
    } else {
      console.error('📅 Calendar event creation failed:', calendarResult.reason?.message);
    }
    
    if (emailResult.status === 'fulfilled') {
      console.log('📧 Confirmation emails sent successfully');
    } else {
      console.error('📧 Email sending failed:', emailResult.reason?.message);
    }
    
    console.log('✅ Payment success handling completed for booking:', bookingId);
    
  } catch (error) {
    console.error('❌ Error handling payment success:', error);
    throw error;
  }
}

async function handlePaymentFailure(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  if (!bookingId) {
    console.error('❌ No booking ID in payment intent metadata');
    return;
  }
  
  console.log('❌ Payment failed for booking:', bookingId);
  
  try {
    await updateBookingStatus(bookingId, 'payment_failed', {
      payment_intent_id: paymentIntent.id,
      failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
      // Skip failure_code for now
    });
    
  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
    throw error;
  }
}

async function handlePaymentProcessing(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  if (!bookingId) {
    console.error('❌ No booking ID in payment intent metadata');
    return;
  }
  
  console.log('⏳ Payment processing for booking:', bookingId);
  
  try {
    await updateBookingStatus(bookingId, 'payment_processing', {
      payment_intent_id: paymentIntent.id,
      // Skip processing_started_at for now
    });
  } catch (error) {
    console.error('❌ Error handling payment processing:', error);
    throw error;
  }
}

async function handlePaymentRequiresAction(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  if (!bookingId) {
    console.error('❌ No booking ID in payment intent metadata');
    return;
  }
  
  console.log('🔐 Payment requires action for booking:', bookingId);
  
  try {
    await updateBookingStatus(bookingId, 'requires_action', {
      payment_intent_id: paymentIntent.id,
      // Skip action_required_at for now
    });
  } catch (error) {
    console.error('❌ Error handling payment requires action:', error);
    throw error;
  }
}

async function handlePaymentCanceled(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  if (!bookingId) {
    console.error('❌ No booking ID in payment intent metadata');
    return;
  }
  
  console.log('🚫 Payment canceled for booking:', bookingId);
  
  try {
    await updateBookingStatus(bookingId, 'canceled', {
      payment_intent_id: paymentIntent.id,
      // Skip canceled_at and cancellation_reason for now
    });
  } catch (error) {
    console.error('❌ Error handling payment cancellation:', error);
    throw error;
  }
}