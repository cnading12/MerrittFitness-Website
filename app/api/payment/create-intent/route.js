import { createSecurePaymentIntent, calculatePaymentDetails } from '../../../lib/stripe-config.js';
import { getBooking } from '../../../lib/database.js';
import { headers } from 'next/headers';

export async function POST(request) {
  try {
    // FIXED: Await headers before using
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