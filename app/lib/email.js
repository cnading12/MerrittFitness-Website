// app/lib/email.js
// UPDATED VERSION - Includes home address in manager notification

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_CONFIG = {
  from: 'Merritt Wellness <bookings@merrittwellness.net>',
  replyTo: 'manager@merrittwellness.net',
  managerEmail: 'manager@merrittwellness.net',
  clientServicesEmail: 'clientservices@merrittwellness.net'
};

// Enhanced email templates
const EMAIL_TEMPLATES = {
  bookingConfirmation: (booking) => ({
    subject: `Booking Confirmed: ${booking.event_name} on ${booking.event_date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Merritt Wellness Historic Sanctuary</p>
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

          ${booking.needs_setup_help || booking.needs_teardown_help ? `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 18px;">🤝 Assistance Services</h3>
            ${booking.needs_setup_help ? '<p style="margin: 5px 0; color: #451a03;">✓ Setup assistance included</p>' : ''}
            ${booking.needs_teardown_help ? '<p style="margin: 5px 0; color: #451a03;">✓ Teardown assistance included</p>' : ''}
          </div>
          ` : ''}

          <!-- Important Reminders -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📋 Important Reminders</h3>
            <ul style="margin: 0; padding-left: 20px; color: #451a03;">
              <li style="margin-bottom: 8px;">Please include setup and cleanup time in your rental period</li>
              <li style="margin-bottom: 8px;">Return the space in the condition you found it</li>
              <li style="margin-bottom: 8px;">Arrive 15 minutes early for access</li>
              <li style="margin-bottom: 8px;">Contact us if you need to make any changes</li>
            </ul>
          </div>

          ${booking.special_requests ? `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">💬 Your Special Requests</h3>
            <p style="margin: 0; color: #451a03;">${booking.special_requests}</p>
          </div>
          ` : ''}

          <!-- Contact Info -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0;">Questions? Contact us:</p>
            <p style="color: #374151; margin: 5px 0;">📞 (720) 357-9499</p>
            <p style="color: #374151; margin: 5px 0;">📧 manager@merrittwellness.net</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
              (Simply reply to this email to reach us directly)
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Booking ID: <strong>${booking.id}</strong><br>
              Historic Merritt Wellness - Where Sacred Architecture Meets Modern Wellness
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
          <p style="color: #1e3a8a; margin: 0;">A new event has been booked at Historic Merritt Wellness!</p>
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

          ${booking.needs_setup_help || booking.needs_teardown_help ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1d5db;">
              <p style="color: #374151; font-weight: 600; margin: 0 0 5px 0;">Assistance Requested:</p>
              ${booking.needs_setup_help ? '<p style="color: #111827; margin: 5px 0; background: white; padding: 10px; border-radius: 4px;">✓ Setup assistance (+$50)</p>' : ''}
              ${booking.needs_teardown_help ? '<p style="color: #111827; margin: 5px 0; background: white; padding: 10px; border-radius: 4px;">✓ Teardown assistance (+$50)</p>' : ''}
            </div>
          ` : ''}

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
              <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 120px;">Name:</td>
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
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Address:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.home_address || 'Not provided'}</td>
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
  }),

  clientOnboarding: (booking) => ({
    subject: `Welcome to Merritt Wellness — Important Info for Your Upcoming Event`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 24px;">Welcome to Merritt Wellness</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Important Information for Your Upcoming Event</p>
          </div>

          <!-- Welcome Message -->
          <div style="margin-bottom: 25px;">
            <p style="color: #374151; line-height: 1.6; margin: 0;">
              Hi ${booking.contact_name},
            </p>
            <p style="color: #374151; line-height: 1.6; margin: 15px 0;">
              Thank you so much for booking your event at Merritt Wellness. We truly appreciate your business and are excited to host you in our space.
            </p>
            <p style="color: #374151; line-height: 1.6; margin: 15px 0;">
              Now that your booking is confirmed and payment and agreements are complete, we want to share a few important details to ensure everything runs smoothly leading up to—and during—your event.
            </p>
          </div>

          <!-- Primary Point of Contact -->
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">Primary Point of Contact</h2>
            <p style="color: #374151; line-height: 1.6; margin: 0 0 10px 0;">
              For all event-related questions, including:
            </p>
            <ul style="margin: 10px 0; padding-left: 20px; color: #374151;">
              <li style="margin-bottom: 5px;">Day-of logistics</li>
              <li style="margin-bottom: 5px;">On-site access or facility questions</li>
              <li style="margin-bottom: 5px;">Scheduling details</li>
              <li style="margin-bottom: 5px;">Setup, breakdown, or general event coordination</li>
            </ul>
            <p style="color: #374151; line-height: 1.6; margin: 15px 0 10px 0;">
              <strong>Please direct all communication to:</strong>
            </p>
            <p style="margin: 0;">
              <a href="mailto:clientservices@merrittwellness.net" style="color: #059669; font-weight: 600; font-size: 16px; text-decoration: none;">clientservices@merrittwellness.net</a>
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
              This inbox is actively monitored by our on-site team and is the fastest way to get support before and during your event.
            </p>
          </div>

          <!-- Manager Email Use -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h2 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Manager Email Use</h2>
            <p style="color: #451a03; line-height: 1.6; margin: 0 0 10px 0;">
              The <strong>manager@merrittwellness.net</strong> email is reserved strictly for:
            </p>
            <ul style="margin: 10px 0; padding-left: 20px; color: #451a03;">
              <li style="margin-bottom: 5px;">Future booking inquiries</li>
              <li style="margin-bottom: 5px;">Additional dates</li>
              <li style="margin-bottom: 5px;">Large-scale or long-term planning questions</li>
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
              Using the correct inbox helps us respond quickly and keeps everything organized for your event.
            </p>
          </div>

          <!-- Lock-Up Instructions -->
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">End-of-Event Lock-Up Instructions</h2>
            <p style="color: #1e3a8a; line-height: 1.6; margin: 0 0 15px 0;">
              To make departure easy, we've created a short walkthrough video showing exactly how to secure the property at the conclusion of your event.
            </p>
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #1e40af;">Lock-Up Video:</strong>
              <a href="https://youtube.com/shorts/CwdDc6LbIjg?si=GQ7XMmqUaJnqMG6H" style="color: #3b82f6; text-decoration: none;">[YouTube Link Here]</a>
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
              We recommend watching this in advance so you feel fully confident when wrapping up.
            </p>
          </div>

          <!-- Closing -->
          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">
              If anything comes up as you prepare, don't hesitate to reach out to
              <a href="mailto:clientservices@merrittwellness.net" style="color: #059669; text-decoration: none;">clientservices@merrittwellness.net</a>
              — we're happy to help.
            </p>
            <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">
              Thank you again for choosing Merritt Wellness. We're grateful to be part of your event and look forward to hosting you.
            </p>
          </div>

          <!-- Signature -->
          <div style="margin-top: 25px;">
            <p style="color: #374151; margin: 0 0 5px 0;">Warm regards,</p>
            <p style="color: #111827; font-weight: 600; margin: 0 0 10px 0;">Merritt Wellness Team</p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <a href="https://MerrittWellness.net" style="color: #059669; text-decoration: none;">MerrittWellness.net</a><br>
              <a href="mailto:clientservices@merrittwellness.net" style="color: #059669; text-decoration: none;">clientservices@merrittwellness.net</a>
            </p>
          </div>
        </div>
      </div>
    `
  })
};

// Email sending functions
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
    console.log('📧 Sending manager notification to:', EMAIL_CONFIG.managerEmail, 'and', EMAIL_CONFIG.clientServicesEmail);

    const template = EMAIL_TEMPLATES.managerNotification(booking);

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [EMAIL_CONFIG.managerEmail, EMAIL_CONFIG.clientServicesEmail],
      replyTo: booking.email,
      ...template
    });

    console.log('✅ Manager notification sent successfully:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send manager notification:', error);
    throw new Error(`Manager notification failed: ${error.message}`);
  }
}

export async function sendClientOnboarding(booking) {
  try {
    console.log('📧 Sending client onboarding email to:', booking.email);

    const template = EMAIL_TEMPLATES.clientOnboarding(booking);

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [booking.email],
      replyTo: EMAIL_CONFIG.clientServicesEmail,
      ...template
    });

    console.log('✅ Client onboarding email sent successfully:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send client onboarding email:', error);
    throw new Error(`Client onboarding email failed: ${error.message}`);
  }
}

export async function sendConfirmationEmails(booking) {
  const emailResults = {
    customerConfirmation: null,
    managerNotification: null,
    clientOnboarding: null,
    success: false,
    errors: []
  };

  try {
    console.log('📧 Sending confirmation emails for booking:', booking.id);

    try {
      emailResults.customerConfirmation = await sendBookingConfirmation(booking);
    } catch (error) {
      emailResults.errors.push(`Customer email failed: ${error.message}`);
    }

    try {
      emailResults.managerNotification = await sendManagerNotification(booking);
    } catch (error) {
      emailResults.errors.push(`Manager email failed: ${error.message}`);
    }

    try {
      emailResults.clientOnboarding = await sendClientOnboarding(booking);
    } catch (error) {
      emailResults.errors.push(`Client onboarding email failed: ${error.message}`);
    }

    if (emailResults.customerConfirmation || emailResults.managerNotification || emailResults.clientOnboarding) {
      emailResults.success = true;
      console.log('✅ Email sending completed with results:', {
        customerSent: !!emailResults.customerConfirmation,
        managerSent: !!emailResults.managerNotification,
        onboardingSent: !!emailResults.clientOnboarding,
        errorCount: emailResults.errors.length
      });
    } else {
      throw new Error('All emails failed to send');
    }

    return emailResults;

  } catch (error) {
    console.error('❌ Email sending process failed:', error);
    emailResults.errors.push(error.message);
    throw new Error(`Email process failed: ${emailResults.errors.join(', ')}`);
  }
}