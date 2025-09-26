// app/api/complete-payment/route.js
// Simple script to complete stuck payments

import { updateBookingStatus, getBooking } from '../../lib/database.js';

export async function POST(request) {
  try {
    const { bookingId } = await request.json();
    
    if (!bookingId) {
      return Response.json({ error: 'Booking ID required' }, { status: 400 });
    }

    console.log('🧪 Completing payment for booking:', bookingId);

    // Get current booking
    const booking = await getBooking(bookingId);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    console.log('📋 Current booking status:', booking.status);

    // Update to confirmed status with minimal data
    await updateBookingStatus(bookingId, 'confirmed', {
      payment_confirmed_at: new Date().toISOString()
    });

    console.log('✅ Booking status updated to confirmed');

    // Get updated booking
    const updatedBooking = await getBooking(bookingId);

    return Response.json({
      success: true,
      message: 'Payment completed successfully',
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        event_name: updatedBooking.event_name,
        payment_confirmed_at: updatedBooking.payment_confirmed_at
      }
    });
    
  } catch (error) {
    console.error('❌ Payment completion error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get('booking_id');
  
  if (!bookingId) {
    return Response.json({
      message: 'Simple payment completion endpoint',
      usage: 'POST /api/complete-payment with {"bookingId": "YOUR_BOOKING_ID"}'
    });
  }
  
  try {
    const booking = await getBooking(bookingId);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    return Response.json({
      booking: {
        id: booking.id,
        status: booking.status,
        event_name: booking.event_name,
        payment_confirmed_at: booking.payment_confirmed_at
      }
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}