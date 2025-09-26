// app/api/test-calendar/route.js
// Complete diagnostic tool to test your calendar integration

import { createCalendarEvent, checkCalendarAvailability } from '../../lib/calendar.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'help';
  
  console.log('🧪 Testing calendar integration:', action);

  try {
    // Test 1: Environment Variables Check
    if (action === 'test-env') {
      const requiredVars = [
        'GOOGLE_CLIENT_EMAIL',
        'GOOGLE_PRIVATE_KEY', 
        'GOOGLE_CALENDAR_ID'
      ];
      
      const envStatus = {};
      let allGood = true;
      
      requiredVars.forEach(varName => {
        const value = process.env[varName];
        const exists = !!value;
        if (!exists) allGood = false;
        
        envStatus[varName] = {
          exists,
          length: value ? value.length : 0,
          preview: value ? value.substring(0, 30) + '...' : 'MISSING ❌',
          valid: exists
        };
        
        // Special validation for private key
        if (varName === 'GOOGLE_PRIVATE_KEY' && value) {
          const hasBegin = value.includes('-----BEGIN PRIVATE KEY-----');
          const hasEnd = value.includes('-----END PRIVATE KEY-----');
          envStatus[varName].valid = hasBegin && hasEnd;
          envStatus[varName].issues = [];
          
          if (!hasBegin) envStatus[varName].issues.push('Missing BEGIN marker');
          if (!hasEnd) envStatus[varName].issues.push('Missing END marker');
          if (!value.includes('\\n') && !value.includes('\n')) {
            envStatus[varName].issues.push('Missing newlines - should have \\n characters');
          }
        }
        
        // Special validation for calendar ID
        if (varName === 'GOOGLE_CALENDAR_ID' && value) {
          const isValidFormat = value.includes('@') && (value.includes('group.calendar.google.com') || value.includes('gmail.com'));
          envStatus[varName].valid = isValidFormat;
          if (!isValidFormat) {
            envStatus[varName].issues = ['Should end with @group.calendar.google.com or @gmail.com'];
          }
        }
      });
      
      return Response.json({
        success: allGood,
        message: allGood ? 'All environment variables are present!' : 'Missing or invalid environment variables',
        environment: envStatus,
        nextStep: allGood ? 'Try: /api/test-calendar?action=test-connection' : 'Fix the missing/invalid variables above',
        tips: {
          private_key: 'Should be wrapped in quotes with \\n for newlines',
          calendar_id: 'Should be the full calendar ID from Google Calendar settings',
          client_email: 'Should be your service account email ending in .iam.gserviceaccount.com'
        }
      });
    }

    // Test 2: Basic Calendar Connection
    if (action === 'test-connection') {
      console.log('🔍 Testing calendar connection...');
      
      // Check today's availability
      const testDate = new Date().toISOString().split('T')[0];
      console.log('📅 Checking availability for:', testDate);
      
      const availability = await checkCalendarAvailability(testDate);
      
      const availableSlots = Object.entries(availability).filter(([,avail]) => avail);
      const bookedSlots = Object.entries(availability).filter(([,avail]) => !avail);
      
      return Response.json({
        success: true,
        message: '🎉 Calendar connection successful!',
        testDate,
        results: {
          totalSlots: Object.keys(availability).length,
          availableSlots: availableSlots.length,
          bookedSlots: bookedSlots.length,
          availability: availability
        },
        analysis: {
          available: availableSlots.map(([slot]) => slot),
          booked: bookedSlots.map(([slot]) => slot)
        },
        nextStep: 'Try creating a test event: /api/test-calendar?action=test-event'
      });
    }

    // Test 3: Create Test Calendar Event
    if (action === 'test-event') {
      console.log('📅 Creating test calendar event...');
      
      const timestamp = Date.now();
      const testBooking = {
        id: `test-${timestamp}`,
        event_name: `🧪 TEST EVENT ${new Date().toLocaleTimeString()}`,
        event_type: 'test',
        event_date: new Date().toISOString().split('T')[0], // Today
        event_time: '3:00 PM', // Afternoon time
        hours_requested: 1,
        contact_name: 'Test User',
        email: 'test@example.com',
        phone: '(555) 123-4567',
        business_name: 'Test Business',
        special_requests: `This is a test event created at ${new Date().toLocaleString()} to verify calendar integration is working properly.`
      };
      
      const calendarEvent = await createCalendarEvent(testBooking, false);
      
      return Response.json({
        success: true,
        message: '🎉 Test calendar event created successfully!',
        testBooking: {
          id: testBooking.id,
          name: testBooking.event_name,
          date: testBooking.event_date,
          time: testBooking.event_time,
          duration: testBooking.hours_requested + ' hours'
        },
        calendarEvent: {
          id: calendarEvent.id,
          summary: calendarEvent.summary,
          start: calendarEvent.start,
          end: calendarEvent.end,
          htmlLink: calendarEvent.htmlLink || 'N/A'
        },
        nextStep: 'Check your Google Calendar to see the test event! Then try: /api/test-calendar?action=test-booking-flow'
      });
    }

    // Test 4: Complete Booking Flow Simulation
    if (action === 'test-booking-flow') {
      console.log('🔄 Testing complete booking flow...');
      
      const timestamp = Date.now();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const testDate = tomorrow.toISOString().split('T')[0];
      
      // Step 1: Check availability for tomorrow
      console.log('Step 1: Checking availability for', testDate);
      const initialAvailability = await checkCalendarAvailability(testDate);
      
      // Find an available time slot
      const availableTimes = Object.entries(initialAvailability)
        .filter(([,available]) => available)
        .map(([time]) => time);
      
      if (availableTimes.length === 0) {
        return Response.json({
          success: false,
          error: 'No available time slots found for tomorrow',
          date: testDate,
          availability: initialAvailability,
          suggestion: 'Try with a different date that has availability'
        });
      }
      
      const selectedTime = availableTimes[0]; // Use first available slot
      
      // Step 2: Create booking
      const testBooking = {
        id: `flow-test-${timestamp}`,
        event_name: `🧪 BOOKING FLOW TEST ${new Date().toLocaleTimeString()}`,
        event_type: 'test',
        event_date: testDate,
        event_time: selectedTime,
        hours_requested: 2,
        contact_name: 'Flow Test User',
        email: 'flowtest@example.com',
        phone: '(555) 987-6543',
        business_name: 'Flow Test Company',
        special_requests: `Complete booking flow test created at ${new Date().toLocaleString()}`
      };
      
      console.log('Step 2: Creating calendar event for', selectedTime);
      const calendarEvent = await createCalendarEvent(testBooking, false);
      
      // Step 3: Verify the slot is now blocked
      console.log('Step 3: Re-checking availability after event creation...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for Google to update
      const updatedAvailability = await checkCalendarAvailability(testDate);
      const isNowBlocked = updatedAvailability[selectedTime] === false;
      
      return Response.json({
        success: true,
        message: '🎉 Complete booking flow test completed!',
        testDetails: {
          date: testDate,
          selectedTime: selectedTime,
          bookingId: testBooking.id,
          eventName: testBooking.event_name
        },
        results: {
          step1_availability_check: '✅ PASSED',
          step2_calendar_creation: '✅ PASSED',
          step3_availability_update: isNowBlocked ? '✅ PASSED - Time slot properly blocked' : '⚠️ WARNING - Time slot not blocked (may take a few minutes)',
          calendar_event_id: calendarEvent.id
        },
        calendarEvent: {
          id: calendarEvent.id,
          summary: calendarEvent.summary,
          start: calendarEvent.start,
          end: calendarEvent.end,
          htmlLink: calendarEvent.htmlLink || 'Check your Google Calendar'
        },
        availabilityComparison: {
          before: Object.entries(initialAvailability).filter(([,avail]) => avail).length + ' available slots',
          after: Object.entries(updatedAvailability).filter(([,avail]) => avail).length + ' available slots',
          selectedSlotBefore: initialAvailability[selectedTime] ? 'Available' : 'Blocked',
          selectedSlotAfter: updatedAvailability[selectedTime] ? 'Available' : 'Blocked'
        }
      });
    }

    // Test 5: Clean up test events
    if (action === 'cleanup') {
      return Response.json({
        message: 'To clean up test events, manually delete them from your Google Calendar',
        instructions: [
          '1. Go to your Google Calendar',
          '2. Look for events with "🧪 TEST EVENT" or "🧪 BOOKING FLOW TEST" in the title',
          '3. Delete these test events',
          '4. They were only created for testing purposes'
        ]
      });
    }

    // Default: Help/Instructions
    return Response.json({
      message: '🧪 Calendar Integration Diagnostic Tool',
      description: 'This tool helps diagnose and test your Google Calendar integration',
      availableTests: [
        {
          endpoint: '/api/test-calendar?action=test-env',
          description: 'Check if environment variables are properly configured',
          when: 'Start here - Run this first'
        },
        {
          endpoint: '/api/test-calendar?action=test-connection', 
          description: 'Test basic calendar connection and availability checking',
          when: 'After environment variables are confirmed'
        },
        {
          endpoint: '/api/test-calendar?action=test-event',
          description: 'Create a test calendar event',
          when: 'After connection test passes'
        },
        {
          endpoint: '/api/test-calendar?action=test-booking-flow',
          description: 'Test complete booking flow from availability check to calendar creation',
          when: 'Final comprehensive test'
        },
        {
          endpoint: '/api/test-calendar?action=cleanup',
          description: 'Instructions for cleaning up test events',
          when: 'After testing is complete'
        }
      ],
      recommendedOrder: [
        '1. test-env - Check your environment variables',
        '2. test-connection - Verify calendar access',
        '3. test-event - Create a test event',
        '4. test-booking-flow - Test the complete flow',
        '5. cleanup - Clean up test events'
      ],
      commonIssues: {
        'Environment variables missing': 'Run test-env to check',
        'Private key format wrong': 'Ensure proper formatting with \\n characters',
        'Service account not added to calendar': 'Add your service account email to your Google Calendar with edit permissions',
        'Calendar API not enabled': 'Enable Google Calendar API in Google Cloud Console',
        'Wrong calendar ID': 'Use the calendar ID from Google Calendar settings'
      }
    });

  } catch (error) {
    console.error('❌ Calendar test failed:', error);
    
    // Provide specific error guidance
    let troubleshooting = [];
    let errorType = 'UNKNOWN_ERROR';
    
    if (error.message.includes('DECODER routines') || error.message.includes('PEM')) {
      errorType = 'PRIVATE_KEY_FORMAT';
      troubleshooting.push('❌ Google private key format issue');
      troubleshooting.push('✅ Fix: Ensure your GOOGLE_PRIVATE_KEY has proper newlines (\\n)');
      troubleshooting.push('✅ Example: "-----BEGIN PRIVATE KEY-----\\nYOUR_KEY\\n-----END PRIVATE KEY-----"');
    }
    
    if (error.message.includes('auth') || error.message.includes('401') || error.message.includes('403')) {
      errorType = 'AUTHENTICATION';
      troubleshooting.push('❌ Authentication failed');
      troubleshooting.push('✅ Check your service account email is correct');
      troubleshooting.push('✅ Ensure service account is added to your calendar with edit permissions');
      troubleshooting.push('✅ Verify Calendar API is enabled in Google Cloud Console');
    }
    
    if (error.message.includes('not found') || error.message.includes('404')) {
      errorType = 'CALENDAR_NOT_FOUND';
      troubleshooting.push('❌ Calendar not found');
      troubleshooting.push('✅ Check your GOOGLE_CALENDAR_ID is correct');
      troubleshooting.push('✅ Ensure calendar is shared with your service account');
    }
    
    if (error.message.includes('quota') || error.message.includes('429')) {
      errorType = 'RATE_LIMIT';
      troubleshooting.push('❌ API quota exceeded');
      troubleshooting.push('✅ Wait a few minutes and try again');
      troubleshooting.push('✅ Check your Google Cloud Console for quota limits');
    }

    return Response.json({
      success: false,
      error: error.message,
      errorType,
      troubleshooting,
      environmentCheck: {
        hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasCalendarId: !!process.env.GOOGLE_CALENDAR_ID,
        privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
        calendarIdFormat: process.env.GOOGLE_CALENDAR_ID?.includes('@') || false
      },
      nextSteps: [
        'Run /api/test-calendar?action=test-env to check your environment variables',
        'Verify your service account setup in Google Cloud Console',
        'Ensure your calendar is shared with the service account',
        'Check that Calendar API is enabled'
      ]
    }, { status: 500 });
  }
}

// Handle CORS
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