// app/api/webhooks/stripe/route.js
// FIXED VERSION - Critical security issues resolved

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
    
    // FIXED: Properly await headers() - CRITICAL SECURITY FIX
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
    // Verify webhook signature for security - CRITICAL
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    console.log('✅ Webhook signature verified. Event type:', event.type, 'ID:', event.id);
    
    // ADDED: Idempotency check to prevent duplicate processing
    const eventId = event.id;
    if (await isEventProcessed(eventId)) {
      console.log('⚠️ Event already processed, skipping:', eventId);
      return Response.json({ 
        received: true, 
        handled: false,
        message: 'Event already processed'
      });
    }
    
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error.message);
    // SECURITY: Log failed signature attempts for monitoring
    await logSecurityEvent('webhook_signature_failed', {
      error: error.message,
      headers: Object.fromEntries(await headers()),
      timestamp: new Date().toISOString()
    });
    
    return Response.json({ 
      error: 'Invalid signature',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Signature verification failed'
    }, { status: 400 });
  }
  
  try {
    // Mark event as being processed
    await markEventAsProcessed(event.id);
    
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
    
    // ADDED: Error logging for monitoring
    await logSecurityEvent('webhook_processing_error', {
      eventType: event.type,
      eventId: event.id,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // SECURITY: Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Webhook processing failed';
    
    return Response.json({ 
      error: 'Webhook processing failed',
      details: errorMessage
    }, { status: 500 });
  }
}

// Test endpoint to verify webhook is reachable
export async function GET() {
  return Response.json({
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '2.0.0' // Updated version
  });
}

// ADDED: Idempotency tracking functions
async function isEventProcessed(eventId) {
  // Simple in-memory cache for development
  // In production, use Redis or database
  if (process.env.NODE_ENV === 'development') {
    return global.processedEvents?.has(eventId) || false;
  }
  
  // TODO: Implement database/Redis check for production
  try {
    const { data } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', eventId)
      .single();
    
    return !!data;
  } catch {
    return false;
  }
}

async function markEventAsProcessed(eventId) {
  if (process.env.NODE_ENV === 'development') {
    global.processedEvents = global.processedEvents || new Set();
    global.processedEvents.add(eventId);
    return;
  }
  
  // TODO: Store in database/Redis for production
  try {
    await supabase
      .from('webhook_events')
      .insert({
        stripe_event_id: eventId,
        processed_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to mark event as processed:', error);
  }
}

async function logSecurityEvent(event, details) {
  console.log(`[SECURITY] ${event}:`, details);
  
  // TODO: Send to monitoring service (Sentry, DataDog, etc.)
  if (process.env.NODE_ENV === 'production') {
    // Example: await sendToMonitoring(event, details);
  }
}

// Enhanced webhook handlers with retry logic
async function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  console.log('🎯 Payment success for booking:', bookingId);
  
  if (!bookingId) {
    console.error('❌ No booking ID in payment intent metadata');
    throw new Error('Missing booking ID in payment intent metadata');
  }
  
  // Retry logic for database operations
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Update booking status
      console.log('📝 Updating booking status to confirmed...');
      await updateBookingStatus(bookingId, 'confirmed', {
        payment_intent_id: paymentIntent.id,
        payment_confirmed_at: new Date().toISOString(),
      });
      
      // Get booking for email/calendar
      console.log('📖 Fetching booking details...');
      const booking = await getBooking(bookingId);
      if (!booking) {
        throw new Error(`Booking not found: ${bookingId}`);
      }
      
      console.log('✅ Booking found:', booking.event_name);
      
      // Send confirmations and create calendar event in parallel
      console.log('📧 Sending confirmations and creating calendar event...');
      const [calendarResult, emailResult] = await Promise.allSettled([
        createCalendarEvent(booking, true),
        sendConfirmationEmails(booking)
      ]);
      
      // Log results but don't fail webhook if these fail
      if (calendarResult.status === 'fulfilled') {
        console.log('📅 Calendar event created successfully');
      } else {
        console.error('📅 Calendar event creation failed:', calendarResult.reason?.message);
        await logSecurityEvent('calendar_creation_failed', {
          bookingId,
          error: calendarResult.reason?.message
        });
      }
      
      if (emailResult.status === 'fulfilled') {
        console.log('📧 Confirmation emails sent successfully');
      } else {
        console.error('📧 Email sending failed:', emailResult.reason?.message);
        await logSecurityEvent('email_sending_failed', {
          bookingId,
          error: emailResult.reason?.message
        });
      }
      
      console.log('✅ Payment success handling completed for booking:', bookingId);
      return; // Success, exit retry loop
      
    } catch (error) {
      retries++;
      console.error(`❌ Error handling payment success (attempt ${retries}/${maxRetries}):`, error);
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
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
    
    // TODO: Send payment failure notification to customer
    
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
  } catch (error) {
    console.error('❌ Error handling payment processing:', error);
    throw error;
  }
}

async function handlePaymentRequiresAction(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  if (!bookingId) {
    throw new Error('Missing booking ID in payment intent metadata');
  }
  
  console.log('🔐 Payment requires action for booking:', bookingId);
  
  try {
    await updateBookingStatus(bookingId, 'requires_action', {
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    console.error('❌ Error handling payment requires action:', error);
    throw error;
  }
}

async function handlePaymentCanceled(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  if (!bookingId) {
    throw new Error('Missing booking ID in payment intent metadata');
  }
  
  console.log('🚫 Payment canceled for booking:', bookingId);
  
  try {
    await updateBookingStatus(bookingId, 'canceled', {
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    console.error('❌ Error handling payment cancellation:', error);
    throw error;
  }
}