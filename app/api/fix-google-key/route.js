// app/api/fix-google-key/route.js
// Diagnose and help fix Google private key format issues

export async function GET(request) {
  const results = {
    timestamp: new Date().toISOString(),
    keyAnalysis: {},
    recommendation: '',
    fixedKeyFormat: null
  };

  try {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    
    if (!privateKey) {
      return Response.json({
        error: 'GOOGLE_PRIVATE_KEY environment variable not found',
        solution: 'Add GOOGLE_PRIVATE_KEY to your .env.local file'
      }, { status: 400 });
    }
    
    if (!clientEmail) {
      return Response.json({
        error: 'GOOGLE_CLIENT_EMAIL environment variable not found',
        solution: 'Add GOOGLE_CLIENT_EMAIL to your .env.local file'
      }, { status: 400 });
    }
    
    console.log('🔍 Analyzing Google private key format...');
    
    // Analyze the private key
    results.keyAnalysis = {
      hasKey: !!privateKey,
      keyLength: privateKey.length,
      startsCorrectly: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
      endsCorrectly: privateKey.includes('-----END PRIVATE KEY-----'),
      hasEscapedNewlines: privateKey.includes('\\n'),
      hasRealNewlines: privateKey.includes('\n') && !privateKey.includes('\\n'),
      hasQuotes: privateKey.startsWith('"') || privateKey.startsWith("'"),
      clientEmail: clientEmail
    };
    
    // Determine the issue
    if (!results.keyAnalysis.startsCorrectly || !results.keyAnalysis.endsCorrectly) {
      results.recommendation = 'INVALID_KEY_FORMAT';
      results.message = '❌ Private key is missing BEGIN/END markers';
      results.solution = 'Your private key should start with -----BEGIN PRIVATE KEY----- and end with -----END PRIVATE KEY-----';
      
    } else if (results.keyAnalysis.hasRealNewlines && !results.keyAnalysis.hasEscapedNewlines) {
      results.recommendation = 'NEEDS_ESCAPING';
      results.message = '⚠️ Private key has real newlines instead of escaped \\n';
      results.solution = 'Replace all actual newlines with \\n in your .env.local file';
      
      // Generate the properly escaped version
      results.fixedKeyFormat = privateKey.replace(/\n/g, '\\n');
      
    } else if (!results.keyAnalysis.hasEscapedNewlines && !results.keyAnalysis.hasRealNewlines) {
      results.recommendation = 'MISSING_NEWLINES';
      results.message = '❌ Private key appears to be missing newlines entirely';
      results.solution = 'Your private key needs proper \\n characters between lines';
      
    } else if (results.keyAnalysis.hasEscapedNewlines) {
      results.recommendation = 'FORMAT_LOOKS_GOOD';
      results.message = '✅ Private key format appears correct';
      results.solution = 'Key format is good, but there may be a different auth issue';
      
      // Test if we can create a credentials object
      try {
        const testKey = privateKey.replace(/\\n/g, '\n');
        
        // Basic validation that it looks like a proper key
        if (testKey.split('\n').length < 3) {
          results.recommendation = 'KEY_TOO_SHORT';
          results.message = '❌ Private key appears to be incomplete';
          results.solution = 'Make sure you copied the entire private key from your service account JSON';
        }
        
      } catch (testError) {
        results.recommendation = 'KEY_VALIDATION_FAILED';
        results.message = '❌ Private key failed validation test';
        results.solution = 'Double-check that you copied the entire private key correctly';
      }
    }
    
    // Provide example format
    results.exampleFormat = `
Your .env.local should have:
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKg...\\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"

Note: The \\n should be literal text in the .env file, not actual line breaks.
    `;
    
    // Security note
    results.securityNote = "🔒 This endpoint analyzes key format only. The actual key content is not logged or exposed.";
    
    return Response.json(results);
    
  } catch (error) {
    console.error('❌ Private key analysis error:', error);
    
    return Response.json({
      error: 'Failed to analyze private key',
      details: error.message,
      recommendation: 'Check your Google service account setup'
    }, { status: 500 });
  }
}

// Test endpoint to verify Google Calendar connection
export async function POST(request) {
  try {
    const { testConnection } = await request.json();
    
    if (testConnection) {
      console.log('🧪 Testing Google Calendar connection...');
      
      // Import the calendar functions
      const { checkCalendarAvailability } = await import('../../lib/calendar.js');
      
      // Test with tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const testDate = tomorrow.toISOString().split('T')[0];
      
      try {
        const availability = await checkCalendarAvailability(testDate);
        
        return Response.json({
          success: true,
          message: '✅ Google Calendar connection working!',
          testDate,
          availability: {
            totalSlots: Object.keys(availability).length,
            availableSlots: Object.values(availability).filter(Boolean).length,
            sampleSlots: Object.keys(availability).slice(0, 3)
          }
        });
        
      } catch (calendarError) {
        return Response.json({
          success: false,
          message: '❌ Google Calendar connection failed',
          error: calendarError.message,
          recommendation: calendarError.message.includes('DECODER routines') 
            ? 'Private key format issue - check the GET endpoint for diagnosis'
            : 'Check your Google service account permissions and calendar ID'
        }, { status: 500 });
      }
    }
    
    return Response.json({
      message: 'Send {"testConnection": true} to test Google Calendar connection'
    });
    
  } catch (error) {
    return Response.json({
      error: 'Test request failed',
      details: error.message
    }, { status: 500 });
  }
}