// app/api/test-env/route.js
// DIAGNOSTIC ENDPOINT - Test environment variables and calendar setup
// ⚠️ REMOVE THIS FILE IN PRODUCTION OR ADD AUTHENTICATION

export async function GET(request) {
  console.log('🔧 Environment diagnostic starting...');

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: {},
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  // Test 1: Check all required environment variables exist
  console.log('Test 1: Checking environment variables...');
  const requiredVars = {
    'GOOGLE_CLIENT_EMAIL': 'Google Service Account Email',
    'GOOGLE_PRIVATE_KEY': 'Google Service Account Private Key',
    'GOOGLE_CALENDAR_ID': 'Google Calendar ID',
    'SUPABASE_URL': 'Supabase URL',
    'SUPABASE_ANON_KEY': 'Supabase Anonymous Key',
    'RESEND_API_KEY': 'Resend API Key',
    'STRIPE_SECRET_KEY': 'Stripe Secret Key',
    'STRIPE_WEBHOOK_SECRET': 'Stripe Webhook Secret',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': 'Stripe Publishable Key'
  };

  diagnostics.tests.environmentVariables = {
    name: 'Environment Variables',
    status: 'checking',
    variables: {}
  };

  Object.entries(requiredVars).forEach(([key, description]) => {
    const exists = !!process.env[key];
    const value = process.env[key];
    
    diagnostics.tests.environmentVariables.variables[key] = {
      description,
      exists,
      length: value ? value.length : 0,
      preview: value ? `${value.substring(0, 20)}...` : 'NOT SET',
      issue: null
    };

    if (!exists) {
      diagnostics.tests.environmentVariables.variables[key].issue = 'Missing';
      diagnostics.summary.failed++;
    } else {
      diagnostics.summary.passed++;
    }
  });

  // Test 2: Validate GOOGLE_PRIVATE_KEY format
  console.log('Test 2: Validating Google Private Key format...');
  diagnostics.tests.googlePrivateKey = {
    name: 'Google Private Key Format',
    status: 'checking',
    checks: {}
  };

  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  
  if (privateKey) {
    // Check if it starts with the correct header
    diagnostics.tests.googlePrivateKey.checks.hasHeader = {
      pass: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
      message: privateKey.includes('-----BEGIN PRIVATE KEY-----') 
        ? '✅ Has BEGIN header' 
        : '❌ Missing BEGIN header'
    };

    // Check if it ends with the correct footer
    diagnostics.tests.googlePrivateKey.checks.hasFooter = {
      pass: privateKey.includes('-----END PRIVATE KEY-----'),
      message: privateKey.includes('-----END PRIVATE KEY-----') 
        ? '✅ Has END footer' 
        : '❌ Missing END footer'
    };

    // Check for actual newlines vs literal \n
    const hasRealNewlines = privateKey.includes('\n');
    const hasLiteralBackslashN = privateKey.includes('\\n');
    
    diagnostics.tests.googlePrivateKey.checks.newlineFormat = {
      hasRealNewlines,
      hasLiteralBackslashN,
      message: hasRealNewlines 
        ? '✅ Has real newlines' 
        : hasLiteralBackslashN 
          ? '⚠️ Has literal \\n - needs replacement' 
          : '❌ No newlines detected'
    };

    // Check length (typical RSA keys are 1500-1700 chars with newlines)
    diagnostics.tests.googlePrivateKey.checks.length = {
      value: privateKey.length,
      pass: privateKey.length > 1000,
      message: privateKey.length > 1000 
        ? '✅ Reasonable length' 
        : '❌ Too short - may be truncated'
    };

    // Try to detect if key is base64-encoded content
    const keyContent = privateKey.replace(/-----BEGIN PRIVATE KEY-----/g, '')
                                 .replace(/-----END PRIVATE KEY-----/g, '')
                                 .replace(/\s/g, '');
    const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(keyContent);
    
    diagnostics.tests.googlePrivateKey.checks.validBase64 = {
      pass: isBase64,
      message: isBase64 
        ? '✅ Content appears to be valid base64' 
        : '⚠️ Content may not be valid base64'
    };

    const allChecks = Object.values(diagnostics.tests.googlePrivateKey.checks);
    const passedChecks = allChecks.filter(c => c.pass).length;
    
    if (passedChecks === allChecks.length) {
      diagnostics.tests.googlePrivateKey.status = 'passed';
      diagnostics.summary.passed++;
    } else if (passedChecks > 0) {
      diagnostics.tests.googlePrivateKey.status = 'warning';
      diagnostics.summary.warnings++;
    } else {
      diagnostics.tests.googlePrivateKey.status = 'failed';
      diagnostics.summary.failed++;
    }
  } else {
    diagnostics.tests.googlePrivateKey.status = 'failed';
    diagnostics.tests.googlePrivateKey.checks.missing = {
      pass: false,
      message: '❌ GOOGLE_PRIVATE_KEY not set'
    };
    diagnostics.summary.failed++;
  }

  // Test 3: Validate email format
  console.log('Test 3: Validating Google Client Email...');
  diagnostics.tests.googleClientEmail = {
    name: 'Google Client Email Format',
    status: 'checking'
  };

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  if (clientEmail) {
    const isValidFormat = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.iam\.gserviceaccount\.com$/.test(clientEmail);
    diagnostics.tests.googleClientEmail.isValidFormat = isValidFormat;
    diagnostics.tests.googleClientEmail.email = clientEmail;
    diagnostics.tests.googleClientEmail.status = isValidFormat ? 'passed' : 'failed';
    
    if (isValidFormat) {
      diagnostics.summary.passed++;
    } else {
      diagnostics.summary.failed++;
      diagnostics.tests.googleClientEmail.issue = 'Email does not match expected service account format';
    }
  } else {
    diagnostics.tests.googleClientEmail.status = 'failed';
    diagnostics.summary.failed++;
  }

  // Test 4: Validate Calendar ID format
  console.log('Test 4: Validating Calendar ID...');
  diagnostics.tests.calendarId = {
    name: 'Google Calendar ID Format',
    status: 'checking'
  };

  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (calendarId) {
    const isValidFormat = calendarId.includes('@group.calendar.google.com') || 
                         calendarId.includes('@gmail.com') ||
                         calendarId === 'primary';
    
    diagnostics.tests.calendarId.id = calendarId;
    diagnostics.tests.calendarId.isValidFormat = isValidFormat;
    diagnostics.tests.calendarId.status = isValidFormat ? 'passed' : 'warning';
    
    if (isValidFormat) {
      diagnostics.summary.passed++;
    } else {
      diagnostics.summary.warnings++;
      diagnostics.tests.calendarId.issue = 'Calendar ID format looks unusual';
    }
  } else {
    diagnostics.tests.calendarId.status = 'failed';
    diagnostics.summary.failed++;
  }

  // Test 5: Try to actually connect to Google Calendar API
  console.log('Test 5: Testing Google Calendar API connection...');
  diagnostics.tests.calendarConnection = {
    name: 'Google Calendar API Connection',
    status: 'checking'
  };

  try {
    const { google } = require('googleapis');
    
    // Prepare the private key
    let processedKey = privateKey;
    if (processedKey && processedKey.includes('\\n')) {
      processedKey = processedKey.replace(/\\n/g, '\n');
      diagnostics.tests.calendarConnection.note = 'Private key required \\n replacement';
    }

    // Try to create auth client
    const auth = new google.auth.JWT(
      clientEmail,
      null,
      processedKey,
      ['https://www.googleapis.com/auth/calendar']
    );

    // Try to get calendar service
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Try to fetch calendar info (this will actually test the connection)
    const calendarInfo = await calendar.calendars.get({
      calendarId: calendarId
    });

    diagnostics.tests.calendarConnection.status = 'passed';
    diagnostics.tests.calendarConnection.calendarName = calendarInfo.data.summary;
    diagnostics.tests.calendarConnection.timeZone = calendarInfo.data.timeZone;
    diagnostics.tests.calendarConnection.message = '✅ Successfully connected to Google Calendar API';
    diagnostics.summary.passed++;

  } catch (error) {
    diagnostics.tests.calendarConnection.status = 'failed';
    diagnostics.tests.calendarConnection.error = error.message;
    diagnostics.tests.calendarConnection.message = '❌ Failed to connect to Google Calendar API';
    
    // Provide specific guidance based on error
    if (error.message.includes('DECODER')) {
      diagnostics.tests.calendarConnection.hint = '💡 Private key format issue - check newlines';
    } else if (error.message.includes('401') || error.message.includes('auth')) {
      diagnostics.tests.calendarConnection.hint = '💡 Authentication failed - check service account permissions';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      diagnostics.tests.calendarConnection.hint = '💡 Calendar not found - check calendar ID and sharing';
    } else if (error.message.includes('403') || error.message.includes('forbidden')) {
      diagnostics.tests.calendarConnection.hint = '💡 Access denied - ensure calendar is shared with service account';
    }
    
    diagnostics.summary.failed++;
  }

  // Test 6: Test Supabase connection
  console.log('Test 6: Testing Supabase connection...');
  diagnostics.tests.supabase = {
    name: 'Supabase Connection',
    status: 'checking'
  };

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Try a simple query
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    diagnostics.tests.supabase.status = 'passed';
    diagnostics.tests.supabase.message = '✅ Successfully connected to Supabase';
    diagnostics.summary.passed++;

  } catch (error) {
    diagnostics.tests.supabase.status = 'failed';
    diagnostics.tests.supabase.error = error.message;
    diagnostics.tests.supabase.message = '❌ Failed to connect to Supabase';
    diagnostics.summary.failed++;
  }

  // Generate overall status
  console.log('✅ Diagnostics complete');
  
  if (diagnostics.summary.failed > 0) {
    diagnostics.status = 'CRITICAL - Action Required';
    diagnostics.message = '❌ Critical issues detected. Fix failed tests before proceeding.';
  } else if (diagnostics.summary.warnings > 0) {
    diagnostics.status = 'WARNING - Review Recommended';
    diagnostics.message = '⚠️ Some issues detected. System may work but review warnings.';
  } else {
    diagnostics.status = 'ALL SYSTEMS GO';
    diagnostics.message = '✅ All tests passed! System is properly configured.';
  }

  // Add helpful instructions
  diagnostics.instructions = {
    ifPrivateKeyFailed: 'In Vercel, ensure your private key is wrapped in double quotes and literal \\n characters are used for newlines. Example: "-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----"',
    ifAuthFailed: 'Ensure your calendar is shared with the service account email with "Make changes to events" permission',
    ifCalendarNotFound: 'Double-check your calendar ID in the calendar settings and ensure it matches GOOGLE_CALENDAR_ID'
  };

  return Response.json(diagnostics, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}