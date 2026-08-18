// app/api/check-availability/route.js
// PRODUCTION VERSION - Better error handling and fallback

import { checkCalendarAvailability } from '../../lib/calendar.js';
import { enforceRateLimit } from '../../lib/rate-limit.js';
import { corsHeaders, corsPreflightResponse } from '../../lib/http.js';

// Each call is a Google Calendar API request against a finite daily quota.
// Burn the quota and real renters see "calendar unavailable". The booking UI
// fetches one date at a time as the renter clicks around, so 60/minute is
// well above normal browsing and well below quota-exhausting.
const RATE_LIMIT = { bucket: 'check-availability', limit: 60, windowMs: 60_000 };

export async function GET(request) {
  const limited = enforceRateLimit(request, RATE_LIMIT, corsHeaders(request, { methods: 'GET, OPTIONS' }));
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    console.log('🔍 Availability check requested for date:', date);
    
    if (!date) {
      console.error('❌ No date parameter provided');
      return Response.json({ 
        error: 'Date parameter required',
        message: 'Please provide a date in YYYY-MM-DD format'
      }, { status: 400 });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.error('❌ Invalid date format:', date);
      return Response.json({ 
        error: 'Invalid date format',
        message: 'Date must be in YYYY-MM-DD format'
      }, { status: 400 });
    }

    // Check if date is in the past
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (requestedDate < today) {
      console.warn('⚠️ Requested date is in the past:', date);
      // Return all slots as unavailable for past dates
      const pastAvailability = {};
      const timeSlots = [
        '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
        '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
        '6:00 PM', '7:00 PM', '8:00 PM'
      ];
      
      timeSlots.forEach(slot => {
        pastAvailability[slot] = false;
      });
      
      return Response.json({
        date,
        availability: pastAvailability,
        message: 'Past dates are not available for booking'
      });
    }

    // ENHANCED: Better environment check
    const requiredEnvVars = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_CALENDAR_ID'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars);
      return Response.json({
        error: 'Calendar system temporarily unavailable',
        message: 'Calendar service configuration error. Please try again later.',
        details: process.env.NODE_ENV === 'development' 
          ? `Missing: ${missingVars.join(', ')}` 
          : 'Configuration error'
      }, { status: 503 });
    }

    // Get availability from calendar with enhanced error handling
    console.log('📅 Checking calendar availability...');
    
    try {
      const availability = await checkCalendarAvailability(date);
      
      console.log('✅ Availability check completed:', {
        date,
        totalSlots: Object.keys(availability).length,
        availableSlots: Object.values(availability).filter(Boolean).length,
        bookedSlots: Object.values(availability).filter(slot => !slot).length
      });

      return Response.json({
        date,
        availability,
        message: 'Availability retrieved successfully',
        lastUpdated: new Date().toISOString()
      });
      
    } catch (calendarError) {
      console.error('❌ Calendar API error:', calendarError);
      
      // Provide specific error messages based on error type
      let userMessage = 'Unable to check availability. Please try again later.';
      let statusCode = 503;
      
      if (calendarError.message.includes('DECODER routines')) {
        userMessage = 'Calendar service configuration error.';
        console.error('💡 HINT: Private key format issue - check newlines and encoding');
      } else if (calendarError.message.includes('auth') || calendarError.message.includes('401')) {
        userMessage = 'Calendar authentication error.';
        console.error('💡 HINT: Check service account permissions and calendar access');
      } else if (calendarError.message.includes('not found') || calendarError.message.includes('404')) {
        userMessage = 'Calendar not found.';
        console.error('💡 HINT: Verify calendar ID and sharing settings');
      } else if (calendarError.message.includes('quota') || calendarError.message.includes('429')) {
        userMessage = 'Calendar service temporarily busy. Please try again in a moment.';
        statusCode = 429;
      }
      
      return Response.json({
        error: 'Calendar system temporarily unavailable',
        message: userMessage,
        details: process.env.NODE_ENV === 'development' ? calendarError.message : 'Calendar service error'
      }, { status: statusCode });
    }
    
  } catch (error) {
    console.error('❌ Availability check error:', error);
    
    return Response.json({
      error: 'Service temporarily unavailable',
      message: 'Unable to process availability request. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal service error'
    }, { status: 503 });
  }
}

// Handle preflight requests
export async function OPTIONS(request) {
  return corsPreflightResponse(request, { methods: 'GET, OPTIONS' });
}