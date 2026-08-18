// app/api/booking/[id]/route.js
//
// Returns one booking to the payment / success pages.
//
// AUTHORIZATION MODEL: the booking id IS the credential. There are no renter
// accounts, so knowing the v4 UUID — which only the renter and staff ever
// receive — is what grants access. That is a capability URL, and it holds up
// only as long as the id stays unguessable (122 bits of randomness) and the
// response stays as small as it can be. Two consequences enforced below:
//
//   1. The route is rate limited, so the id space cannot be probed even at a
//      theoretical level, and a leaked id can't be used to hammer the DB.
//   2. Fields the payment and success pages don't render are NOT returned.
//      The home address in particular has no client-side use, and the ID photo
//      / COI columns must never leave the server.
//
// If renter accounts ever exist, replace this with a real ownership check.

import { getBooking } from '../../../lib/database.js';
import { isSponsoredBooking } from '../../../lib/calendar-flags.js';
import { enforceRateLimit } from '../../../lib/rate-limit.js';

const RATE_LIMIT = { bucket: 'booking-read', limit: 30, windowMs: 60_000 };

export async function GET(request, context) {
  const limited = enforceRateLimit(request, RATE_LIMIT);
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

    // ALLOWLIST, not the whole row. Only what the payment / success pages
    // actually render is returned; everything else stays server-side.
    //
    // Deliberately withheld, and why:
    //   phone, home_address, business_name, website_url — renter PII with no
    //     use in any client page. Whoever holds the id already knows the
    //     booking; they should not get a contact dossier with it.
    //   id_photo_*, coi_document_* — a government ID and an insurance
    //     certificate. These must never leave the server. (They were not in
    //     the old response either; naming them here keeps it that way.)
    //   payment_intent_id, stripe_customer_id, stripe_subscription_id,
    //     calendar_event_id — internal identifiers for other systems. Nothing
    //     in the UI reads them, and each one is a lever for someone probing.
    //   promo_code — is_sponsored below already carries the only bit the UI
    //     needs, without disclosing a working discount code.
    //
    // Both snake_case and camelCase aliases are kept for the fields that ARE
    // returned: the pages use a mix of the two.
    return Response.json({
      id: booking.id,
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
      // Needed by the Stripe payment element (receipt + billing details).
      email: booking.email,
      special_requests: booking.special_requests,
      specialRequests: booking.special_requests, // Alias for frontend compatibility
      payment_method: booking.payment_method,
      paymentMethod: booking.payment_method, // Alias for frontend compatibility
      total_amount: booking.total_amount,
      totalAmount: booking.total_amount, // Alias for frontend compatibility
      subtotal: booking.subtotal,
      // Sponsored = comped booking (no payment). Derived from the stored promo
      // code (with support for an explicit is_sponsored column if ever added).
      is_sponsored: booking.is_sponsored === true || isSponsoredBooking(booking),
      status: booking.status,
      // Recurring-series fields (null for single-event bookings). The recurring
      // setup component renders the schedule from these.
      recurring_details: booking.recurring_details ?? null,
      pending_recurring_setup: booking.pending_recurring_setup ?? null
    });

  } catch (error) {
    console.error('❌ Error retrieving booking:', error);
    return Response.json({
      error: 'Failed to retrieve booking'
    }, { status: 500 });
  }
}