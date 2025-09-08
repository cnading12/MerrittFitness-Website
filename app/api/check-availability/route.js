// app/api/check-availability/route.js
// FIXED VERSION - Properly prevents double bookings

import { checkCalendarAvailability } from '../../lib/calendar.js';

export async function GET(request) {
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

    // Get availability from calendar - THIS IS THE KEY FIX
    console.log('📅 Checking REAL calendar availability...');
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
    
  } catch (error) {
    console.error('❌ Availability check error:', error);
    
    // CRITICAL: Don't use fallback - return error so system doesn't allow bookings when calendar is broken
    return Response.json({
      error: 'Calendar system temporarily unavailable',
      message: 'Unable to check availability. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Calendar service error'
    }, { status: 503 }); // Service Unavailable
  }
}