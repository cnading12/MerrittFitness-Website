// app/lib/calendar.js - FIXED AM/PM AND TIMEZONE HANDLING
// The main issues: 1) AM/PM conversion was incorrect, 2) Timezone inconsistencies

import { google } from 'googleapis';

async function getGoogleAuth() {
  try {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Missing Google Calendar credentials');
    }

    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    console.log('🔑 Processing Google private key...');

    if (typeof privateKey === 'string') {
      privateKey = privateKey.replace(/^["']|["']$/g, '');
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('Private key must start with -----BEGIN PRIVATE KEY-----');
      }
      if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
        throw new Error('Private key must end with -----END PRIVATE KEY-----');
      }

      privateKey = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----\s*/, '-----BEGIN PRIVATE KEY-----\n')
        .replace(/\s*-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
        .replace(/\n{2,}/g, '\n');
    }

    console.log('✅ Private key format validated');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
        type: 'service_account',
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    console.log('✅ Google Auth initialized');
    return auth;

  } catch (error) {
    console.error('❌ Google Auth setup error:', error);
    throw error;
  }
}

// FIXED: Proper timezone handling and AM/PM conversion
export async function checkCalendarAvailability(date) {
  try {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    console.log('🗓️ Checking calendar availability for:', date);

    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');

    // FIXED: Consistent timezone handling for deployment
    // Use explicit timezone specification that works both locally and in production
    const denverTimeZone = 'America/Denver';
    
    // Create date boundaries in Denver timezone
    const startTime = new Date(`${date}T00:00:00-07:00`); // Explicit MST offset
    const endTime = new Date(`${date}T23:59:59-07:00`);   // End of day in Denver

    console.log('🕐 Checking time range (Denver):', {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      localStart: startTime.toLocaleString('en-US', { timeZone: denverTimeZone }),
      localEnd: endTime.toLocaleString('en-US', { timeZone: denverTimeZone })
    });

    const response = await calendar.events.list({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
      timeZone: denverTimeZone
    });

    const events = response.data.items || [];
    console.log('📅 Found', events.length, 'existing events on', date);

    // Enhanced event processing with proper timezone handling
    const processedEvents = events.map(event => {
      let eventStart, eventEnd;

      if (event.start.dateTime) {
        // Timed event - parse with timezone consideration
        eventStart = new Date(event.start.dateTime);
      } else if (event.start.date) {
        // All-day event - treat as blocking entire day
        eventStart = new Date(`${event.start.date}T00:00:00-07:00`);
        eventEnd = new Date(`${event.end.date}T00:00:00-07:00`);
        eventEnd.setDate(eventEnd.getDate() - 1); // End date is exclusive
        eventEnd.setHours(23, 59, 59, 999);
      }

      if (event.end.dateTime && !eventEnd) {
        eventEnd = new Date(event.end.dateTime);
      }

      return {
        summary: event.summary,
        start: eventStart,
        end: eventEnd,
        isAllDay: !event.start.dateTime,
        originalEvent: event
      };
    }).filter(event => event.start && event.end);

    // Log processed events for debugging
    processedEvents.forEach(event => {
      console.log('📌 Processed event:', {
        summary: event.summary,
        start: event.start.toLocaleString('en-US', { timeZone: denverTimeZone }),
        end: event.end.toLocaleString('en-US', { timeZone: denverTimeZone }),
        isAllDay: event.isAllDay
      });
    });

    // Define available time slots
    const timeSlots = [
      '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
      '6:00 PM', '7:00 PM', '8:00 PM'
    ];

    // FIXED: Corrected slot availability checking with proper AM/PM conversion
    const availability = {};

    timeSlots.forEach(slot => {
      try {
        // FIXED: Proper AM/PM parsing
        const [time, period] = slot.split(' ');
        const [hours, minutes] = time.split(':').map(Number);

        let hour24 = hours;
        
        // CORRECT AM/PM conversion logic
        if (period === 'AM') {
          if (hours === 12) {
            hour24 = 0; // 12:00 AM = midnight (00:00)
          }
          // Other AM hours (1-11) stay the same
        } else if (period === 'PM') {
          if (hours !== 12) {
            hour24 = hours + 12; // 1:00 PM = 13:00, 2:00 PM = 14:00, etc.
          }
          // 12:00 PM stays as 12 (noon)
        }

        console.log(`🕐 Converting ${slot}: hours=${hours}, period=${period} → hour24=${hour24}`);

        // FIXED: Create slot datetime with consistent timezone handling
        const slotDateTime = new Date(`${date}T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00-07:00`);
        
        // Check for minimum 30-minute conflict window
        const slotEndTime = new Date(slotDateTime.getTime() + 30 * 60 * 1000);

        console.log(`📍 Slot ${slot} converts to:`, {
          localTime: slotDateTime.toLocaleString('en-US', { timeZone: denverTimeZone }),
          hour24: hour24,
          isoTime: slotDateTime.toISOString(),
          utcTime: slotDateTime.toUTCString()
        });

        // Check if this slot conflicts with any existing event
        const hasConflict = processedEvents.some(event => {
          if (event.isAllDay) {
            // All-day events block the entire day
            const eventDate = event.start.toDateString();
            const slotDate = slotDateTime.toDateString();
            return eventDate === slotDate;
          } else {
            // Timed events - check for overlap with buffer
            const overlap = slotDateTime < event.end && slotEndTime > event.start;

            if (overlap) {
              console.log('🚫 CONFLICT DETECTED:', {
                slot: slot,
                slotStart: slotDateTime.toLocaleString('en-US', { timeZone: denverTimeZone }),
                slotEnd: slotEndTime.toLocaleString('en-US', { timeZone: denverTimeZone }),
                eventSummary: event.summary,
                eventStart: event.start.toLocaleString('en-US', { timeZone: denverTimeZone }),
                eventEnd: event.end.toLocaleString('en-US', { timeZone: denverTimeZone }),
                slotStartUTC: slotDateTime.toISOString(),
                eventStartUTC: event.start.toISOString()
              });
            }

            return overlap;
          }
        });

        availability[slot] = !hasConflict;

        if (!hasConflict) {
          console.log('✅ Available:', slot);
        } else {
          console.log('❌ Blocked:', slot);
        }

      } catch (slotError) {
        console.warn('⚠️ Error processing slot:', slot, slotError.message);
        availability[slot] = true; // Default to available on parsing error
      }
    });

    console.log('✅ Final availability calculated:', {
      date,
      totalSlots: Object.keys(availability).length,
      availableSlots: Object.values(availability).filter(Boolean).length,
      bookedSlots: Object.values(availability).filter(slot => !slot).length,
      availability
    });

    return availability;

  } catch (error) {
    console.error('❌ Calendar availability error:', error);
    throw new Error(`Calendar integration failed: ${error.message}`);
  }
}

// FIXED: Enhanced calendar event creation with CORRECT timezone handling
export async function createCalendarEvent(booking, includeAttendees = false) {
  try {
    console.log('📅 Creating calendar event for booking:', booking.id);

    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');

    const eventDate = booking.event_date;
    const eventTime = booking.event_time;

    console.log('📅 Event details:', { eventDate, eventTime });

    // FIXED: Proper time parsing with CORRECTED AM/PM logic
    const [time, period] = eventTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    let hour24 = hours;
    
    // CORRECT AM/PM conversion logic (same as above)
    if (period === 'AM') {
      if (hours === 12) {
        hour24 = 0; // 12:00 AM = midnight (00:00)
      }
      // Other AM hours (1-11) stay the same
    } else if (period === 'PM') {
      if (hours !== 12) {
        hour24 = hours + 12; // 1:00 PM = 13:00, 2:00 PM = 14:00, etc.
      }
      // 12:00 PM stays as 12 (noon)
    }

    console.log(`🕐 Creating event: ${eventTime} → hour24=${hour24}`);

    // FIXED: Create event with explicit timezone specification
    const eventDateTime = new Date(`${eventDate}T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00-07:00`);

    // Calculate end time based on actual hours_requested
    const duration = parseFloat(booking.hours_requested) || 2;
    const endDateTime = new Date(eventDateTime.getTime() + duration * 60 * 60 * 1000);

    console.log('📅 Creating calendar event:', {
      event: booking.event_name,
      start: eventDateTime.toISOString(),
      end: endDateTime.toISOString(),
      startLocal: eventDateTime.toLocaleString('en-US', { timeZone: 'America/Denver' }),
      endLocal: endDateTime.toLocaleString('en-US', { timeZone: 'America/Denver' }),
      duration: duration + ' hours'
    });

    // Create event that blocks the time slot
    const event = {
      summary: `🔒 BOOKED: ${booking.event_name}`,
      description: `
BOOKING CONFIRMED - This Time Slot is RESERVED

Event: ${booking.event_name}
Type: ${booking.event_type || 'Not specified'}
Organizer: ${booking.contact_name}
Email: ${booking.email}
Phone: ${booking.phone || 'Not provided'}
Duration: ${duration} hours
${booking.business_name ? `Business: ${booking.business_name}\n` : ''}
${booking.special_requests ? `Special Requests: ${booking.special_requests}\n` : ''}

🚨 THIS TIME SLOT IS NOW UNAVAILABLE FOR OTHER BOOKINGS

Booking ID: ${booking.id}
Status: ${booking.status}
Created: ${booking.created_at}

Contact manager@merrittfitness.net for changes.
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
      colorId: '11', // Red color to clearly show it's booked
      transparency: 'opaque', // Blocks the time slot
      visibility: 'public', // Visible to availability checking
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'email', minutes: 60 }       // 1 hour before
        ]
      },
      extendedProperties: {
        private: {
          bookingId: booking.id,
          bookingStatus: booking.status,
          merrittFitnessBooking: 'true'
        }
      }
    };

    const response = await calendar.events.insert({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
      sendUpdates: 'none'
    });

    console.log('✅ Calendar event created successfully!');
    console.log('📅 Event ID:', response.data.id);
    console.log('🔒 Time slot now blocked for other users');

    return response.data;

  } catch (error) {
    console.error('❌ Calendar event creation failed:', error);
    throw new Error(`Calendar event creation failed: ${error.message}`);
  }
}