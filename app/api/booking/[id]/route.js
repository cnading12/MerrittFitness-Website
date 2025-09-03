// app/api/booking/[id]/route.js
import { getBooking } from '../../../lib/database.js';

export async function GET(request, context) {
  try {
    // FIXED: Properly await params in Next.js 15
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    
    console.log('📊 Booking retrieval request for ID:', id);
    
    if (!id) {
      return Response.json({ error: 'Booking ID required' }, { status: 400 });
    }

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.warn('Invalid booking ID format:', id);
      return Response.json({ error: 'Invalid booking ID format' }, { status: 400 });
    }

    const booking = await getBooking(id);
    
    if (!booking) {
      console.warn('Booking not found for ID:', id);
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    console.log('✅ Booking retrieved successfully:', {
      id: booking.id,
      event_name: booking.event_name,
      status: booking.status
    });

    // Return booking data with consistent field names
    return Response.json({
      id: booking.id,
      masterBookingId: booking.master_booking_id,
      event_name: booking.event_name,
      eventName: booking.event_name, // Alias for frontend compatibility
      event_type: booking.event_type,
      eventType: booking.event_type, // Alias for frontend compatibility
      event_date: booking.event_date,
      eventDate: booking.event_date, // Alias for frontend compatibility
      event_time: booking.event_time,
      eventTime: booking.event_time, // Alias for frontend compatibility
      hours_requested: booking.hours_requested,
      hoursRequested: booking.hours_requested, // Alias for frontend compatibility
      contact_name: booking.contact_name,
      contactName: booking.contact_name, // Alias for frontend compatibility
      email: booking.email,
      phone: booking.phone,
      business_name: booking.business_name,
      businessName: booking.business_name, // Alias for frontend compatibility
      website_url: booking.website_url,
      special_requests: booking.special_requests,
      specialRequests: booking.special_requests, // Alias for frontend compatibility
      payment_method: booking.payment_method,
      paymentMethod: booking.payment_method, // Alias for frontend compatibility
      total_amount: booking.total_amount,
      totalAmount: booking.total_amount, // Alias for frontend compatibility
      subtotal: booking.subtotal,
      stripe_fee: booking.stripe_fee,
      status: booking.status,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      payment_intent_id: booking.payment_intent_id,
      calendar_event_id: booking.calendar_event_id
    });
    
  } catch (error) {
    console.error('❌ Error retrieving booking:', error);
    
    // Don't expose internal error details
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Failed to retrieve booking';
    
    return Response.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}