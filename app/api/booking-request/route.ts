import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json();
    
    // Send email to staff
    const { data: staffEmail, error: staffEmailError } = await resend.emails.send({
      from: 'Merritt Fitness <bookings@merritthouse.com>',
      to: 'merrittfitnessmanager@gmail.com',
      subject: `🧘 New Booking Request: ${bookingData.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669, #065f46); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">New Booking Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Merritt Fitness</p>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border-left: 4px solid #059669;">
            <h2 style="color: #1f2937; margin-top: 0;">${bookingData.eventName}</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Event Details</h3>
              <p><strong>Type:</strong> ${bookingData.eventType}</p>
              <p><strong>Date:</strong> ${bookingData.selectedDate}</p>
              <p><strong>Time:</strong> ${bookingData.selectedTime}</p>
              <p><strong>Duration:</strong> ${bookingData.duration || 'Not specified'}</p>
              <p><strong>Expected Attendees:</strong> ${bookingData.attendees || 'Not specified'}</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Contact Information</h3>
              <p><strong>Name:</strong> ${bookingData.contactName}</p>
              <p><strong>Email:</strong> <a href="mailto:${bookingData.email}">${bookingData.email}</a></p>
              <p><strong>Phone:</strong> ${bookingData.phone || 'Not provided'}</p>
            </div>
            
            ${bookingData.specialRequests ? `
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">Special Requests</h3>
                <p>${bookingData.specialRequests}</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #6b7280;">Please review and respond to this booking request promptly.</p>
            </div>
          </div>
        </div>
      `,
    });

    // Send confirmation email to customer
    const customerEmailResponse = await resend.emails.send({
      from: 'Merritt Fitness <bookings@merritthouse.com>',
      to: bookingData.email,
      subject: '🙏 Booking Request Received - Merritt Fitness',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #059669, #065f46); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">Thank You, ${bookingData.contactName}!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your booking request has been received</p>
            </div>
            
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #374151;">We've received your booking request for <strong>${bookingData.eventName}</strong> and will review it shortly.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #059669; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">Your Request Details</h3>
                <p><strong>Event:</strong> ${bookingData.eventName}</p>
                <p><strong>Date:</strong> ${bookingData.selectedDate}</p>
                <p><strong>Time:</strong> ${bookingData.selectedTime}</p>
                <p><strong>Expected Attendees:</strong> ${bookingData.attendees || 'Not specified'}</p>
              </div>
              
              <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #065f46; margin-top: 0;">What happens next?</h3>
                <p style="color: #047857; margin-bottom: 10px;">✓ We'll review your request within 24 hours</p>
                <p style="color: #047857; margin-bottom: 10px;">✓ You'll receive confirmation with pricing details</p>
                <p style="color: #047857; margin-bottom: 0;">✓ Once confirmed, we'll send payment instructions</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280;">Questions? Contact us at <a href="mailto:merrittfitnessmanager@gmail.com" style="color: #059669;">merrittfitnessmanager@gmail.com</a> or (303) 359-8337</p>
                <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                  Merritt Fitness<br>
                  2246 Irving St, Denver, CO 80211
                </p>
              </div>
            </div>
          </div>
        `,
    });
    const customerEmail = customerEmailResponse.data;
    const customerEmailError = customerEmailResponse.error;

    if (staffEmailError || customerEmailError) {
      console.error('Email errors:', { staffEmailError, customerEmailError });
      return NextResponse.json(
        { error: 'Failed to send emails', details: { staffEmailError, customerEmailError } },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Booking request submitted successfully',
      staffEmailId: staffEmail?.id,
      customerEmailId: customerEmail?.id
    });

  } catch (error) {
    console.error('Booking API error:', error);
    return NextResponse.json(
      { error: 'Failed to process booking request', details: error },
      { status: 500 }
    );
  }
}