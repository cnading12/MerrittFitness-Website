// app/api/debug-date/route.js
// Debug how events are being processed for a specific date

import { google } from 'googleapis';

async function getGoogleAuth() {
  try {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
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
    throw error;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '2025-09-14'; // Default to Saturday
    
    console.log('Debug checking events for date:', date);
    
    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');
    
    // Create date range for the specified date
    const targetDate = new Date(date + 'T00:00:00-06:00'); // Denver timezone
    const startTime = new Date(targetDate);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(targetDate);
    endTime.setHours(23, 59, 59, 999);
    
    console.log('Checking from:', startTime.toISOString(), 'to:', endTime.toISOString());

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
    
    const debug = {
      date,
      searchRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      },
      eventsFound: events.length,
      rawEvents: events.map(event => ({
        summary: event.summary,
        start: event.start,
        end: event.end,
        description: event.description,
        id: event.id
      })),
      processedEvents: [],
      timeSlotConflicts: {}
    };

    // Process each event like the availability checker does
    events.forEach(event => {
      let eventStart, eventEnd;
      
      if (event.start.dateTime) {
        eventStart = new Date(event.start.dateTime);
      } else if (event.start.date) {
        eventStart = new Date(event.start.date + 'T00:00:00');
      }
      
      if (event.end.dateTime) {
        eventEnd = new Date(event.end.dateTime);
      } else if (event.end.date) {
        eventEnd = new Date(event.end.date + 'T23:59:59');
      }
      
      debug.processedEvents.push({
        summary: event.summary,
        originalStart: event.start.dateTime || event.start.date,
        originalEnd: event.end.dateTime || event.end.date,
        processedStart: eventStart.toISOString(),
        processedEnd: eventEnd.toISOString(),
        startLocal: eventStart.toLocaleString('en-US', { timeZone: 'America/Denver' }),
        endLocal: eventEnd.toLocaleString('en-US', { timeZone: 'America/Denver' })
      });
    });

    // Check which time slots would be blocked
    const timeSlots = [
      '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
      '6:00 PM', '7:00 PM', '8:00 PM'
    ];

    timeSlots.forEach(slot => {
      const [time, period] = slot.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      const slotDateTime = new Date(targetDate);
      slotDateTime.setHours(hour24, minutes, 0, 0);
      
      const slotEndTime = new Date(slotDateTime.getTime() + 2 * 60 * 60 * 1000);
      
      const conflicts = events.filter(event => {
        let eventStart, eventEnd;
        
        if (event.start.dateTime) {
          eventStart = new Date(event.start.dateTime);
        } else if (event.start.date) {
          eventStart = new Date(event.start.date + 'T00:00:00');
        } else {
          return false;
        }
        
        if (event.end.dateTime) {
          eventEnd = new Date(event.end.dateTime);
        } else if (event.end.date) {
          eventEnd = new Date(event.end.date + 'T23:59:59');
        } else {
          return false;
        }
        
        return slotDateTime < eventEnd && slotEndTime > eventStart;
      });
      
      debug.timeSlotConflicts[slot] = {
        slotStart: slotDateTime.toISOString(),
        slotEnd: slotEndTime.toISOString(),
        slotStartLocal: slotDateTime.toLocaleString('en-US', { timeZone: 'America/Denver' }),
        slotEndLocal: slotEndTime.toLocaleString('en-US', { timeZone: 'America/Denver' }),
        hasConflict: conflicts.length > 0,
        conflictingEvents: conflicts.map(e => e.summary)
      };
    });

    return Response.json(debug);
    
  } catch (error) {
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}