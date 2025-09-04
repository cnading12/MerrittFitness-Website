// app/api/diagnose-resend/route.js
// Complete Resend diagnostic tool to identify delivery issues

import { Resend } from 'resend';

export async function GET(request) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    tests: {},
    recommendations: [],
    status: 'checking'
  };

  try {
    // Test 1: Environment Variables
    console.log('🔍 Checking Resend configuration...');
    
    const apiKey = process.env.RESEND_API_KEY;
    diagnostics.tests.environmentVariables = {
      hasApiKey: !!apiKey,
      keyFormat: apiKey ? (apiKey.startsWith('re_') ? 'valid' : 'invalid') : 'missing',
      keyLength: apiKey ? apiKey.length : 0
    };

    if (!apiKey) {
      diagnostics.recommendations.push('Add RESEND_API_KEY to your environment variables');
      throw new Error('RESEND_API_KEY not found in environment variables');
    }

    if (!apiKey.startsWith('re_')) {
      diagnostics.recommendations.push('RESEND_API_KEY should start with "re_"');
      throw new Error('Invalid Resend API key format');
    }

    // Test 2: Initialize Resend Client
    const resend = new Resend(apiKey);
    diagnostics.tests.clientInitialization = { success: true };

    // Test 3: API Key Validation
    console.log('🔑 Validating API key...');
    try {
      // Try to get domains to validate API key
      const domains = await resend.domains.list();
      diagnostics.tests.apiKeyValidation = {
        success: true,
        domainsFound: domains.data?.length || 0,
        domains: domains.data?.map(d => ({
          name: d.name,
          status: d.status,
          region: d.region
        })) || []
      };

      // Check if merrittfitness.net is configured
      const merrittDomain = domains.data?.find(d => d.name === 'merrittfitness.net');
      diagnostics.tests.domainConfiguration = {
        merrittfitnessNetFound: !!merrittDomain,
        domainStatus: merrittDomain?.status || 'not_found',
        domainDetails: merrittDomain || null
      };

      if (!merrittDomain) {
        diagnostics.recommendations.push('Add merrittfitness.net domain to your Resend account');
      } else if (merrittDomain.status !== 'verified') {
        diagnostics.recommendations.push('Verify merrittfitness.net domain in your Resend dashboard');
      }

    } catch (apiError) {
      diagnostics.tests.apiKeyValidation = {
        success: false,
        error: apiError.message
      };
      diagnostics.recommendations.push('Check your RESEND_API_KEY - it may be invalid or expired');
    }

    // Test 4: Simple Email Send Test
    console.log('📧 Testing email delivery...');
    try {
      const testResult = await resend.emails.send({
        from: 'test@merrittfitness.net',
        to: ['manager@merrittfitness.net'],
        subject: '🔧 Resend Diagnostic Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981;">🔧 Resend Diagnostic Test</h1>
            <p>This is a diagnostic email to test your Resend configuration.</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #059669;">Test Details:</h3>
              <ul>
                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                <li><strong>From:</strong> test@merrittfitness.net</li>
                <li><strong>To:</strong> manager@merrittfitness.net</li>
                <li><strong>API Key:</strong> ${apiKey.substring(0, 10)}...</li>
              </ul>
            </div>
            <p style="color: #059669;"><strong>✅ If you received this email, Resend is working correctly!</strong></p>
            <p style="color: #dc2626;"><strong>❌ If you didn't receive this email, check:</strong></p>
            <ul>
              <li>Spam/Junk folder</li>
              <li>Domain verification in Resend dashboard</li>
              <li>DNS records (SPF, DKIM)</li>
            </ul>
          </div>
        `
      });

      diagnostics.tests.emailDelivery = {
        success: true,
        emailId: testResult.data?.id,
        message: 'Test email sent successfully'
      };

    } catch (emailError) {
      diagnostics.tests.emailDelivery = {
        success: false,
        error: emailError.message,
        errorCode: emailError.code
      };

      // Specific error handling
      if (emailError.message.includes('domain')) {
        diagnostics.recommendations.push('Domain not verified - check your Resend dashboard');
      }
      if (emailError.message.includes('quota')) {
        diagnostics.recommendations.push('You may have exceeded your Resend quota');
      }
      if (emailError.message.includes('suspended')) {
        diagnostics.recommendations.push('Your Resend account may be suspended');
      }
    }

    // Test 5: Check Recent Email Logs
    console.log('📊 Checking recent email logs...');
    try {
      const emails = await resend.emails.list({ limit: 5 });
      diagnostics.tests.recentEmails = {
        success: true,
        count: emails.data?.length || 0,
        recentEmails: emails.data?.map(email => ({
          id: email.id,
          subject: email.subject,
          from: email.from,
          to: email.to,
          created_at: email.created_at,
          last_event: email.last_event
        })) || []
      };
    } catch (logError) {
      diagnostics.tests.recentEmails = {
        success: false,
        error: logError.message
      };
    }

    // Final Status Determination
    const hasWorkingDomain = diagnostics.tests.domainConfiguration?.merrittfitnessNetFound && 
                            diagnostics.tests.domainConfiguration?.domainStatus === 'verified';
    const emailSentSuccessfully = diagnostics.tests.emailDelivery?.success;
    
    if (hasWorkingDomain && emailSentSuccessfully) {
      diagnostics.status = 'healthy';
      diagnostics.recommendations.push('✅ Resend appears to be configured correctly. Check your email inbox (including spam folder).');
    } else if (!hasWorkingDomain) {
      diagnostics.status = 'domain_issue';
      diagnostics.recommendations.push('🔧 Domain configuration issue - this is likely why you\'re not receiving emails');
    } else {
      diagnostics.status = 'delivery_issue';
      diagnostics.recommendations.push('🔧 Email delivery issue detected');
    }

    return Response.json({
      success: true,
      diagnostics,
      nextSteps: {
        immediate: [
          'Check your email inbox and spam folder for the test email',
          'Log into your Resend dashboard at https://resend.com/emails',
          'Verify the merrittfitness.net domain is added and verified'
        ],
        ifNoEmail: [
          'Add merrittfitness.net domain to Resend if not present',
          'Verify domain ownership with DNS records',
          'Check Resend delivery logs for bounces or blocks',
          'Try sending to a different email address for testing'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Resend diagnostic failed:', error);
    
    diagnostics.status = 'error';
    diagnostics.error = error.message;
    
    return Response.json({
      success: false,
      diagnostics,
      error: error.message,
      troubleshooting: {
        commonIssues: [
          'Missing or invalid RESEND_API_KEY',
          'Domain not added to Resend account',
          'Domain not verified (missing DNS records)',
          'Account suspended or quota exceeded'
        ],
        setupSteps: [
          '1. Sign up at https://resend.com',
          '2. Get your API key from the dashboard',
          '3. Add merrittfitness.net domain',
          '4. Verify domain with DNS records',
          '5. Test email delivery'
        ]
      }
    }, { status: 500 });
  }
}

// Test different email scenarios
export async function POST(request) {
  try {
    const { testScenario = 'basic', recipient } = await request.json();
    
    const resend = new Resend(process.env.RESEND_API_KEY);
    const results = [];

    switch (testScenario) {
      case 'different-recipients':
        // Test multiple email addresses
        const testRecipients = [
          recipient || 'manager@merrittfitness.net',
          'test@gmail.com', // Should fail if domain not verified
          'noreply@example.com'
        ];

        for (const testEmail of testRecipients) {
          try {
            const result = await resend.emails.send({
              from: 'test@merrittfitness.net',
              to: [testEmail],
              subject: `Test to ${testEmail}`,
              html: `<p>Testing delivery to ${testEmail}</p>`
            });
            results.push({ recipient: testEmail, success: true, id: result.data?.id });
          } catch (error) {
            results.push({ recipient: testEmail, success: false, error: error.message });
          }
        }
        break;

      case 'different-senders':
        // Test different from addresses
        const fromAddresses = [
          'bookings@merrittfitness.net',
          'noreply@merrittfitness.net',
          'test@merrittfitness.net',
          'hello@merrittfitness.net'
        ];

        for (const fromEmail of fromAddresses) {
          try {
            const result = await resend.emails.send({
              from: fromEmail,
              to: [recipient || 'manager@merrittfitness.net'],
              subject: `Test from ${fromEmail}`,
              html: `<p>Testing from ${fromEmail}</p>`
            });
            results.push({ from: fromEmail, success: true, id: result.data?.id });
          } catch (error) {
            results.push({ from: fromEmail, success: false, error: error.message });
          }
        }
        break;

      default:
        throw new Error('Invalid test scenario');
    }

    return Response.json({
      success: true,
      testScenario,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}