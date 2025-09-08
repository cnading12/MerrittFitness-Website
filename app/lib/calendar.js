// app/lib/calendar.js - FIXED timezone handling
// Replace your checkCalendarAvailability function with this corrected version

export async function checkCalendarAvailability(date) {
  try {
    // Validate date input
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    console.log('🗓️ Checking calendar availability for:', date);
    
    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');
    
    // FIXED: Create proper date range in Denver timezone
    const startTime = new Date(date + 'T00:00:00-06:00'); // Explicitly Denver timezone
    const endTime = new Date(date + 'T23:59:59-06:00');   // Explicitly Denver timezone
    
    console.log('🕐 Checking time range:', startTime.toISOString(), 'to', endTime.toISOString());

    const response = await calendar.events.list({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
      timeZone: 'America/Denver'
    });

    const events = response.data.items || [];
    console.log('📅 Found', events.length, 'existing events on', date);
    
    if (events.length > 0) {
      events.forEach(event => {
        const eventStart = event.start?.dateTime || event.start?.date;
        const eventEnd = event.end?.dateTime || event.end?.date;
        console.log('📌 Existing event:', event.summary, 'from', eventStart, 'to', eventEnd);
      });
    }
    
    // Define available time slots
    const timeSlots = [
      '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
      '6:00 PM', '7:00 PM', '8:00 PM'
    ];

    // Check availability for each slot
    const availability = {};
    
    timeSlots.forEach(slot => {
      try {
        // Parse slot time
        const [time, period] = slot.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        
        let hour24 = hours;
        if (period === 'PM' && hours !== 12) hour24 += 12;
        if (period === 'AM' && hours === 12) hour24 = 0;
        
        // FIXED: Create slot datetime in Denver timezone properly
        const slotDateTime = new Date(date + 'T00:00:00-06:00'); // Start with Denver timezone
        slotDateTime.setHours(hour24, minutes, 0, 0);
        
        // Assume 2-hour minimum booking duration for conflict checking
        const slotEndTime = new Date(slotDateTime.getTime() + 2 * 60 * 60 * 1000);
        
        // Check if this slot conflicts with any existing event
        const hasConflict = events.some(event => {
          if (!event.start || !event.end) return false;
          
          let eventStart, eventEnd;
          
          // Handle both dateTime and date formats
          if (event.start.dateTime) {
            eventStart = new Date(event.start.dateTime);
          } else if (event.start.date) {
            // All-day events
            eventStart = new Date(event.start.date + 'T00:00:00-06:00');
          } else {
            return false;
          }
          
          if (event.end.dateTime) {
            eventEnd = new Date(event.end.dateTime);
          } else if (event.end.date) {
            // All-day events
            eventEnd = new Date(event.end.date + 'T23:59:59-06:00');
          } else {
            return false;
          }
          
          // Check for time overlap - both times are now in consistent timezone
          const overlap = slotDateTime < eventEnd && slotEndTime > eventStart;
          
          if (overlap) {
            console.log('🚫 CONFLICT DETECTED:', slot, 'overlaps with', event.summary);
            console.log('  Slot:', slotDateTime.toISOString(), 'to', slotEndTime.toISOString());
            console.log('  Event:', eventStart.toISOString(), 'to', eventEnd.toISOString());
          }
          
          return overlap;
        });
        
        availability[slot] = !hasConflict;
        
        if (!hasConflict) {
          console.log('✅ Available:', slot);
        }
        
      } catch (slotError) {
        console.warn('⚠️ Error processing slot:', slot, slotError.message);
        availability[slot] = true; // Default to available if error
      }
    });

    console.log('✅ Availability calculated:', {
      date,
      totalSlots: Object.keys(availability).length,
      availableSlots: Object.values(availability).filter(Boolean).length,
      bookedSlots: Object.values(availability).filter(slot => !slot).length
    });
    
    return availability;

  } catch (error) {
    console.error('❌ Calendar availability error:', error);
    throw new Error(`Calendar integration failed: ${error.message}`);
  }
}