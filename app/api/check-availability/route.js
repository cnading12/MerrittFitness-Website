// app/api/check-availability/route.js
// FIXED VERSION - Proper availability checking with better error handling

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

    // Get availability from calendar
    console.log('📅 Checking calendar availability...');
    const availability = await checkCalendarAvailability(date);
    
    console.log('✅ Availability check completed:', {
      date,
      totalSlots: Object.keys(availability).length,
      availableSlots: Object.values(availability).filter(Boolean).length
    });

    return Response.json({
      date,
      availability,
      message: 'Availability retrieved successfully',
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Availability check error:', error);
    
    // Return fallback availability instead of failing completely
    const fallbackAvailability = {};
    const timeSlots = [
      '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
      '6:00 PM', '7:00 PM', '8:00 PM'
    ];
    
    timeSlots.forEach(slot => {
      fallbackAvailability[slot] = true; // Assume available if we can't check
    });
    
    console.warn('⚠️ Using fallback availability due to error');
    
    return Response.json({
      date: new URL(request.url).searchParams.get('date'),
      availability: fallbackAvailability,
      message: 'Using fallback availability - calendar check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Calendar temporarily unavailable',
      lastUpdated: new Date().toISOString()
    }, { status: 206 }); // 206 Partial Content to indicate fallback
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}