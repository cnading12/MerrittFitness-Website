// app/api/debug-calendar/route.js
// Debug endpoint to diagnose calendar integration issues

export async function GET(request) {
  const debug = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    issues: [],
    recommendations: [],
    status: 'checking'
  };

  try {
    console.log('🔍 Debugging calendar integration...');
    
    // Check 1: Environment Variables
    const requiredEnvVars = [
      'GOOGLE_CLIENT_EMAIL',
      'GOOGLE_PRIVATE_KEY', 
      'GOOGLE_CALENDAR_ID'
    ];
    
    debug.environmentCheck = {};
    
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      debug.environmentCheck[varName] = {
        exists: !!value,
        length: value ? value.length : 0,
        preview: value ? `${value.substring(0, 20)}...` : 'MISSING'
      };
      
      if (!value) {
        debug.issues.push(`Missing environment variable: ${varName}`);
        debug.recommendations.push(`Add ${varName} to your production environment`);
      }
    });

    // Check 2: Private Key Format
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (privateKey) {
      debug.privateKeyCheck = {
        hasBeginMarker: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
        hasEndMarker: privateKey.includes('-----END PRIVATE KEY-----'),
        hasEscapedNewlines: privateKey.includes('\\n'),
        hasRealNewlines: privateKey.includes('\n') && !privateKey.includes('\\n'),
        length: privateKey.length
      };
      
      if (!debug.privateKeyCheck.hasBeginMarker || !debug.privateKeyCheck.hasEndMarker) {
        debug.issues.push('Private key missing BEGIN/END markers');
        debug.recommendations.push('Verify private key is complete and properly formatted');
      }
      
      if (!debug.privateKeyCheck.hasEscapedNewlines && !debug.privateKeyCheck.hasRealNewlines) {
        debug.issues.push('Private key appears to be missing newlines');
        debug.recommendations.push('Private key needs proper \\n characters or actual newlines');
      }
    }

    // Check 3: Calendar ID Format
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (calendarId) {
      debug.calendarIdCheck = {
        hasAtSymbol: calendarId.includes('@'),
        endsWithGoogle: calendarId.endsWith('@group.calendar.google.com'),
        length: calendarId.length,
        format: calendarId.includes('@group.calendar.google.com') ? 'correct' : 'suspicious'
      };
      
      if (!debug.calendarIdCheck.hasAtSymbol) {
        debug.issues.push('Calendar ID appears to be missing @ symbol');
        debug.recommendations.push('Verify calendar ID format: should end with @group.calendar.google.com');
      }
    }

    // Check 4: Test Calendar Function Import
    try {
      const { checkCalendarAvailability } = await import('../../lib/calendar.js');
      debug.calendarImport = { success: true };
    } catch (importError) {
      debug.calendarImport = { 
        success: false, 
        error: importError.message 
      };
      debug.issues.push('Calendar module import failed');
      debug.recommendations.push('Check calendar.js file exists and has no syntax errors');
    }

    // Check 5: Try Test Calendar Call (if all env vars exist)
    if (debug.environmentCheck.GOOGLE_CLIENT_EMAIL.exists && 
        debug.environmentCheck.GOOGLE_PRIVATE_KEY.exists && 
        debug.environmentCheck.GOOGLE_CALENDAR_ID.exists) {
      
      try {
        console.log('🧪 Testing calendar availability call...');
        const { checkCalendarAvailability } = await import('../../lib/calendar.js');
        
        // Test with tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const testDate = tomorrow.toISOString().split('T')[0];
        
        const availability = await checkCalendarAvailability(testDate);
        
        debug.calendarTest = {
          success: true,
          testDate,
          slotsReturned: Object.keys(availability).length,
          sampleSlots: Object.keys(availability).slice(0, 3)
        };
        
      } catch (calendarError) {
        debug.calendarTest = {
          success: false,
          error: calendarError.message,
          stack: process.env.NODE_ENV === 'development' ? calendarError.stack : 'hidden'
        };
        
        debug.issues.push(`Calendar API test failed: ${calendarError.message}`);
        
        if (calendarError.message.includes('DECODER routines')) {
          debug.recommendations.push('Private key format issue - check newlines and encoding');
        } else if (calendarError.message.includes('auth')) {
          debug.recommendations.push('Authentication issue - verify service account permissions');
        } else if (calendarError.message.includes('not found')) {
          debug.recommendations.push('Calendar ID may be incorrect or calendar not accessible');
        } else {
          debug.recommendations.push('Check Google Cloud Console for API quota and permissions');
        }
      }
    } else {
      debug.issues.push('Cannot test calendar API - missing required environment variables');
    }

    // Final Status
    if (debug.issues.length === 0) {
      debug.status = 'healthy';
      debug.message = 'Calendar integration appears to be working correctly';
    } else {
      debug.status = 'unhealthy';
      debug.message = `Found ${debug.issues.length} issues with calendar integration`;
    }

    return Response.json({
      success: debug.status === 'healthy',
      debug,
      nextSteps: {
        immediate: [
          'Check your production environment variables',
          'Verify Google Calendar service account has access to calendar',
          'Test calendar API permissions in Google Cloud Console'
        ],
        ifStillBroken: [
          'Regenerate Google service account credentials',
          'Verify calendar sharing settings',
          'Check Google Cloud Console API quotas',
          'Test with a simpler calendar ID first'
        ]
      }
    });

  } catch (error) {
    debug.status = 'error';
    debug.issues.push(`Debug process failed: ${error.message}`);
    
    return Response.json({
      success: false,
      debug,
      error: error.message,
      recommendation: 'Check server logs and environment configuration'
    }, { status: 500 });
  }
}