// app/lib/email.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration - Professional sending, but replies go to your Gmail
const EMAIL_CONFIG = {
  from: 'Merritt Fitness <bookings@merrittfitness.net>',
  replyTo: 'manager@merrittfitness.net',  // CHANGED
  managerEmail: 'manager@merrittfitness.net'  // CHANGED
};

// Updated email templates with correct reply-to
const EMAIL_TEMPLATES = {
  bookingConfirmation: (booking) => ({
    subject: `Booking Confirmed: ${booking.event_name} on ${booking.event_date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Merritt Fitness</p>
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
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Attendees:</td>
                <td style="padding: 8px 0; color: #111827;">${booking.attendees} people</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Location:</td>
                <td style="padding: 8px 0; color: #111827;">Merritt Fitness, Denver, CO</td>
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
            <p style="color: #374151; margin: 5px 0;">📞 (303) 359-8337</p>
            <p style="color: #374151; margin: 5px 0;">📧 merrittfitnessmanager@gmail.com</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
              (Simply reply to this email to reach us directly)
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Booking ID: <strong>${booking.id}</strong><br>
              Historic Merritt Space - Creating Mindful Moments Since 1924
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
          <p style="color: #1e3a8a; margin: 0;">A new event has been booked at Historic Merritt Space!</p>
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
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Attendees:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.attendees} people</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Duration:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.duration || 'Not specified'}</td>
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
              <td style="padding: 8px 0; color:hsl(221, 39.30%, 11.00%);">
                <a href="mailto:${booking.email}" style="color: #059669; text-decoration: none;">${booking.email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Phone:</td>
              <td style="padding: 8px 0; color: #111827;">
                ${booking.phone ? `<a href="tel:${booking.phone}" style="color: #059669; text-decoration: none;">${booking.phone}</a>` : 'Not provided'}
              </td>
            </tr>
          </table>
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0369a1; margin: 0 0 10px 0;">Booking Details:</h3>
          <p style="margin: 5px 0; color: #0c4a6e;"><strong>Booking ID:</strong> <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${booking.id}</code></p>
          <p style="margin: 5px 0; color: #0c4a6e;"><strong>Status:</strong> ${booking.status || 'Pending Payment'}</p>
          <p style="margin: 5px 0; color: #0c4a6e;"><strong>Total Amount:</strong> $${booking.total_amount || 'TBD'}</p>
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

// Email sending functions
export async function sendBookingConfirmation(booking) {
  try {
    const template = EMAIL_TEMPLATES.bookingConfirmation(booking);
    
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [booking.email],
      replyTo: EMAIL_CONFIG.replyTo, // Replies go to your Gmail
      ...template
    });

    console.log('✅ Booking confirmation sent to customer:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send booking confirmation:', error);
    throw error;
  }
}

export async function sendManagerNotification(booking) {
  try {
    const template = EMAIL_TEMPLATES.managerNotification(booking);
    
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [EMAIL_CONFIG.managerEmail], // Your Gmail
      replyTo: booking.email, // Reply goes back to customer
      ...template
    });

    console.log('✅ Manager notification sent:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send manager notification:', error);
    throw error;
  }
}

export async function sendConfirmationEmails(booking) {
  try {
    console.log('📧 Sending confirmation emails...');
    
    // Send confirmation to customer
    await sendBookingConfirmation(booking);
    
    // Send notification to your Gmail
    await sendManagerNotification(booking);
    
    console.log('✅ All emails sent successfully');
  } catch (error) {
    console.error('❌ Failed to send emails:', error);
    throw error;
  }
}

// Test email function
export async function sendTestEmail(recipientEmail = 'colenading@gmail.com') {
  try {
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [recipientEmail],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: '✅ Merritt House Email System Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">🎉 Email System Working!</h1>
          <p>Your professional email setup is complete:</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669;">✅ Configuration:</h3>
            <ul style="color: #047857;">
              <li><strong>Sending from:</strong> bookings@merrittfitness.net</li>
              <li><strong>Replies go to:</strong> merrittfitnessmanager@gmail.com</li>
              <li><strong>Domain verified:</strong> merrittfitness.net</li>
              <li><strong>Templates:</strong> Professional & responsive</li>
            </ul>
          </div>
          
          <p><strong>How it works:</strong></p>
          <ol>
            <li>Customers see professional sending address</li>
            <li>When they reply, it goes to your Gmail</li>
            <li>You manage everything from one inbox</li>
            <li>Best of both worlds! 🚀</li>
          </ol>
          
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #1e40af; margin: 0;">
              <strong>💡 Pro tip:</strong> Reply to this email to test the reply-to functionality!
            </p>
          </div>
        </div>
      `
    });

    console.log('✅ Test email sent:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    throw error;
  }
}