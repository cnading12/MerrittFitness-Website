// app/api/webhooks/stripe/route.js
// FIXED VERSION 5.2 - Handles 307 redirects

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createCalendarEvent } from '../../../lib/calendar.js';
import {
  sendBookingConfirmation,
  sendManagerNotification,
  sendClientOnboarding,
  sendRecurringSetupEmails,
} from '../../../lib/email.js';

// Resend's free plan caps at ~2 requests/sec. Space individual sends out so a
// group of bookings doesn't burst past the limit.
const EMAIL_RATE_LIMIT_DELAY_MS = 1000;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
import { finalizeRecurringSetup } from '../../../lib/recurring-billing.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// CRITICAL: Configuration to prevent Next.js issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'iad1';

export async function POST(request) {
  // SUPER VISIBLE LOGGING
  console.log('🚨 WEBHOOK HANDLER REACHED - If you see this, no redirect!');
  console.log('🚨 Request URL:', request.url);
  console.log('🚨 Request method:', request.method);
  
  let body;
  let signature;
  
  try {
    // Get raw body as text
    body = await request.text();
    console.log('📦 [WEBHOOK] Body received, length:', body.length);
    
    // Get stripe signature from headers
    signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('❌ [WEBHOOK] No Stripe signature found in headers');
      console.error('📋 [WEBHOOK] Available headers:', 
        Array.from(request.headers.entries()).map(([k,v]) => k)
      );
      return Response.json({ error: 'No signature' }, { status: 400 });
    }
    
    console.log('✅ [WEBHOOK] Stripe signature found');
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error reading webhook request:', error);
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  
  let event;
  
  try {
    // Verify webhook signature
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ [WEBHOOK] STRIPE_WEBHOOK_SECRET not configured!');
      return Response.json({ 
        error: 'Webhook secret not configured' 
      }, { status: 500 });
    }
    
    console.log('🔐 [WEBHOOK] Verifying webhook signature...');
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    console.log('✅ [WEBHOOK] Webhook verified successfully');
    console.log('📋 [WEBHOOK] Event type:', event.type);
    console.log('📋 [WEBHOOK] Event ID:', event.id);
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Webhook signature verification failed');
    console.error('❌ [WEBHOOK] Error:', error.message);
    console.error('💡 [WEBHOOK] Check that STRIPE_WEBHOOK_SECRET matches Stripe dashboard');
    return Response.json({ 
      error: 'Invalid signature',
      details: error.message
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
        console.log('⏳ [WEBHOOK] Processing payment processing status...');
        await handlePaymentProcessing(event.data.object);
        break;

      case 'setup_intent.succeeded':
        console.log('🏦 [WEBHOOK] Processing setup intent success...');
        await handleSetupIntentSucceeded(event.data.object);
        break;

      default:
        console.log('ℹ️ [WEBHOOK] Unhandled event type:', event.type);
        return Response.json({ 
          received: true, 
          handled: false,
          message: `Event type ${event.type} not handled`
        }, { status: 200 });
    }
    
    console.log('✅ [WEBHOOK] Webhook processed successfully');
    console.log('🔔 [WEBHOOK] ========================================');
    
    // Return detailed status for debugging
    return Response.json({ 
      received: true, 
      handled: true,
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString(),
      debug: {
        bookingId: event.data.object.metadata?.bookingId,
        processingComplete: true,
        emailAttempted: true,
        version: '5.1.0'
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Webhook processing error:', error);
    console.error('❌ [WEBHOOK] Stack:', error.stack);
    
    // Return 200 to prevent Stripe from retrying
    // But log the error prominently
    return Response.json({ 
      received: true,
      error: 'Processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    }, { status: 200 });
  }
}

// IMPROVED: Better booking lookup with multiple fallback strategies
async function findBooking(bookingId, paymentIntentId) {
  console.log('🔍 [WEBHOOK] Looking up booking...');
  console.log('🔍 [WEBHOOK] Booking ID:', bookingId);
  console.log('🔍 [WEBHOOK] Payment Intent ID:', paymentIntentId);
  
  // Strategy 1: Direct ID lookup
  try {
    console.log('📊 [WEBHOOK] Strategy 1: Direct ID lookup');
    const { data: booking1, error: error1 } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
    
    if (booking1 && !error1) {
      console.log('✅ [WEBHOOK] Found booking by ID:', booking1.id);
      return booking1;
    }
    
    console.log('⚠️ [WEBHOOK] Strategy 1 failed:', error1?.message || 'No booking found');
  } catch (e) {
    console.log('⚠️ [WEBHOOK] Strategy 1 error:', e.message);
  }
  
  // Strategy 2: Lookup by payment_intent_id
  try {
    console.log('📊 [WEBHOOK] Strategy 2: Payment intent lookup');
    const { data: booking2, error: error2 } = await supabase
      .from('bookings')
      .select('*')
      .eq('payment_intent_id', paymentIntentId)
      .single();
    
    if (booking2 && !error2) {
      console.log('✅ [WEBHOOK] Found booking by payment_intent_id:', booking2.id);
      return booking2;
    }
    
    console.log('⚠️ [WEBHOOK] Strategy 2 failed:', error2?.message || 'No booking found');
  } catch (e) {
    console.log('⚠️ [WEBHOOK] Strategy 2 error:', e.message);
  }
  
  // Strategy 3: List recent bookings with pending payment status
  try {
    console.log('📊 [WEBHOOK] Strategy 3: Recent pending bookings');
    const { data: recentBookings, error: error3 } = await supabase
      .from('bookings')
      .select('*')
      .in('status', ['pending_payment', 'payment_processing'])
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (recentBookings && recentBookings.length > 0) {
      console.log(`📋 [WEBHOOK] Found ${recentBookings.length} recent pending bookings`);
      
      // Try to match by booking ID
      const match = recentBookings.find(b => b.id === bookingId);
      if (match) {
        console.log('✅ [WEBHOOK] Found booking in recent list:', match.id);
        return match;
      }
      
      console.log('⚠️ [WEBHOOK] Booking not in recent list');
      console.log('📋 [WEBHOOK] Recent booking IDs:', 
        recentBookings.map(b => b.id).join(', ')
      );
    }
  } catch (e) {
    console.log('⚠️ [WEBHOOK] Strategy 3 error:', e.message);
  }
  
  console.error('❌ [WEBHOOK] All lookup strategies failed');
  console.error('💡 [WEBHOOK] Booking might not exist or database connection failed');
  return null;
}

// Stripe payment intent metadata only carries the FIRST booking's id when the
// renter books a multi-event group, but the booking row plus all its siblings
// share a `master_booking_id`. Fetch the group so we confirm, calendar, and
// email every booking — not just the one Stripe handed us.
async function fetchBookingGroup(seedBooking) {
  if (!seedBooking.master_booking_id) {
    console.log('📋 [WEBHOOK] Single booking (no master_booking_id)');
    return [seedBooking];
  }

  console.log('🔗 [WEBHOOK] Fetching booking group by master_booking_id:', seedBooking.master_booking_id);

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('master_booking_id', seedBooking.master_booking_id)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('❌ [WEBHOOK] Failed to fetch booking group, falling back to seed:', error);
    return [seedBooking];
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ [WEBHOOK] Group query returned no rows, using seed booking');
    return [seedBooking];
  }

  console.log(`✅ [WEBHOOK] Found ${data.length} bookings in group`);
  return data;
}

// Atomically transition a single booking to confirmed. Returns the freshly
// updated row, or null if the booking was ALREADY confirmed (so retried Stripe
// webhooks don't re-create calendar events or re-send emails for the same
// booking).
async function confirmBooking(booking, paymentIntent) {
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_intent_id: paymentIntent.id,
      payment_confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id)
    .neq('status', 'confirmed')
    .select();

  if (error) {
    console.error(`❌ [WEBHOOK] Failed to confirm booking ${booking.id}:`, error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log(`⏭️ [WEBHOOK] Booking ${booking.id} was already confirmed — skipping`);
    return null;
  }

  return data[0];
}

async function ensureCalendarEvent(booking) {
  if (booking.calendar_event_id) {
    console.log(`📅 [WEBHOOK] Calendar event already exists for ${booking.id}:`, booking.calendar_event_id);
    return;
  }

  try {
    console.log(`📅 [WEBHOOK] Creating calendar event for ${booking.id} (${booking.event_date} ${booking.event_time})...`);
    const calendarEvent = await createCalendarEvent(booking);

    if (calendarEvent && calendarEvent.id) {
      await supabase
        .from('bookings')
        .update({
          calendar_event_id: calendarEvent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);
      console.log(`✅ [WEBHOOK] Calendar event created for ${booking.id}:`, calendarEvent.id);
    }
  } catch (calendarError) {
    // Calendar failure should not block other bookings or emails — log and continue.
    console.error(`⚠️ [WEBHOOK] Calendar event failed for ${booking.id} (non-critical):`, calendarError.message);
  }
}

async function sendBookingEmails(booking, { sendOnboarding }) {
  const errors = [];

  try {
    await sendBookingConfirmation(booking);
    console.log(`✅ [WEBHOOK] Customer confirmation sent for ${booking.id} (${booking.event_date})`);
  } catch (err) {
    console.error(`❌ [WEBHOOK] Customer confirmation failed for ${booking.id}:`, err.message);
    errors.push(`customer:${booking.id}:${err.message}`);
  }
  await delay(EMAIL_RATE_LIMIT_DELAY_MS);

  try {
    await sendManagerNotification(booking);
    console.log(`✅ [WEBHOOK] Manager notification sent for ${booking.id} (${booking.event_date})`);
  } catch (err) {
    console.error(`❌ [WEBHOOK] Manager notification failed for ${booking.id}:`, err.message);
    errors.push(`manager:${booking.id}:${err.message}`);
  }
  await delay(EMAIL_RATE_LIMIT_DELAY_MS);

  // The onboarding email is generic welcome / policy material — the renter
  // only needs it once per booking group, not once per date.
  if (sendOnboarding) {
    try {
      await sendClientOnboarding(booking);
      console.log(`✅ [WEBHOOK] Client onboarding sent (once for group)`);
    } catch (err) {
      console.error(`❌ [WEBHOOK] Client onboarding failed:`, err.message);
      errors.push(`onboarding:${booking.id}:${err.message}`);
    }
    await delay(EMAIL_RATE_LIMIT_DELAY_MS);
  }

  return errors;
}

async function handlePaymentSuccess(paymentIntent) {
  console.log('');
  console.log('💰 [WEBHOOK] ========================================');
  console.log('💰 [WEBHOOK] PAYMENT SUCCESS HANDLER');
  console.log('💰 [WEBHOOK] ========================================');

  const bookingId = paymentIntent.metadata?.bookingId;

  console.log('📋 [WEBHOOK] Payment Intent Details:');
  console.log('   ID:', paymentIntent.id);
  console.log('   Amount:', paymentIntent.amount);
  console.log('   Status:', paymentIntent.status);
  console.log('   Metadata:', paymentIntent.metadata);

  if (!bookingId) {
    console.error('❌ [WEBHOOK] No bookingId in payment intent metadata!');
    throw new Error('Missing bookingId in payment intent metadata');
  }

  console.log('🎯 [WEBHOOK] Seed booking ID from metadata:', bookingId);

  try {
    const seedBooking = await findBooking(bookingId, paymentIntent.id);
    if (!seedBooking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    console.log('✅ [WEBHOOK] Seed booking found:', {
      id: seedBooking.id,
      event: seedBooking.event_name,
      email: seedBooking.email,
      master_booking_id: seedBooking.master_booking_id,
      status: seedBooking.status,
    });

    const bookings = await fetchBookingGroup(seedBooking);

    if (!process.env.RESEND_API_KEY) {
      console.error('⚠️ [WEBHOOK] RESEND_API_KEY not set — emails will fail but DB + calendar will still update');
    }

    let onboardingPending = true;
    const allEmailErrors = [];
    let confirmedCount = 0;

    // Process every booking in the group sequentially so calendar inserts and
    // email sends stay below provider rate limits.
    for (const booking of bookings) {
      console.log('');
      console.log(`🎯 [WEBHOOK] Processing booking ${booking.id} (${booking.event_date} ${booking.event_time})`);

      const confirmed = await confirmBooking(booking, paymentIntent);
      if (!confirmed) {
        // Already-confirmed booking — skip side effects entirely so a retried
        // webhook doesn't double-book the calendar or double-send emails.
        continue;
      }
      confirmedCount += 1;

      await ensureCalendarEvent(confirmed);

      const emailErrors = await sendBookingEmails(confirmed, {
        sendOnboarding: onboardingPending,
      });
      if (onboardingPending && emailErrors.every((e) => !e.startsWith('onboarding:'))) {
        onboardingPending = false;
      }
      allEmailErrors.push(...emailErrors);
    }

    console.log('');
    console.log('📊 [WEBHOOK] Group processing summary:');
    console.log('   Bookings in group:', bookings.length);
    console.log('   Newly confirmed this run:', confirmedCount);
    console.log('   Email errors:', allEmailErrors.length);
    if (allEmailErrors.length > 0) {
      console.error('   Errors:', allEmailErrors);
    }

    console.log('🎉 [WEBHOOK] Payment success handling complete');
  } catch (error) {
    console.error('❌ [WEBHOOK] Payment success handling failed:', error);
    console.error('❌ [WEBHOOK] Stack:', error.stack);
    throw error;
  }
}

// Returns a Supabase filter that selects either the single seed booking row
// (when it has no master_booking_id) or every booking row sharing the master
// id (multi-event groups). Lets failure/processing handlers update siblings.
function buildGroupFilter(query, seedBooking) {
  if (seedBooking.master_booking_id) {
    return query.eq('master_booking_id', seedBooking.master_booking_id);
  }
  return query.eq('id', seedBooking.id);
}

async function handlePaymentFailure(paymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    throw new Error('Missing bookingId in payment intent metadata');
  }

  console.log('❌ [WEBHOOK] Payment failed for booking:', bookingId);

  try {
    const seedBooking = await findBooking(bookingId, paymentIntent.id);
    if (!seedBooking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    const baseQuery = supabase
      .from('bookings')
      .update({
        status: 'payment_failed',
        payment_intent_id: paymentIntent.id,
        failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
        updated_at: new Date().toISOString(),
      });

    const { data, error } = await buildGroupFilter(baseQuery, seedBooking)
      .neq('status', 'confirmed')
      .select();

    if (error) throw error;

    console.log(`✅ [WEBHOOK] ${data?.length || 0} bookings marked as payment_failed`);
  } catch (error) {
    console.error('❌ [WEBHOOK] Failed to update booking status:', error);
    throw error;
  }
}

async function handlePaymentProcessing(paymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    throw new Error('Missing bookingId in payment intent metadata');
  }

  console.log('⏳ [WEBHOOK] Payment processing for booking:', bookingId);

  try {
    const seedBooking = await findBooking(bookingId, paymentIntent.id);
    if (!seedBooking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    const baseQuery = supabase
      .from('bookings')
      .update({
        status: 'payment_processing',
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      });

    const { data, error } = await buildGroupFilter(baseQuery, seedBooking)
      .neq('status', 'confirmed')
      .select();

    if (error) throw error;

    console.log(`✅ [WEBHOOK] ${data?.length || 0} bookings marked as payment_processing`);
  } catch (error) {
    console.error('❌ [WEBHOOK] Failed to update booking status:', error);
    throw error;
  }
}

// Safety net for recurring bookings: if the client-side finalize call fails
// (tab closed, network drop, ACH processing delay), this webhook re-runs the
// same idempotent subscription-creation helper. Only acts on SetupIntents
// tagged with applicationType=recurring so ad-hoc SetupIntents are ignored.
async function handleSetupIntentSucceeded(setupIntent) {
  const { bookingId, applicationType } = setupIntent.metadata || {};

  if (applicationType !== 'recurring') {
    console.log('ℹ️ [WEBHOOK] Non-recurring SetupIntent, ignoring.');
    return;
  }

  if (!bookingId) {
    console.error('❌ [WEBHOOK] Recurring SetupIntent missing bookingId metadata');
    throw new Error('Missing bookingId in recurring SetupIntent metadata');
  }

  console.log('🔁 [WEBHOOK] Finalizing recurring setup for booking:', bookingId);

  const { booking, alreadyDone } = await finalizeRecurringSetup({
    bookingId,
    setupIntentId: setupIntent.id,
  });

  if (alreadyDone) {
    console.log('✅ [WEBHOOK] Recurring setup already complete — no action taken.');
    return;
  }

  console.log('✅ [WEBHOOK] Recurring subscription created via webhook safety net');

  try {
    await sendRecurringSetupEmails(booking);
    console.log('📧 [WEBHOOK] Recurring setup emails sent');
  } catch (err) {
    console.error('⚠️ [WEBHOOK] Recurring setup emails failed:', err.message);
  }
}

// Health check endpoint
export async function GET() {
  return Response.json({
    status: 'active',
    message: 'Stripe webhook endpoint is ready',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    configuration: {
      webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      stripeKey: !!process.env.STRIPE_SECRET_KEY,
      resendKey: !!process.env.RESEND_API_KEY,
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseKey: !!process.env.SUPABASE_ANON_KEY
    },
    version: '5.0.0 - Fixed 307 Redirects + Improved DB Lookup'
  });
}