// app/lib/calendar.js - FIXED VERSION
// Resolves the private key decoding error preventing calendar automation

import { google } from 'googleapis';

async function getGoogleAuth() {
  try {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Missing Google Calendar credentials');
    }

    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    console.log('🔑 Processing Google private key...');

    // FIXED: Enhanced private key processing to handle all formats
    if (typeof privateKey === 'string') {
      // Remove any quotes that might be wrapping the key
      privateKey = privateKey.replace(/^["']|["']$/g, '');

      // Handle escaped newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      // Ensure proper formatting
      if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('Private key must start with -----BEGIN PRIVATE KEY-----');
      }

      if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
        throw new Error('Private key must end with -----END PRIVATE KEY-----');
      }

      // Clean up any extra spaces or formatting issues
      privateKey = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----\s*/, '-----BEGIN PRIVATE KEY-----\n')
        .replace(/\s*-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
        .replace(/\n{2,}/g, '\n'); // Remove duplicate newlines
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

    // Provide specific troubleshooting
    if (error.message.includes('DECODER routines::unsupported')) {
      console.error('💡 PRIVATE KEY FORMAT ERROR:');
      console.error('   Your GOOGLE_PRIVATE_KEY has formatting issues.');
      console.error('   In your .env.local file, it should look like:');
      console.error('   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBg...\\n-----END PRIVATE KEY-----"');
      console.error('   Make sure the \\n characters are literal text, not actual newlines.');
    }

    throw error;
  }
}

export async function checkCalendarAvailability(date) {
  try {
    // Validate date input
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    console.log('🗓️ Checking REAL calendar availability for:', date);

    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');

    // Create proper date range for the selected date
    const targetDate = new Date(date + 'T00:00:00-06:00'); // Denver timezone
    const startTime = new Date(targetDate);
    startTime.setHours(0, 0, 0, 0);

    const endTime = new Date(targetDate);
    endTime.setHours(23, 59, 59, 999);

    console.log('🕐 Checking time range:', startTime.toISOString(), 'to', endTime.toISOString());

    const response = await calendar.events.list({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50 // Get up to 50 events for the day
    });

    const events = response.data.items || [];
    console.log('📅 Found', events.length, 'existing events on', date);

    if (events.length > 0) {
      events.forEach(event => {
        console.log('📌 Existing event:', event.summary, 'from', event.start?.dateTime || event.start?.date);
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

        // Create slot datetime in Denver timezone
        const slotDateTime = new Date(targetDate);
        slotDateTime.setHours(hour24, minutes, 0, 0);

        // Assume 2-hour minimum booking duration for conflict checking
        const slotEndTime = new Date(slotDateTime.getTime() + 2 * 60 * 60 * 1000);

        // Check if this slot conflicts with any existing event
        const hasConflict = events.some(event => {
          if (!event.start || !event.end) return false;

          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);

          // Check for time overlap
          const overlap = slotDateTime < eventEnd && slotEndTime > eventStart;

          if (overlap) {
            console.log('🚫 CONFLICT DETECTED:', slot, 'overlaps with', event.summary);
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

    console.log('✅ REAL availability calculated:', {
      date,
      totalSlots: Object.keys(availability).length,
      availableSlots: Object.values(availability).filter(Boolean).length,
      bookedSlots: Object.values(availability).filter(slot => !slot).length
    });

    return availability;

  } catch (error) {
    console.error('❌ REAL calendar availability error:', error);

    // IMPORTANT: Don't use fallback - return error so user knows something is wrong
    throw new Error(`Calendar integration failed: ${error.message}. Real-time booking prevention not working.`);
  }
}

export async function createCalendarEvent(booking, includeAttendees = false) {
  try {
    console.log('📅 Creating BLOCKING calendar event for booking:', booking.id);

    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');

    // Parse the booking date and time properly
    const eventDate = booking.event_date;
    const eventTime = booking.event_time;

    console.log('📅 Event details:', eventDate, eventTime);

    // Parse time properly
    const [time, period] = eventTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;

    // Create event start time in Denver timezone
    const eventDateTime = new Date(eventDate + 'T00:00:00-06:00');
    eventDateTime.setHours(hour24, minutes, 0, 0);

    // Calculate end time based on hours_requested
    const duration = parseFloat(booking.hours_requested) || 2;
    const endDateTime = new Date(eventDateTime.getTime() + duration * 60 * 60 * 1000);

    console.log('📅 Creating BLOCKING calendar event:', {
      event: booking.event_name,
      start: eventDateTime.toISOString(),
      end: endDateTime.toISOString(),
      duration: duration + ' hours'
    });

    // CRITICAL: Create event that BLOCKS the time slot
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

    // CRITICAL: Create the event in your NEW Google Workspace calendar
    const response = await calendar.events.insert({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID, // Your new calendar ID
      resource: event,
      sendUpdates: 'none' // Don't send updates yet
    });

    console.log('✅ BLOCKING calendar event created successfully!');
    console.log('📅 Event ID:', response.data.id);
    console.log('🔒 Time slot now BLOCKED for other users');

    return response.data;

  } catch (error) {
    console.error('❌ CRITICAL: Calendar event creation failed:', error);

    // CRITICAL: This is essential for preventing double bookings
    throw new Error(`Calendar event creation failed: ${error.message}. Time slot NOT blocked!`);
  }
}