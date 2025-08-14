import { stripe } from '../../../lib/stripe-config.js';
import { updateBookingStatus, getBooking } from '../../../lib/database.js';
import { createCalendarEvent } from '../../../lib/calendar.js';
import { sendConfirmationEmails } from '../../../lib/email.js';
import { headers } from 'next/headers';

export async function POST(request) {
  const body = await request.text();
  const headersList = headers();
  const signature = headersList.get('stripe-signature');
  
  let event;
  
  try {
    // Verify webhook signature for security
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    console.log('🔔 Stripe webhook received:', event.type);
    
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  try {
    // Handle different webhook events
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
        
      case 'payment_intent.processing':
        await handlePaymentProcessing(event.data.object);
        break;
        
      default:
        console.log('Unhandled webhook event:', event.type);
    }
    
    return Response.json({ received: true });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Webhook handler functions
async function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  if (!bookingId) {
    console.error('No booking ID in payment intent metadata');
    return;
  }
  
  console.log('✅ Payment succeeded for booking:', bookingId);
  
  // Update booking status
  await updateBookingStatus(bookingId, 'confirmed', {
    payment_intent_id: paymentIntent.id,
    payment_confirmed_at: new Date().toISOString(),
    amount_paid: paymentIntent.amount,
    payment_method_type: paymentIntent.payment_method?.type,
  });
  
  // Get booking for email/calendar
  const booking = await getBooking(bookingId);
  if (booking) {
    // Send confirmations and create calendar event
    await Promise.all([
      createCalendarEvent(booking, true),
      sendConfirmationEmails(booking)
    ]);
  }
}

async function handlePaymentFailure(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  console.log('❌ Payment failed for booking:', bookingId);
  
  await updateBookingStatus(bookingId, 'payment_failed', {
    payment_intent_id: paymentIntent.id,
    failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
  });
}

async function handlePaymentProcessing(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  console.log('⏳ Payment processing for booking:', bookingId);
  
  await updateBookingStatus(bookingId, 'payment_processing', {
    payment_intent_id: paymentIntent.id,
  });
}