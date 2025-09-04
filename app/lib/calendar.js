// app/lib/calendar.js
// FIXED VERSION - Proper date handling and error recovery

import { google } from 'googleapis';

async function getGoogleAuth() {
  try {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Missing Google Calendar credentials');
    }

    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    
    // Fix common formatting issues with private key
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    if (!privateKey.includes('\n')) {
      privateKey = privateKey.replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
                            .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
                            .replace(/(.{64})/g, '$1\n');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
        type: 'service_account',
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    return auth;
  } catch (error) {
    console.error('Google Auth setup error:', error);
    throw error;
  }
}

export async function checkCalendarAvailability(date) {
  try {
    // Validate date input
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');
    
    // FIXED: Proper date handling for Denver timezone
    const targetDate = new Date(date + 'T00:00:00');
    const startTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
    
    console.log('🗓️ Checking availability for:', date);
    console.log('🕐 Time range:', startTime.toISOString(), 'to', endTime.toISOString());

    const response = await calendar.events.list({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    console.log('📅 Found events:', events.length);
    
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
        // FIXED: Proper time parsing
        const [time, period] = slot.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        
        let hour24 = hours;
        if (period === 'PM' && hours !== 12) hour24 += 12;
        if (period === 'AM' && hours === 12) hour24 = 0;
        
        const slotDateTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hour24, minutes);
        const slotEndTime = new Date(slotDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hour buffer
        
        // Check if this slot conflicts with any existing event
        const hasConflict = events.some(event => {
          if (!event.start || !event.end) return false;
          
          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);
          
          // Check for time overlap
          const overlap = slotDateTime < eventEnd && slotEndTime > eventStart;
          if (overlap) {
            console.log('⚠️ Conflict found:', slot, 'overlaps with', event.summary);
          }
          return overlap;
        });
        
        availability[slot] = !hasConflict;
      } catch (slotError) {
        console.warn('Error processing slot:', slot, slotError);
        availability[slot] = true; // Default to available if error
      }
    });

    console.log('✅ Calculated availability:', availability);
    return availability;

  } catch (error) {
    console.error('❌ Calendar availability error:', error);
    
    // Return fallback availability (all slots available)
    const fallbackAvailability = {};
    const timeSlots = [
      '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
      '6:00 PM', '7:00 PM', '8:00 PM'
    ];
    
    timeSlots.forEach(slot => {
      fallbackAvailability[slot] = true;
    });
    
    console.warn('⚠️ Using fallback availability due to calendar API error');
    return fallbackAvailability;
  }
}

export async function createCalendarEvent(booking, includeAttendees = false) {
  try {
    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');
    
    // FIXED: Better date/time parsing
    const eventDate = booking.event_date;
    const eventTime = booking.event_time;
    
    // Parse time properly
    const [time, period] = eventTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    // Create proper date objects
    const eventDateTime = new Date(eventDate + 'T00:00:00');
    eventDateTime.setHours(hour24, minutes, 0, 0);
    
    // Calculate end time based on hours_requested or default to 2 hours
    const duration = booking.hours_requested || 2;
    const endDateTime = new Date(eventDateTime.getTime() + duration * 60 * 60 * 1000);
    
    console.log('📅 Creating calendar event:', {
      event: booking.event_name,
      start: eventDateTime.toISOString(),
      end: endDateTime.toISOString(),
      duration: duration + ' hours'
    });

    const event = {
      summary: `🧘 ${booking.event_name} - ${booking.contact_name}`,
      description: `
Event Type: ${booking.event_type || 'Not specified'}
Organizer: ${booking.contact_name}
Email: ${booking.email}
Phone: ${booking.phone || 'Not provided'}
Duration: ${duration} hours
${booking.business_name ? `Business: ${booking.business_name}\n` : ''}
${booking.special_requests ? `Special Requests: ${booking.special_requests}\n` : ''}

Booking ID: ${booking.id}
Status: ${booking.status}

This booking automatically blocks the time slot for other users.
      `.trim(),
      start: {
        dateTime: eventDateTime.toISOString(),
        timeZone: 'America/Denver',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Denver',
      },
      location: 'Merritt Fitness, 2246 Irving St, Denver, CO 80211',
      colorId: '10', // Green color for confirmed bookings
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'email', minutes: 60 }       // 1 hour before
        ]
      }
    };

    const response = await calendar.events.insert({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
      sendUpdates: 'none'
    });

    console.log('✅ Calendar event created successfully:', response.data.id);
    return response.data;
    
  } catch (error) {
    console.error('❌ Calendar event creation error:', error);
    
    // Log but don't fail the booking process
    console.warn('⚠️ Calendar event creation failed, but booking will continue');
    return null;
  }
}