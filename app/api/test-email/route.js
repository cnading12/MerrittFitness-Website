// app/api/test-email/route.js
// Complete email testing endpoint for your new manager@merrittfitness.net setup

import { sendTestEmail, sendBookingConfirmation, sendManagerNotification } from '../../lib/email.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get('type') || 'simple';
  const recipient = searchParams.get('to') || 'manager@merrittfitness.net';

  console.log('📧 Email test requested:', { testType, recipient });

  try {
    let result;
    let testData = {};

    switch (testType) {
      case 'simple':
        // Simple test email
        result = await sendTestEmail(recipient);
        testData = {
          type: 'Simple Test Email',
          recipient,
          purpose: 'Basic email functionality test'
        };
        break;

      case 'booking-confirmation':
        // Test customer booking confirmation
        const mockBooking = {
          id: 'test-booking-' + Date.now(),
          event_name: 'Test Yoga Class',
          event_type: 'yoga-class',
          event_date: '2024-12-25',
          event_time: '10:00 AM',
          hours_requested: 2,
          contact_name: 'Test Customer',
          email: recipient,
          phone: '(720) 555-0123',
          business_name: 'Test Wellness Studio',
          special_requests: 'This is a test booking confirmation email',
          total_amount: 190,
          payment_method: 'card',
          status: 'confirmed'
        };

        result = await sendBookingConfirmation(mockBooking);
        testData = {
          type: 'Customer Booking Confirmation',
          recipient,
          booking: mockBooking,
          purpose: 'Test customer confirmation email template'
        };
        break;

      case 'manager-notification':
        // Test manager notification
        const mockManagerBooking = {
          id: 'test-booking-' + Date.now(),
          event_name: 'Test Sound Bath Session',
          event_type: 'sound-healing',
          event_date: '2024-12-26',
          event_time: '7:00 PM',
          hours_requested: 1.5,
          contact_name: 'Jane Doe',
          email: 'jane.doe@example.com',
          phone: '(303) 555-9876',
          business_name: 'Healing Sounds LLC',
          special_requests: 'Need extra cushions and blankets for 15 participants',
          total_amount: 142.50,
          payment_method: 'pay-later',
          status: 'confirmed_pay_later'
        };

        result = await sendManagerNotification(mockManagerBooking);
        testData = {
          type: 'Manager Notification',
          recipient: 'manager@merrittfitness.net',
          booking: mockManagerBooking,
          purpose: 'Test manager notification email template'
        };
        break;

      case 'full-flow':
        // Test complete email flow
        const fullFlowBooking = {
          id: 'test-booking-full-' + Date.now(),
          event_name: 'Complete Flow Test Workshop',
          event_type: 'workshop',
          event_date: '2024-12-27',
          event_time: '2:00 PM',
          hours_requested: 3,
          contact_name: 'Flow Test User',
          email: recipient,
          phone: '(720) 555-4444',
          business_name: 'Test Flow Studio',
          special_requests: 'Testing the complete email flow for bookings',
          total_amount: 285,
          payment_method: 'card',
          status: 'confirmed'
        };

        // Send both emails
        const customerResult = await sendBookingConfirmation(fullFlowBooking);
        const managerResult = await sendManagerNotification(fullFlowBooking);

        result = {
          customer: customerResult,
          manager: managerResult
        };

        testData = {
          type: 'Complete Email Flow',
          recipient,
          booking: fullFlowBooking,
          purpose: 'Test both customer confirmation and manager notification',
          results: {
            customerEmailId: customerResult.data?.id,
            managerEmailId: managerResult.data?.id
          }
        };
        break;

      default:
        throw new Error('Invalid test type. Use: simple, booking-confirmation, manager-notification, or full-flow');
    }

    console.log('✅ Email test completed successfully:', testData.type);

    return Response.json({
      success: true,
      message: `${testData.type} sent successfully!`,
      data: {
        ...testData,
        emailId: result.data?.id || 'Multiple emails sent',
        timestamp: new Date().toISOString(),
        emailProvider: 'Resend',
        domain: 'merrittfitness.net'
      }
    });

  } catch (error) {
    console.error('❌ Email test failed:', error);

    return Response.json({
      success: false,
      error: error.message,
      details: {
        testType,
        recipient,
        timestamp: new Date().toISOString(),
        troubleshooting: {
          common_issues: [
            'Check RESEND_API_KEY in environment variables',
            'Verify merrittfitness.net domain is configured in Resend',
            'Ensure recipient email is valid',
            'Check Resend dashboard for delivery status'
          ],
          next_steps: [
            'Visit https://resend.com/domains to verify domain',
            'Check Resend logs for detailed error information',
            'Verify SPF/DKIM records are properly configured'
          ]
        }
      }
    }, { status: 500 });
  }
}

// POST method for testing with custom data
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      type = 'simple',
      recipient = 'manager@merrittfitness.net',
      customData = {}
    } = body;

    console.log('📧 Custom email test requested:', { type, recipient, hasCustomData: !!Object.keys(customData).length });

    let result;
    let responseData = {};

    if (type === 'custom-booking') {
      // Allow testing with custom booking data
      const bookingData = {
        id: 'custom-test-' + Date.now(),
        event_name: customData.eventName || 'Custom Test Event',
        event_type: customData.eventType || 'workshop',
        event_date: customData.eventDate || new Date().toISOString().split('T')[0],
        event_time: customData.eventTime || '10:00 AM',
        hours_requested: customData.hoursRequested || 2,
        contact_name: customData.contactName || 'Test User',
        email: recipient,
        phone: customData.phone || '(720) 555-0000',
        business_name: customData.businessName || '',
        special_requests: customData.specialRequests || 'Custom test booking',
        total_amount: customData.totalAmount || 190,
        payment_method: customData.paymentMethod || 'card',
        status: 'confirmed',
        ...customData
      };

      if (customData.sendTo === 'customer' || customData.sendTo === 'both') {
        result = await sendBookingConfirmation(bookingData);
        responseData.customerEmail = result.data?.id;
      }

      if (customData.sendTo === 'manager' || customData.sendTo === 'both') {
        result = await sendManagerNotification(bookingData);
        responseData.managerEmail = result.data?.id;
      }

      responseData.bookingData = bookingData;
    } else {
      // Fallback to simple test
      result = await sendTestEmail(recipient);
      responseData.emailId = result.data?.id;
    }

    return Response.json({
      success: true,
      message: 'Custom email test completed',
      data: {
        type,
        recipient,
        ...responseData,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Custom email test failed:', error);

    return Response.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}