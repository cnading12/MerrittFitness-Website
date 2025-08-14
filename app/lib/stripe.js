// app/lib/stripe.js
import Stripe from 'stripe';
import { getBooking, updateBookingStatus, updateBookingWithCalendarEvent } from './database.js';
import { createCalendarEvent } from './calendar.js';
import { sendConfirmationEmails, sendPaymentFailureEmail } from './email.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createPaymentIntent(bookingId, amount, booking) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // amount in cents
      currency: 'usd',
      metadata: {
        bookingId: bookingId,
        eventName: booking.event_name,
        customerEmail: booking.email
      },
      receipt_email: booking.email,
      description: `Event booking: ${booking.event_name} on ${booking.event_date}`,
      automatic_payment_methods: {
        enabled: true,
      }
    });

    console.log('Payment intent created:', paymentIntent.id);
    return paymentIntent;
  } catch (error) {
    console.error('Payment intent creation error:', error);
    throw error;
  }
}

export async function createACHSetupIntent(customerInfo, bookingId, amount) {
  try {
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: customerInfo.email,
      name: customerInfo.contactName,
      phone: customerInfo.phone,
      metadata: {
        bookingId: bookingId
      }
    });

    // Create setup intent for ACH
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['us_bank_account'],
      usage: 'off_session',
      metadata: {
        bookingId: bookingId,
        amount: amount.toString()
      }
    });

    console.log('ACH setup intent created:', setupIntent.id);
    return {
      setupIntent,
      customer
    };
  } catch (error) {
    console.error('ACH setup intent creation error:', error);
    throw error;
  }
}

export async function processQuickBooksPayment(bookingId, amount, booking) {
  try {
    // For QuickBooks integration, you would typically:
    // 1. Create an invoice in QuickBooks
    // 2. Send payment link to customer
    // 3. Handle webhook from QuickBooks when paid
    
    // For now, we'll simulate the process
    console.log('QuickBooks payment initiated for booking:', bookingId);
    
    // In a real implementation, you'd integrate with QuickBooks API here
    // This is a placeholder for the QuickBooks workflow
    
    return {
      success: true,
      paymentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/pay/quickbooks?booking=${bookingId}`,
      message: 'QuickBooks payment link will be sent via email'
    };
  } catch (error) {
    console.error('QuickBooks payment error:', error);
    throw error;
  }
}

// Webhook handlers
export async function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  try {
    console.log(`Processing payment success for booking: ${bookingId}`);
    
    // Get booking details
    const booking = await getBooking(bookingId);
    if (!booking) {
      console.error('Booking not found for payment success:', bookingId);
      return;
    }
    
    // Update booking status
    await updateBookingStatus(bookingId, 'confirmed', {
      payment_confirmed_at: new Date().toISOString(),
      payment_intent_id: paymentIntent.id
    });

    // Create calendar event
    const calendarEvent = await createCalendarEvent(booking, true); // true = include attendees for real bookings
    
    // Update booking with calendar event ID
    await updateBookingWithCalendarEvent(bookingId, calendarEvent.id);

    // Send confirmation emails
    await sendConfirmationEmails(booking);
    
    console.log(`Payment success processing completed for booking: ${bookingId}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

export async function handleACHSetupSuccess(setupIntent) {
  const bookingId = setupIntent.metadata.bookingId;
  const amount = parseInt(setupIntent.metadata.amount);
  
  try {
    console.log(`Processing ACH setup success for booking: ${bookingId}`);
    
    // Create payment intent for the ACH payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      customer: setupIntent.customer,
      payment_method: setupIntent.payment_method,
      confirmation_method: 'automatic',
      confirm: true,
      metadata: {
        bookingId: bookingId
      }
    });
    
    // Update booking status
    await updateBookingStatus(bookingId, 'ach_processing', {
      setup_intent_id: setupIntent.id,
      payment_intent_id: paymentIntent.id
    });
    
    console.log(`ACH payment initiated for booking: ${bookingId}`);
  } catch (error) {
    console.error('Error handling ACH setup success:', error);
  }
}

export async function handlePaymentFailure(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  try {
    console.log(`Processing payment failure for booking: ${bookingId}`);
    
    // Get booking details
    const booking = await getBooking(bookingId);
    if (!booking) {
      console.error('Booking not found for payment failure:', bookingId);
      return;
    }
    
    // Update booking status
    await updateBookingStatus(bookingId, 'payment_failed', {
      payment_failed_at: new Date().toISOString(),
      payment_intent_id: paymentIntent.id,
      failure_reason: paymentIntent.last_payment_error?.message || 'Unknown error'
    });
    
    // Send failure notification email
    await sendPaymentFailureEmail(booking);
    
    console.log(`Payment failure processed for booking: ${bookingId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

export async function handleSetupIntentFailure(setupIntent) {
  const bookingId = setupIntent.metadata.bookingId;
  
  try {
    console.log(`Processing setup intent failure for booking: ${bookingId}`);
    
    // Update booking status
    await updateBookingStatus(bookingId, 'ach_setup_failed', {
      setup_intent_id: setupIntent.id,
      failure_reason: setupIntent.last_setup_error?.message || 'ACH setup failed'
    });
    
    console.log(`Setup intent failure processed for booking: ${bookingId}`);
  } catch (error) {
    console.error('Error handling setup intent failure:', error);
  }
}

// Utility functions
export async function refundPayment(paymentIntentId, amount = null, reason = 'requested_by_customer') {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount, // If null, refunds full amount
      reason: reason
    });
    
    console.log('Refund created:', refund.id);
    return refund;
  } catch (error) {
    console.error('Refund creation error:', error);
    throw error;
  }
}

export async function getPaymentIntentDetails(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Payment intent retrieval error:', error);
    throw error;
  }
}

export async function createCustomer(customerData) {
  try {
    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      address: customerData.address,
      metadata: customerData.metadata || {}
    });
    
    console.log('Stripe customer created:', customer.id);
    return customer;
  } catch (error) {
    console.error('Customer creation error:', error);
    throw error;
  }
}

export async function listPaymentMethods(customerId) {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    
    return paymentMethods;
  } catch (error) {
    console.error('Payment methods retrieval error:', error);
    throw error;
  }
}

// Export stripe instance for direct use if needed
export { stripe };