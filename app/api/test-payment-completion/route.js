// app/api/test-payment-completion/route.js
// Temporary test endpoint to manually complete payments for testing

import { updateBookingStatus, getBooking } from '../../lib/database.js';
import { createCalendarEvent } from '../../lib/calendar.js';
import { sendConfirmationEmails } from '../../lib/email.js';

export async function POST(request) {
  try {
    const { bookingId, action } = await request.json();
    
    if (!bookingId) {
      return Response.json({ error: 'Booking ID required' }, { status: 400 });
    }

    const booking = await getBooking(bookingId);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (action === 'complete-payment') {
      console.log('🧪 Manually completing payment for booking:', bookingId);
      
      // Update booking status to confirmed
      await updateBookingStatus(bookingId, 'confirmed', {
        payment_confirmed_at: new Date().toISOString()
      });
      
      // Get updated booking
      const updatedBooking = await getBooking(bookingId);
      
      // Create calendar event if not exists
      let calendarEventId = updatedBooking.calendar_event_id;
      if (!calendarEventId) {
        try {
          const calendarEvent = await createCalendarEvent(updatedBooking);
          if (calendarEvent && calendarEvent.id) {
            calendarEventId = calendarEvent.id;
            await updateBookingStatus(bookingId, 'confirmed', {
              calendar_event_id: calendarEventId,
              updated_at: new Date().toISOString()
            });
          }
        } catch (calendarError) {
          console.warn('Calendar creation failed:', calendarError.message);
        }
      }
      
      // Send confirmation emails
      let emailResult = null;
      try {
        emailResult = await sendConfirmationEmails(updatedBooking);
      } catch (emailError) {
        console.warn('Email sending failed:', emailError.message);
      }
      
      return Response.json({
        success: true,
        message: 'Payment manually completed',
        booking: {
          id: updatedBooking.id,
          status: updatedBooking.status,
          event_name: updatedBooking.event_name,
          payment_confirmed_at: updatedBooking.payment_confirmed_at
        },
        calendar: {
          created: !!calendarEventId,
          eventId: calendarEventId
        },
        emails: {
          sent: !!emailResult,
          result: emailResult
        }
      });
    }
    
    if (action === 'check-status') {
      return Response.json({
        booking: {
          id: booking.id,
          status: booking.status,
          event_name: booking.event_name,
          payment_intent_id: booking.payment_intent_id,
          calendar_event_id: booking.calendar_event_id,
          payment_confirmed_at: booking.payment_confirmed_at
        }
      });
    }
    
    return Response.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Test completion error:', error);
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
      message: 'Payment completion test endpoint',
      usage: {
        check_status: `GET /api/test-payment-completion?booking_id=YOUR_BOOKING_ID`,
        complete_payment: `POST /api/test-payment-completion with {"bookingId": "YOUR_ID", "action": "complete-payment"}`
      }
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
        payment_intent_id: booking.payment_intent_id,
        calendar_event_id: booking.calendar_event_id,
        payment_confirmed_at: booking.payment_confirmed_at,
        created_at: booking.created_at
      },
      actions: {
        complete_payment: `POST /api/test-payment-completion with {"bookingId": "${bookingId}", "action": "complete-payment"}`
      }
    });
    
  } catch (error) {
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
}