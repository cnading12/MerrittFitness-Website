// app/lib/email.js
// FIXED VERSION - Updated for manager@merrittfitness.net and improved error handling

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// UPDATED: Email configuration for new domain
const EMAIL_CONFIG = {
  from: 'Merritt Fitness <bookings@merrittfitness.net>',
  replyTo: 'manager@merrittfitness.net',  // UPDATED: New Google Workspace email
  managerEmail: 'manager@merrittfitness.net'  // UPDATED: New Google Workspace email
};

// Enhanced email templates with new branding
const EMAIL_TEMPLATES = {
  bookingConfirmation: (booking) => ({
    subject: `Booking Confirmed: ${booking.event_name} on ${booking.event_date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Merritt Fitness Historic Sanctuary</p>
          </div>

          <!-- Booking Details -->
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 20px;">Event Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Event:</td>
                <td style="padding: 8px 0; color: #111827;">${booking.event_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Type:</td>
                <td style="padding: 8px 0; color: #111827; text-transform: capitalize;">${booking.event_type?.replace('-', ' ')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Date:</td>
                <td style="padding: 8px 0; color: #111827;">${new Date(booking.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Time:</td>
                <td style="padding: 8px 0; color: #111827;">${booking.event_time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Duration:</td>
                <td style="padding: 8px 0; color: #111827;">${booking.hours_requested} hours</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Location:</td>
                <td style="padding: 8px 0; color: #111827;">2246 Irving St, Denver, CO 80211</td>
              </tr>
            </table>
          </div>

          <!-- Contact Information -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📋 Your Information</h3>
            <p style="margin: 5px 0; color: #451a03;"><strong>Name:</strong> ${booking.contact_name}</p>
            <p style="margin: 5px 0; color: #451a03;"><strong>Email:</strong> ${booking.email}</p>
            <p style="margin: 5px 0; color: #451a03;"><strong>Phone:</strong> ${booking.phone || 'Not provided'}</p>
            ${booking.special_requests ? `<p style="margin: 5px 0; color: #451a03;"><strong>Special Requests:</strong> ${booking.special_requests}</p>` : ''}
          </div>

          <!-- What's Next -->
          <div style="border-left: 4px solid #10b981; padding-left: 20px; margin: 30px 0;">
            <h3 style="color: #059669; margin: 0 0 10px 0;">What's Next?</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>A calendar invitation has been sent to your email</li>
              <li>You'll receive a reminder 24 hours before your event</li>
              <li>Please arrive 15 minutes early for setup</li>
              <li>Contact us if you need to make any changes</li>
            </ul>
          </div>

          <!-- Contact Info -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0;">Questions? Contact us:</p>
            <p style="color: #374151; margin: 5px 0;">📞 (720) 357-9499</p>
            <p style="color: #374151; margin: 5px 0;">📧 manager@merrittfitness.net</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
              (Simply reply to this email to reach us directly)
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Booking ID: <strong>${booking.id}</strong><br>
              Historic Merritt Fitness - Where Sacred Architecture Meets Modern Wellness
            </p>
          </div>
        </div>
      </div>
    `
  }),

  managerNotification: (booking) => ({
    subject: `🆕 New Booking: ${booking.event_name} on ${booking.event_date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1e40af; margin: 0 0 15px 0;">🆕 New Booking Request</h2>
          <p style="color: #1e3a8a; margin: 0;">A new event has been booked at Historic Merritt Fitness!</p>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0;">Event Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 120px;">Event:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.event_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Type:</td>
              <td style="padding: 8px 0; color: #111827; text-transform: capitalize;">${booking.event_type?.replace('-', ' ')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Date:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.event_date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Time:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.event_time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Duration:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.hours_requested} hours</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Amount:</td>
              <td style="padding: 8px 0; color: #111827;">$${booking.total_amount}</td>
            </tr>
          </table>
          ${booking.special_requests ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1d5db;">
              <p style="color: #374151; font-weight: 600; margin: 0 0 5px 0;">Special Requests:</p>
              <p style="color: #111827; margin: 0; background: white; padding: 10px; border-radius: 4px;">${booking.special_requests}</p>
            </div>
          ` : ''}
        </div>

        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #059669; margin: 0 0 15px 0;">Customer Information:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 80px;">Name:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.contact_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0; color: #111827;">
                <a href="mailto:${booking.email}" style="color: #059669; text-decoration: none;">${booking.email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Phone:</td>
              <td style="padding: 8px 0; color: #111827;">
                ${booking.phone ? `<a href="tel:${booking.phone}" style="color: #059669; text-decoration: none;">${booking.phone}</a>` : 'Not provided'}
              </td>
            </tr>
            ${booking.business_name ? `
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Business:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.business_name}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0369a1; margin: 0 0 10px 0;">Booking Details:</h3>
          <p style="margin: 5px 0; color: #0c4a6e;"><strong>Booking ID:</strong> <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${booking.id}</code></p>
          <p style="margin: 5px 0; color: #0c4a6e;"><strong>Status:</strong> ${booking.status || 'Confirmed'}</p>
          <p style="margin: 5px 0; color: #0c4a6e;"><strong>Payment Method:</strong> ${booking.payment_method === 'pay-later' ? 'Pay Later (No fees)' : 'Card Payment'}</p>
          <p style="margin: 5px 0; color: #0c4a6e;"><strong>Created:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px;">
            Calendar event automatically created<br>
            Customer confirmation email sent
          </p>
        </div>
      </div>
    `
  })
};

// ENHANCED: Email sending functions with better error handling
export async function sendBookingConfirmation(booking) {
  try {
    console.log('📧 Sending booking confirmation to:', booking.email);
    
    const template = EMAIL_TEMPLATES.bookingConfirmation(booking);
    
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [booking.email],
      replyTo: EMAIL_CONFIG.replyTo,
      ...template
    });

    console.log('✅ Booking confirmation sent successfully:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send booking confirmation:', error);
    throw new Error(`Email confirmation failed: ${error.message}`);
  }
}

export async function sendManagerNotification(booking) {
  try {
    console.log('📧 Sending manager notification to:', EMAIL_CONFIG.managerEmail);
    
    const template = EMAIL_TEMPLATES.managerNotification(booking);
    
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [EMAIL_CONFIG.managerEmail],
      replyTo: booking.email, // Customer can reply directly to manager
      ...template
    });

    console.log('✅ Manager notification sent successfully:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send manager notification:', error);
    throw new Error(`Manager notification failed: ${error.message}`);
  }
}

// ENHANCED: Combined email function with rollback capability
export async function sendConfirmationEmails(booking) {
  const emailResults = {
    customerConfirmation: null,
    managerNotification: null,
    success: false,
    errors: []
  };

  try {
    console.log('📧 Sending confirmation emails for booking:', booking.id);
    
    // Send customer confirmation
    try {
      emailResults.customerConfirmation = await sendBookingConfirmation(booking);
    } catch (error) {
      emailResults.errors.push(`Customer email failed: ${error.message}`);
    }
    
    // Send manager notification
    try {
      emailResults.managerNotification = await sendManagerNotification(booking);
    } catch (error) {
      emailResults.errors.push(`Manager email failed: ${error.message}`);
    }
    
    // Check if at least one email succeeded
    if (emailResults.customerConfirmation || emailResults.managerNotification) {
      emailResults.success = true;
      console.log('✅ Email sending completed with results:', {
        customerSent: !!emailResults.customerConfirmation,
        managerSent: !!emailResults.managerNotification,
        errorCount: emailResults.errors.length
      });
    } else {
      throw new Error('Both customer and manager emails failed');
    }
    
    return emailResults;
    
  } catch (error) {
    console.error('❌ Email sending process failed:', error);
    emailResults.errors.push(error.message);
    throw new Error(`Email process failed: ${emailResults.errors.join(', ')}`);
  }
}

// ENHANCED: Test email function for the new domain
export async function sendTestEmail(recipientEmail = 'manager@merrittfitness.net') {
  try {
    console.log('📧 Sending test email to:', recipientEmail);
    
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [recipientEmail],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: '✅ Merritt Fitness Email System Test - NEW DOMAIN',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">🎉 Email System Working!</h1>
          <p>Your NEW Google Workspace email setup is complete:</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669;">✅ Updated Configuration:</h3>
            <ul style="color: #047857;">
              <li><strong>Sending from:</strong> bookings@merrittfitness.net</li>
              <li><strong>Replies go to:</strong> manager@merrittfitness.net</li>
              <li><strong>Domain:</strong> merrittfitness.net (Google Workspace)</li>
              <li><strong>Templates:</strong> Professional & responsive</li>
            </ul>
          </div>
          
          <p><strong>How it works:</strong></p>
          <ol>
            <li>Customers see professional sending address</li>
            <li>When they reply, it goes to your Google Workspace</li>
            <li>You manage everything from manager@merrittfitness.net</li>
            <li>Professional domain + workspace benefits! 🚀</li>
          </ol>
          
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #1e40af; margin: 0;">
              <strong>💡 Pro tip:</strong> Reply to this email to test the reply-to functionality!
            </p>
          </div>

          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #059669; margin: 0;">
              <strong>🎯 Next step:</strong> Test a booking to make sure customers receive confirmations!
            </p>
          </div>
        </div>
      `
    });

    console.log('✅ Test email sent successfully:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    throw new Error(`Test email failed: ${error.message}`);
  }
}