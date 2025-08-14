// app/lib/calendar.js
import { google } from 'googleapis';

async function getGoogleAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return auth;
}

export async function checkCalendarAvailability(date) {
  try {
    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');
    
    // Get events for the specified date
    const startTime = new Date(date + 'T00:00:00');
    const endTime = new Date(date + 'T23:59:59');
    
    const response = await calendar.events.list({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    // Define available time slots
    const timeSlots = [
      '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
      '6:00 PM', '7:00 PM', '8:00 PM'
    ];

    // Check availability for each slot
    const availability = {};
    
    timeSlots.forEach(slot => {
      const slotTime = new Date(`${date} ${slot}`);
      const slotEndTime = new Date(slotTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours buffer
      
      // Check if this slot conflicts with any existing event
      const hasConflict = events.some(event => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        return (slotTime < eventEnd && slotEndTime > eventStart);
      });
      
      availability[slot] = !hasConflict;
    });

    return availability;
  } catch (error) {
    console.error('Calendar availability error:', error);
    throw error;
  }
}

export async function createCalendarEvent(booking, includeAttendees = false) {
  try {
    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');
    
    const eventDateTime = new Date(`${booking.event_date} ${booking.event_time}`);
    const endDateTime = new Date(eventDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours default
    
    // Include attendee info in description instead of as attendees
    const attendeeInfo = includeAttendees ? `
Customer Email: ${booking.email}
Manager Email: ${process.env.MANAGER_EMAIL || 'Not set'}
` : '';
    
    const event = {
      summary: booking.event_name,
      description: `
Event Type: ${booking.event_type}
Organizer: ${booking.contact_name}
Email: ${booking.email}
Phone: ${booking.phone}
Attendees: ${booking.attendees}
Special Requests: ${booking.special_requests || 'None'}

Booking ID: ${booking.id}

${attendeeInfo}

Note: Calendar invitations will be sent via email confirmation system.
      `.trim(),
      start: {
        dateTime: eventDateTime.toISOString(),
        timeZone: 'America/Denver',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Denver',
      },
      location: 'Historic Merritt Space, Denver, CO',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'email', minutes: 60 }       // 1 hour before
        ]
      }
    };

    // Don't add attendees to avoid the Domain-Wide Delegation error
    // Instead, we'll handle invitations through our email system
    console.log('Creating calendar event without attendees (will send email invitations separately)');

    const response = await calendar.events.insert({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
      sendUpdates: 'none' // Don't send Google Calendar invites
    });

    console.log('Calendar event created successfully:', response.data.id);
    return response.data;
    
  } catch (error) {
    console.error('Calendar event creation error:', error);
    throw error;
  }
}