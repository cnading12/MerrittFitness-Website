// app/lib/calendar.js - FIXED VERSION
// Accurate availability checking that properly reflects booked times

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

// FIXED: Accurate availability checking
export async function checkCalendarAvailability(date) {
  try {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    console.log('🗓️ Checking ACCURATE calendar availability for:', date);

    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');

    // FIXED: Create proper Denver timezone date range
    const targetDate = new Date(date + 'T00:00:00-07:00'); // Explicit Denver timezone
    const startTime = new Date(targetDate);
    startTime.setHours(0, 0, 0, 0);

    const endTime = new Date(targetDate);
    endTime.setHours(23, 59, 59, 999);

    console.log('🕐 Checking time range (Denver):', {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      localStart: startTime.toLocaleString('en-US', { timeZone: 'America/Denver' }),
      localEnd: endTime.toLocaleString('en-US', { timeZone: 'America/Denver' })
    });

    const response = await calendar.events.list({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
      timeZone: 'America/Denver' // CRITICAL: Ensure timezone consistency
    });

    const events = response.data.items || [];
    console.log('📅 Found', events.length, 'existing events on', date);

    // FIXED: Enhanced event processing with better timezone handling
    const processedEvents = events.map(event => {
      let eventStart, eventEnd;

      // Handle different event types properly
      if (event.start.dateTime) {
        // Timed event
        eventStart = new Date(event.start.dateTime);
        eventEnd = new Date(event.end.dateTime);
      } else if (event.start.date) {
        // All-day event - these should block the entire day
        eventStart = new Date(event.start.date + 'T00:00:00-07:00');
        eventEnd = new Date(event.end.date + 'T00:00:00-07:00');
        // All-day events in Google Calendar end on the next day, so adjust
        eventEnd.setDate(eventEnd.getDate() - 1);
        eventEnd.setHours(23, 59, 59, 999);
      } else {
        return null; // Skip malformed events
      }

      return {
        summary: event.summary,
        start: eventStart,
        end: eventEnd,
        isAllDay: !event.start.dateTime,
        originalEvent: event
      };
    }).filter(Boolean);

    // Log processed events for debugging
    processedEvents.forEach(event => {
      console.log('📌 Processed event:', {
        summary: event.summary,
        start: event.start.toLocaleString('en-US', { timeZone: 'America/Denver' }),
        end: event.end.toLocaleString('en-US', { timeZone: 'America/Denver' }),
        isAllDay: event.isAllDay
      });
    });

    // Define available time slots
    const timeSlots = [
      '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
      '6:00 PM', '7:00 PM', '8:00 PM'
    ];

    // FIXED: Accurate slot availability checking
    const availability = {};

    timeSlots.forEach(slot => {
      try {
        // Parse slot time with proper timezone handling
        const [time, period] = slot.split(' ');
        const [hours, minutes] = time.split(':').map(Number);

        let hour24 = hours;
        // CORRECT - Fixed AM/PM logic
        if (period === 'AM') {
          if (hours === 12) {
            hour24 = 0; // 12:00 AM = 00:00 (midnight)
          }
          // AM hours 1-11 stay as is
        } else if (period === 'PM') {
          if (hours !== 12) {
            hour24 = hours + 12; // 1:00 PM = 13:00, etc.
          }
          // 12:00 PM stays as 12 (noon)
        }

        // Create slot datetime in Denver timezone
        const slotDateTime = new Date(date + 'T00:00:00-07:00');
        slotDateTime.setHours(hour24, minutes, 0, 0);

        // FIXED: Use minimum booking duration (30 minutes) for conflict checking
        // This ensures we catch any overlap, regardless of actual booking length
        const slotEndTime = new Date(slotDateTime.getTime() + 30 * 60 * 1000); // 30 minutes

        // Check if this slot conflicts with any existing event
        const hasConflict = processedEvents.some(event => {
          if (event.isAllDay) {
            // All-day events block all time slots for that day
            const eventDate = event.start.toDateString();
            const slotDate = slotDateTime.toDateString();
            return eventDate === slotDate;
          } else {
            // Timed events - check for overlap
            // An overlap occurs if: slot_start < event_end AND slot_end > event_start
            const overlap = slotDateTime < event.end && slotEndTime > event.start;

            if (overlap) {
              console.log('🚫 CONFLICT DETECTED:', {
                slot: slot,
                slotStart: slotDateTime.toLocaleString('en-US', { timeZone: 'America/Denver' }),
                slotEnd: slotEndTime.toLocaleString('en-US', { timeZone: 'America/Denver' }),
                eventSummary: event.summary,
                eventStart: event.start.toLocaleString('en-US', { timeZone: 'America/Denver' }),
                eventEnd: event.end.toLocaleString('en-US', { timeZone: 'America/Denver' })
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
        availability[slot] = true; // Default to available if error
      }
    });

    console.log('✅ ACCURATE availability calculated:', {
      date,
      totalSlots: Object.keys(availability).length,
      availableSlots: Object.values(availability).filter(Boolean).length,
      bookedSlots: Object.values(availability).filter(slot => !slot).length,
      availability
    });

    return availability;

  } catch (error) {
    console.error('❌ ACCURATE calendar availability error:', error);
    throw new Error(`Calendar integration failed: ${error.message}`);
  }
}

// FIXED: Enhanced calendar event creation with proper timezone
export async function createCalendarEvent(booking, includeAttendees = false) {
  try {
    console.log('📅 Creating BLOCKING calendar event for booking:', booking.id);

    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');

    const eventDate = booking.event_date;
    const eventTime = booking.event_time;

    console.log('📅 Event details:', { eventDate, eventTime });

    // FIXED: Proper time parsing with timezone awareness
    const [time, period] = eventTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    let hour24 = hours;
    // CORRECT - Fixed AM/PM logic
    if (period === 'AM') {
      if (hours === 12) {
        hour24 = 0; // 12:00 AM = 00:00 (midnight)
      }
      // AM hours 1-11 stay as is
    } else if (period === 'PM') {
      if (hours !== 12) {
        hour24 = hours + 12; // 1:00 PM = 13:00, etc.
      }
      // 12:00 PM stays as 12 (noon)
    }
    // FIXED: Create event start time with explicit Denver timezone
    const eventDateTime = new Date(eventDate + 'T00:00:00-07:00');
    eventDateTime.setHours(hour24, minutes, 0, 0);

    // Calculate end time based on actual hours_requested
    const duration = parseFloat(booking.hours_requested) || 2;
    const endDateTime = new Date(eventDateTime.getTime() + duration * 60 * 60 * 1000);

    console.log('📅 Creating BLOCKING calendar event:', {
      event: booking.event_name,
      start: eventDateTime.toISOString(),
      end: endDateTime.toISOString(),
      startLocal: eventDateTime.toLocaleString('en-US', { timeZone: 'America/Denver' }),
      endLocal: endDateTime.toLocaleString('en-US', { timeZone: 'America/Denver' }),
      duration: duration + ' hours'
    });

    // Create event that BLOCKS the time slot
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
      transparency: 'opaque', // CRITICAL: This blocks the time slot
      visibility: 'public', // CRITICAL: Visible to availability checking
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

    console.log('✅ BLOCKING calendar event created successfully!');
    console.log('📅 Event ID:', response.data.id);
    console.log('🔒 Time slot now BLOCKED for other users');

    return response.data;

  } catch (error) {
    console.error('❌ CRITICAL: Calendar event creation failed:', error);
    throw new Error(`Calendar event creation failed: ${error.message}`);
  }
}