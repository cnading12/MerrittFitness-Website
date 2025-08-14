import { v4 as uuidv4 } from 'uuid';
import { createBooking, updateBookingWithCalendarEvent } from '../../lib/database.js';
import { createCalendarEvent } from '../../lib/calendar.js';

export async function POST(request) {
  try {
    console.log('📝 Starting booking creation...');
    
    const bookingData = await request.json();
    console.log('📊 Received booking data:', {
      date: bookingData.selectedDate,
      time: bookingData.selectedTime,
      eventName: bookingData.eventName,
      email: bookingData.email
    });
    
    const bookingId = uuidv4();
    
    // Step 1: Create booking in database
    console.log('🔄 Creating booking in database...');
    const booking = await createBooking({
      ...bookingData,
      id: bookingId
    });
    console.log('✅ Booking created in database:', bookingId);

    // Step 2: Create calendar event (optional, don't fail if it errors)
    let calendarEventId = null;
    try {
      console.log('🔄 Creating calendar event...');
      const calendarEvent = await createCalendarEvent(booking, true);
      calendarEventId = calendarEvent.id;
      console.log('✅ Calendar event created:', calendarEventId);
      
      // Step 3: Update booking with calendar event ID
      await updateBookingWithCalendarEvent(bookingId, calendarEventId);
      console.log('✅ Booking updated with calendar event ID');
      
    } catch (calendarError) {
      console.error('⚠️ Calendar event creation failed:', calendarError.message);
      // Continue anyway - booking is still valid
    }

    // Return success response
    return Response.json({ 
      success: true, 
      id: bookingId,
      booking: booking,
      calendarEventId: calendarEventId,
      message: 'Booking created successfully!'
    });
    
  } catch (error) {
    console.error('❌ Booking API error:', error);
    
    // Always return JSON, even for errors
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to create booking',
      details: error.stack
    }, { status: 500 });
  }
}