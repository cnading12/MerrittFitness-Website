// app/api/payment/create-intent/route.js
import { createSecurePaymentIntent, calculatePaymentDetails } from '../../../lib/stripe-config.js';
import { getBooking } from '../../../lib/database.js';
import { headers } from 'next/headers';

export async function POST(request) {
  try {
    // Security: Rate limiting check
    const headersList = headers();
    const userIP = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    
    console.log('💳 Creating payment intent from IP:', userIP);
    
    const { bookingId, paymentMethod = 'card' } = await request.json();
    
    // Validate required fields
    if (!bookingId) {
      return Response.json({ error: 'Booking ID required' }, { status: 400 });
    }
    
    // Get booking details from database
    const booking = await getBooking(bookingId);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    // Security: Check booking status
    if (booking.status === 'confirmed') {
      return Response.json({ error: 'Booking already paid' }, { status: 400 });
    }
    
    if (booking.status === 'cancelled') {
      return Response.json({ error: 'Booking cancelled' }, { status: 400 });
    }
    
    // Calculate payment details
    const paymentDetails = calculatePaymentDetails(booking.total_amount, paymentMethod);
    
    // Create secure payment intent
    const paymentIntent = await createSecurePaymentIntent({
      id: booking.id,
      total: booking.total_amount,
      eventName: booking.event_name,
      selectedDate: booking.event_date,
      selectedTime: booking.event_time,
      email: booking.email,
      contactName: booking.contact_name,
    }, paymentMethod);
    
    // Log for security monitoring
    console.log('✅ Payment intent created:', {
      bookingId: booking.id,
      amount: booking.total_amount,
      paymentMethod,
      paymentIntentId: paymentIntent.id,
      customerEmail: booking.email,
      timestamp: new Date().toISOString(),
    });
    
    return Response.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentDetails,
      booking: {
        id: booking.id,
        eventName: booking.event_name,
        eventDate: booking.event_date,
        eventTime: booking.event_time,
        totalAmount: booking.total_amount,
      }
    });
    
  } catch (error) {
    console.error('❌ Payment intent creation failed:', error);
    
    // Security: Don't expose internal errors
    const userError = error.message.includes('Minimum payment') || error.message.includes('Maximum payment') 
      ? error.message 
      : 'Payment setup failed. Please try again.';
    
    return Response.json({ 
      success: false,
      error: userError 
    }, { status: 500 });
  }
}

// app/api/payment/confirm/route.js
import { confirmPaymentWithSecurity } from '../../../lib/stripe-config.js';
import { updateBookingStatus } from '../../../lib/database.js';
import { createCalendarEvent } from '../../../lib/calendar.js';
import { sendConfirmationEmails } from '../../../lib/email.js';

export async function POST(request) {
  try {
    const { paymentIntentId, paymentMethodId, bookingId } = await request.json();
    
    // Validate required fields
    if (!paymentIntentId || !bookingId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    console.log('🔒 Confirming payment:', { paymentIntentId, bookingId });
    
    // Get booking for confirmation
    const booking = await getBooking(bookingId);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    // Confirm payment with Stripe
    const paymentIntent = await confirmPaymentWithSecurity(
      paymentIntentId, 
      paymentMethodId, 
      booking
    );
    
    // Handle different payment statuses
    if (paymentIntent.status === 'succeeded') {
      // Payment successful - update booking
      await updateBookingStatus(bookingId, 'confirmed', {
        payment_intent_id: paymentIntent.id,
        payment_confirmed_at: new Date().toISOString(),
        amount_paid: paymentIntent.amount,
        payment_method_type: paymentIntent.payment_method?.type || 'card',
      });
      
      // Create calendar event and send emails
      try {
        await Promise.all([
          createCalendarEvent(booking, true),
          sendConfirmationEmails(booking)
        ]);
      } catch (emailError) {
        console.error('⚠️ Post-payment actions failed:', emailError);
        // Payment succeeded, so don't fail the response
      }
      
      console.log('✅ Payment confirmed and booking updated:', bookingId);
      
      return Response.json({
        success: true,
        status: 'succeeded',
        booking: { ...booking, status: 'confirmed' }
      });
      
    } else if (paymentIntent.status === 'requires_action') {
      // 3D Secure or other authentication required
      return Response.json({
        success: true,
        status: 'requires_action',
        clientSecret: paymentIntent.client_secret,
        nextAction: paymentIntent.next_action
      });
      
    } else if (paymentIntent.status === 'processing') {
      // ACH payments often go to processing status
      await updateBookingStatus(bookingId, 'payment_processing', {
        payment_intent_id: paymentIntent.id,
        payment_method_type: paymentIntent.payment_method?.type || 'us_bank_account',
      });
      
      return Response.json({
        success: true,
        status: 'processing',
        message: 'Payment is being processed. You will receive confirmation within 1-2 business days.'
      });
      
    } else {
      // Payment failed
      console.error('❌ Payment failed:', paymentIntent.status, paymentIntent.last_payment_error);
      
      await updateBookingStatus(bookingId, 'payment_failed', {
        payment_intent_id: paymentIntent.id,
        failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
      });
      
      return Response.json({
        success: false,
        error: paymentIntent.last_payment_error?.message || 'Payment failed'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Payment confirmation failed:', error);
    
    return Response.json({
      success: false,
      error: 'Payment confirmation failed. Please contact support.'
    }, { status: 500 });
  }
}

// app/api/payment/ach-setup/route.js
import { createSecureCustomer, setupACHPayment } from '../../../lib/stripe-config.js';
import { getBooking, updateBookingStatus } from '../../../lib/database.js';

export async function POST(request) {
  try {
    const { bookingId } = await request.json();
    
    if (!bookingId) {
      return Response.json({ error: 'Booking ID required' }, { status: 400 });
    }
    
    // Get booking details
    const booking = await getBooking(bookingId);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    console.log('🏦 Setting up ACH payment for booking:', bookingId);
    
    // Create Stripe customer
    const customer = await createSecureCustomer({
      email: booking.email,
      contactName: booking.contact_name,
      phone: booking.phone,
      bookingId: booking.id,
    });
    
    // Create ACH setup intent
    const setupIntent = await setupACHPayment(customer.id, booking);
    
    // Update booking with customer ID
    await updateBookingStatus(bookingId, 'ach_setup_required', {
      stripe_customer_id: customer.id,
      setup_intent_id: setupIntent.id,
    });
    
    console.log('✅ ACH setup created:', setupIntent.id);
    
    return Response.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
      setupIntentId: setupIntent.id,
    });
    
  } catch (error) {
    console.error('❌ ACH setup failed:', error);
    
    return Response.json({
      success: false,
      error: 'ACH setup failed. Please try again or use a different payment method.'
    }, { status: 500 });
  }
}

// app/api/payment/webhook/route.js (Stripe webhook endpoint)
import { stripe } from '../../../lib/stripe-config.js';
import { updateBookingStatus, getBooking } from '../../../lib/database.js';
import { createCalendarEvent } from '../../../lib/calendar.js';
import { sendConfirmationEmails } from '../../../lib/email.js';

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
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
        
      case 'setup_intent.succeeded':
        await handleACHSetupSuccess(event.data.object);
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

async function handleACHSetupSuccess(setupIntent) {
  const bookingId = setupIntent.metadata.bookingId;
  
  console.log('🏦 ACH setup completed for booking:', bookingId);
  
  // Now create the actual payment intent for ACH
  const amount = parseInt(setupIntent.metadata.amount);
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    customer: setupIntent.customer,
    payment_method: setupIntent.payment_method,
    confirmation_method: 'automatic',
    confirm: true,
    metadata: {
      bookingId: bookingId,
      originalSetupIntent: setupIntent.id,
    },
  });
  
  await updateBookingStatus(bookingId, 'payment_processing', {
    setup_intent_id: setupIntent.id,
    payment_intent_id: paymentIntent.id,
  });
}

async function handlePaymentProcessing(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  console.log('⏳ Payment processing for booking:', bookingId);
  
  await updateBookingStatus(bookingId, 'payment_processing', {
    payment_intent_id: paymentIntent.id,
  });
}