// app/api/payment/create-intent/route.js
// FIXED VERSION - Compatible with Next.js 15 and proper Stripe configuration

import { stripe } from '../../../lib/stripe-config.js';
import { getBooking, updateBookingStatus } from '../../../lib/database.js';
import { headers } from 'next/headers';

export async function POST(request) {
  try {
    // FIXED: Await headers() for Next.js 15 compatibility
    const headersList = await headers();
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
    
    // Convert amount to cents for Stripe
    const amountInCents = Math.round(parseFloat(booking.total_amount) * 100);
    
    // Validate amount
    if (amountInCents < 50) { // $0.50 minimum
      return Response.json({ error: 'Minimum payment amount is $0.50' }, { status: 400 });
    }
    
    if (amountInCents > 500000) { // $5,000 maximum
      return Response.json({ error: 'Maximum payment amount is $5,000' }, { status: 400 });
    }
    
    // FIXED: Create payment intent without setup_future_usage parameter
    const paymentIntentData = {
      amount: amountInCents,
      currency: 'usd',
      
      // Use automatic payment methods for simplicity
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Keep user on site
      },
      
      // Enhanced metadata for tracking
      metadata: {
        bookingId: booking.id,
        eventName: booking.event_name,
        eventDate: booking.event_date,
        eventTime: booking.event_time,
        customerEmail: booking.email,
        customerName: booking.contact_name,
        businessName: booking.business_name || '',
        timestamp: new Date().toISOString(),
      },
      
      // Customer information
      receipt_email: booking.email,
      description: `Merritt Fitness: ${booking.event_name} on ${booking.event_date}`,
      
      // Statement descriptor (what shows on customer's bank statement)
      statement_descriptor: 'MERRITT FITNESS',
      statement_descriptor_suffix: 'EVENT',
      
      // Capture immediately for events
      capture_method: 'automatic',
      
      // REMOVED: setup_future_usage - this was causing the error
      // We don't need to store payment methods for future use
    };
    
    console.log('🔄 Creating Stripe payment intent with data:', {
      amount: amountInCents,
      currency: 'usd',
      bookingId: booking.id,
      customerEmail: booking.email
    });
    
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
    
    // Update booking with payment intent ID
    await updateBookingStatus(booking.id, 'payment_processing', {
      payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString(),
    });
    
    // Calculate fees for transparency
    const stripeFee = Math.round(amountInCents * 0.029) + 30; // 2.9% + 30¢
    
    // Log for security monitoring
    console.log('✅ Payment intent created successfully:', {
      paymentIntentId: paymentIntent.id,
      bookingId: booking.id,
      amount: booking.total_amount,
      customerEmail: booking.email,
      timestamp: new Date().toISOString(),
    });
    
    return Response.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInCents,
      amountDisplay: booking.total_amount,
      stripeFee: stripeFee,
      booking: {
        id: booking.id,
        eventName: booking.event_name,
        eventDate: booking.event_date,
        eventTime: booking.event_time,
        totalAmount: booking.total_amount,
        customerEmail: booking.email,
        customerName: booking.contact_name,
      }
    });
    
  } catch (error) {
    console.error('❌ Payment intent creation failed:', error);
    
    // Security: Don't expose internal errors
    let userMessage = 'Payment setup failed. Please try again.';
    
    if (error.type === 'StripeCardError') {
      userMessage = error.message;
    } else if (error.message.includes('amount')) {
      userMessage = error.message;
    } else if (error.type === 'StripeInvalidRequestError') {
      // Handle Stripe parameter errors
      userMessage = 'Payment configuration error. Please contact support.';
      console.error('Stripe parameter error:', {
        type: error.type,
        code: error.code,
        param: error.param,
        message: error.message
      });
    }
    
    return Response.json({ 
      success: false,
      error: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// Handle preflight requests
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