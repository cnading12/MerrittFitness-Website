// app/api/booking/[id]/route.js
import { getBooking } from '../../../lib/database.js';
import { isSponsoredBooking } from '../../../lib/calendar-flags.js';
import { enforceRateLimit } from '../../../lib/rate-limit.js';

export async function GET(request, context) {
  // The booking id is the only credential this endpoint has (see the note on
  // the response body below), so cap lookups to blunt any attempt to sweep
  // the UUID space.
  const limited = enforceRateLimit(request, 'booking-read');
  if (limited) return limited;

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

    // Return booking data with consistent field names.
    //
    // SCOPE NOTE: this endpoint is unauthenticated — knowing the booking's
    // UUID is the only thing required to read it. That is acceptable for the
    // fields the post-submission pages actually render (the renter follows a
    // link containing their own id), but it means every field here is one
    // leaked/forwarded URL away from disclosure. So the response is an
    // explicit allowlist of what the payment, success, and payment-complete
    // pages consume — NOT the whole row.
    //
    // Deliberately withheld: phone, home address, the government-issued ID
    // photo, the COI document, business_name, website_url, and the Stripe /
    // Google Calendar object ids (payment_intent_id, stripe_customer_id,
    // stripe_subscription_id, calendar_event_id). None are rendered by any
    // page, and the internal ids are useful only to an attacker correlating
    // this booking with other systems. If a page ever needs one of these,
    // add it here consciously rather than widening the response by default.
    return Response.json({
      id: booking.id,
      masterBookingId: booking.master_booking_id,
      master_booking_id: booking.master_booking_id ?? null,
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
      attendees: booking.attendees ?? null,
      contact_name: booking.contact_name,
      contactName: booking.contact_name, // Alias for frontend compatibility
      // Needed by the Stripe Elements setup to prefill the receipt email.
      email: booking.email,
      special_requests: booking.special_requests,
      specialRequests: booking.special_requests, // Alias for frontend compatibility
      payment_method: booking.payment_method,
      paymentMethod: booking.payment_method, // Alias for frontend compatibility
      total_amount: booking.total_amount,
      totalAmount: booking.total_amount, // Alias for frontend compatibility
      subtotal: booking.subtotal,
      // promo_code is deliberately NOT returned. It is a secret string — the
      // whole point of moving the dictionary server-side was to keep codes out
      // of anything a browser can read, and booking URLs get forwarded and
      // pasted around. No page renders it; `is_sponsored` below is the derived
      // boolean the success page actually needs.
      // Sponsored = comped booking (no payment). Derived from the stored promo
      // code (with support for an explicit is_sponsored column if ever added).
      is_sponsored: booking.is_sponsored === true || isSponsoredBooking(booking),
      status: booking.status,
      created_at: booking.created_at,
      // Recurring-series fields (null for single-event bookings). The schedule
      // itself is rendered on the setup page; the Stripe ids behind it are not.
      recurring_details: booking.recurring_details ?? null,
      pending_recurring_setup: booking.pending_recurring_setup ?? null
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