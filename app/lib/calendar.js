// app/lib/calendar.js - FINAL SIMPLE FIX
// Stop overthinking timezones - just match the times directly

import { google } from 'googleapis';

async function getGoogleAuth() {
  try {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Missing Google Calendar credentials');
    }

    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

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
    console.error('❌ Google Auth setup error:', error);
    throw error;
  }
}

// Convert time string to 24-hour format
function timeStringTo24Hour(timeStr) {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  
  let hour24 = hours;
  if (period === 'AM' && hours === 12) hour24 = 0;
  if (period === 'PM' && hours !== 12) hour24 = hours + 12;
  
  return { hour: hour24, minute: minutes };
}

// SIMPLE APPROACH: Just extract the hour from both and compare directly
export async function checkCalendarAvailability(date) {
  try {
    console.log('🗓️ FINAL CHECK: Checking availability for:', date);

    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');

    // Get events for the day
    const startTime = new Date(date + 'T00:00:00-07:00');
    const endTime = new Date(date + 'T23:59:59-07:00');

    const response = await calendar.events.list({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: 'America/Denver'
    });

    const events = response.data.items || [];
    console.log('📅 Found events:', events.length);

    // Extract the booked time ranges in simple format
    const bookedRanges = [];
    
    events.forEach(event => {
      if (event.start.dateTime && event.end.dateTime) {
        // Get the LOCAL time strings from the event
        const startLocal = new Date(event.start.dateTime).toLocaleString('en-US', { 
          timeZone: 'America/Denver',
          hour12: true,
          hour: 'numeric',
          minute: '2-digit'
        });
        
        const endLocal = new Date(event.end.dateTime).toLocaleString('en-US', { 
          timeZone: 'America/Denver',
          hour12: true,
          hour: 'numeric',
          minute: '2-digit'
        });

        console.log(`📌 Event: ${event.summary}`);
        console.log(`   Local time: ${startLocal} to ${endLocal}`);
        
        // Convert to 24-hour for easy comparison
        const startTime = timeStringTo24Hour(startLocal);
        const endTime = timeStringTo24Hour(endLocal);
        
        bookedRanges.push({
          startHour: startTime.hour,
          startMin: startTime.minute,
          endHour: endTime.hour,
          endMin: endTime.minute,
          summary: event.summary
        });
        
        console.log(`   24hr format: ${startTime.hour}:${String(startTime.minute).padStart(2,'0')} to ${endTime.hour}:${String(endTime.minute).padStart(2,'0')}`);
      }
    });

    // Check each time slot
    const timeSlots = [
      '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
      '6:00 PM', '7:00 PM', '8:00 PM'
    ];

    const availability = {};

    timeSlots.forEach(slot => {
      const slotTime = timeStringTo24Hour(slot);
      let isBlocked = false;
      
      console.log(`\n🕐 Checking slot: ${slot} (${slotTime.hour}:${String(slotTime.minute).padStart(2,'0')})`);
      
      // Check against each booked range
      bookedRanges.forEach(range => {
        // Convert everything to minutes for easy comparison
        const slotMinutes = slotTime.hour * 60 + slotTime.minute;
        const rangeStartMinutes = range.startHour * 60 + range.startMin;
        const rangeEndMinutes = range.endHour * 60 + range.endMin;
        
        console.log(`   vs ${range.summary}: ${range.startHour}:${String(range.startMin).padStart(2,'0')} to ${range.endHour}:${String(range.endMin).padStart(2,'0')}`);
        console.log(`   Minutes: slot=${slotMinutes}, range=${rangeStartMinutes}-${rangeEndMinutes}`);
        
        // Slot is blocked if it starts within the booked range
        if (slotMinutes >= rangeStartMinutes && slotMinutes < rangeEndMinutes) {
          isBlocked = true;
          console.log(`   ❌ BLOCKED: Slot starts within booked period`);
        } else {
          console.log(`   ✅ Available against this event`);
        }
      });
      
      availability[slot] = !isBlocked;
      console.log(`   FINAL: ${slot} is ${isBlocked ? 'BLOCKED' : 'AVAILABLE'}`);
    });

    console.log('\n📊 FINAL RESULT:');
    console.log('Available:', Object.entries(availability).filter(([,avail]) => avail).map(([slot]) => slot));
    console.log('Blocked:', Object.entries(availability).filter(([,avail]) => !avail).map(([slot]) => slot));

    return availability;

  } catch (error) {
    console.error('❌ Calendar error:', error);
    throw error;
  }
}

// Calendar event creation - simplified
export async function createCalendarEvent(booking, includeAttendees = false) {
  try {
    console.log('📅 Creating calendar event for booking:', booking.id);

    const auth = await getGoogleAuth();
    const calendar = google.calendar('v3');

    const { hour, minute } = timeStringTo24Hour(booking.event_time);
    const duration = parseFloat(booking.hours_requested) || 2;

    // Create start time
    const startDateTime = new Date(booking.event_date + 'T00:00:00-07:00');
    startDateTime.setHours(hour, minute, 0, 0);

    // Create end time
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60 * 1000);

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

Booking ID: ${booking.id}
Contact manager@merrittfitness.net for changes.
      `.trim(),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Denver',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Denver',
      },
      location: 'Merritt Fitness, 2246 Irving St, Denver, CO 80211',
      colorId: '11',
      transparency: 'opaque',
      visibility: 'public'
    };

    const response = await calendar.events.insert({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
      sendUpdates: 'none'
    });

    console.log('✅ Calendar event created:', response.data.id);
    return response.data;

  } catch (error) {
    console.error('❌ Calendar event creation failed:', error);
    throw error;
  }
}