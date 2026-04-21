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

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseRecurringDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

function formatBillingDate(value) {
  if (!value) return 'TBD';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });
}

function describeSlot(slot) {
  const day = DAY_LABELS[Number(slot.dayOfWeek)] || 'Day';
  const freq = slot.frequency === 'weekly' ? 'Every' : slot.frequency === 'biweekly' ? 'Every other' : 'Once a month on';
  return `${freq} ${day} at ${slot.startTime} for ${slot.durationHours} hrs`;
}

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
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">ID Photo:</td>
              <td style="padding: 8px 0; color: #111827;">
                ${booking.id_photo_data
                  ? `Attached to this email (<code>${booking.id_photo_name || 'id-photo'}</code>)`
                  : '<span style="color: #b91c1c;">⚠️ Not provided — contact renter</span>'}
              </td>
            </tr>
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

  recurringSetupClient: (booking) => {
    const details = parseRecurringDetails(booking.recurring_details);
    const slots = details?.slots || [];
    const hourlyRate = details?.hourlyRate || details?.pricing?.hourlyRate || 95;
    const monthlyMin = details?.monthlyMinCharge ?? details?.pricing?.monthlyMinCharge ?? null;
    const monthlyMax = details?.monthlyMaxCharge ?? details?.pricing?.monthlyMaxCharge ?? null;
    const firstMonthCharge = Number(details?.firstMonthCharge ?? booking.subtotal ?? 0);
    const lastMonthCharge = Number(
      details?.lastMonthCharge ?? details?.pricing?.lastMonthCharge ?? 0
    );
    const dueAtSetup = firstMonthCharge + lastMonthCharge;
    const firstBillingDate = formatBillingDate(details?.firstBillingDate);
    const startDate = details?.startDate || booking.event_date;
    const paymentMethod = (details?.paymentMethod || booking.payment_method || 'ach').toUpperCase();

    return {
      subject: `Recurring booking confirmed: ${booking.event_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #059669; margin: 0; font-size: 24px;">Recurring Booking Confirmed</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0;">Merritt Wellness Historic Sanctuary</p>
            </div>

            <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">Hi ${booking.contact_name},</p>
            <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
              Your recurring rental for <strong>${booking.event_name}</strong> is all set. Your payment method is on file and we will auto-charge on the first of each month going forward.
            </p>

            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">Billing Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 55%;">Start date:</td>
                  <td style="padding: 8px 0; color: #111827;">${formatBillingDate(startDate)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">First billing date:</td>
                  <td style="padding: 8px 0; color: #111827;">${firstBillingDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">First-month prorated charge:</td>
                  <td style="padding: 8px 0; color: #111827;">$${firstMonthCharge.toFixed(2)}</td>
                </tr>
                ${lastMonthCharge > 0 ? `
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">Last-month prepaid deposit:</td>
                  <td style="padding: 8px 0; color: #111827;">$${lastMonthCharge.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 700; border-top: 1px solid #d1fae5;">Total due at setup:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 700; border-top: 1px solid #d1fae5;">$${dueAtSetup.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">Base monthly estimate:</td>
                  <td style="padding: 8px 0; color: #111827;">${monthlyMin !== null && monthlyMax !== null ? `$${Number(monthlyMin).toFixed(0)} – $${Number(monthlyMax).toFixed(0)}` : 'Calculated monthly'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">Payment method:</td>
                  <td style="padding: 8px 0; color: #111827;">${paymentMethod === 'ACH' ? 'ACH Auto-Debit (no fee)' : 'Card (3% processing fee)'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">Hourly rate:</td>
                  <td style="padding: 8px 0; color: #111827;">$${Number(hourlyRate).toFixed(0)}/hr</td>
                </tr>
              </table>
            </div>

            ${slots.length ? `
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">Your Recurring Schedule</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.8;">
                ${slots.map(s => `<li>${describeSlot(s)}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Note on Monthly Totals</h3>
              <p style="margin: 0; color: #451a03; line-height: 1.6;">
                Each month's total will vary based on the actual number of occurrences in that month. Weekly slots typically land 4–5 times per month, biweekly slots 2–3 times, and monthly slots once. The base monthly estimate above reflects the expected range.
              </p>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0;">Questions? Reach out any time:</p>
              <p style="color: #374151; margin: 5px 0;">(720) 357-9499</p>
              <p style="color: #374151; margin: 5px 0;">clientservices@merrittwellness.net</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Booking ID: <strong>${booking.id}</strong><br>
                Historic Merritt Wellness — Where Sacred Architecture Meets Modern Wellness
              </p>
            </div>
          </div>
        </div>
      `,
    };
  },

  recurringSetupManager: (booking) => {
    const details = parseRecurringDetails(booking.recurring_details);
    const slots = details?.slots || [];
    const monthlyMin = details?.monthlyMinCharge ?? details?.pricing?.monthlyMinCharge ?? null;
    const monthlyMax = details?.monthlyMaxCharge ?? details?.pricing?.monthlyMaxCharge ?? null;
    const firstMonthCharge = Number(details?.firstMonthCharge ?? booking.subtotal ?? 0);
    const lastMonthCharge = Number(
      details?.lastMonthCharge ?? details?.pricing?.lastMonthCharge ?? 0
    );
    const dueAtSetup = firstMonthCharge + lastMonthCharge;
    const firstBillingDate = formatBillingDate(details?.firstBillingDate);
    const startDate = details?.startDate || booking.event_date;
    const paymentMethod = (details?.paymentMethod || booking.payment_method || 'ach').toUpperCase();

    return {
      subject: `New recurring booking: ${booking.event_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px;">
            <h2 style="color: #1e40af; margin: 0 0 10px 0;">New Recurring Booking</h2>
            <p style="color: #1e3a8a; margin: 0;">A new recurring series is active at Historic Merritt Wellness. Auto-debit is set up and the first invoice will close on ${firstBillingDate}.</p>
          </div>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Series Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600; width: 40%;">Series:</td><td style="padding: 8px 0; color: #111827;">${booking.event_name}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Type:</td><td style="padding: 8px 0; color: #111827; text-transform: capitalize;">${booking.event_type?.replace('-', ' ') || ''}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Start date:</td><td style="padding: 8px 0; color: #111827;">${formatBillingDate(startDate)}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">First billing date:</td><td style="padding: 8px 0; color: #111827;">${firstBillingDate}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">First-month prorated charge:</td><td style="padding: 8px 0; color: #111827;">$${firstMonthCharge.toFixed(2)}</td></tr>
              ${lastMonthCharge > 0 ? `
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Last-month prepaid deposit:</td><td style="padding: 8px 0; color: #111827;">$${lastMonthCharge.toFixed(2)}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 700; border-top: 1px solid #d1d5db;">Total charged at setup:</td><td style="padding: 8px 0; color: #111827; font-weight: 700; border-top: 1px solid #d1d5db;">$${dueAtSetup.toFixed(2)}</td></tr>
              ` : ''}
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Base monthly estimate:</td><td style="padding: 8px 0; color: #111827;">${monthlyMin !== null && monthlyMax !== null ? `$${Number(monthlyMin).toFixed(0)} – $${Number(monthlyMax).toFixed(0)}` : 'Calculated monthly'}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Payment method:</td><td style="padding: 8px 0; color: #111827;">${paymentMethod === 'ACH' ? 'ACH Auto-Debit' : 'Card (3% fee)'}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Expected attendees:</td><td style="padding: 8px 0; color: #111827;">${booking.expected_attendees || 'n/a'}</td></tr>
            </table>
          </div>

          ${slots.length ? `
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0369a1; margin: 0 0 10px 0;">Recurring Slots</h3>
            <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; line-height: 1.8;">
              ${slots.map(s => `<li>${describeSlot(s)}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin: 0 0 15px 0;">Renter Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600; width: 40%;">Name:</td><td style="padding: 8px 0; color: #111827;">${booking.contact_name}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Email:</td><td style="padding: 8px 0; color: #111827;"><a href="mailto:${booking.email}" style="color: #059669; text-decoration: none;">${booking.email}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Phone:</td><td style="padding: 8px 0; color: #111827;">${booking.phone || 'Not provided'}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Address:</td><td style="padding: 8px 0; color: #111827;">${booking.home_address || 'Not provided'}</td></tr>
              ${booking.business_name ? `<tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Business:</td><td style="padding: 8px 0; color: #111827;">${booking.business_name}</td></tr>` : ''}
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">ID Photo:</td><td style="padding: 8px 0; color: #111827;">${booking.id_photo_data ? `Attached (<code>${booking.id_photo_name || 'id-photo'}</code>)` : '<span style="color: #b91c1c;">Not provided — contact renter</span>'}</td></tr>
            </table>
          </div>

          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0369a1; margin: 0 0 10px 0;">Stripe References</h3>
            <p style="margin: 5px 0; color: #0c4a6e;"><strong>Booking ID:</strong> <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${booking.id}</code></p>
            <p style="margin: 5px 0; color: #0c4a6e;"><strong>Subscription:</strong> <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${booking.stripe_subscription_id || 'pending'}</code></p>
            <p style="margin: 5px 0; color: #0c4a6e;"><strong>Customer:</strong> <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${booking.stripe_customer_id || 'pending'}</code></p>
          </div>

          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #451a03; font-size: 14px;">
              Monthly totals will vary based on actual occurrences. The next-PR monthly cron job will write invoice items against this subscription.
            </p>
          </div>
        </div>
      `,
    };
  },

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

          <!-- Facility Onboarding Playlist -->
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Facility Walkthrough &amp; Instructions</h2>
            <p style="color: #1e3a8a; line-height: 1.6; margin: 0 0 15px 0;">
              To help you feel fully prepared, we've put together a short video playlist covering everything you need to know for your event:
            </p>
            <ul style="margin: 0 0 15px 0; padding-left: 20px; color: #1e3a8a; line-height: 1.8;">
              <li>How to unlock and lock the building</li>
              <li>How to use the projector</li>
              <li>How to use the PA system</li>
              <li>How to lock up (shorter video if you only need a quick refresher)</li>
            </ul>
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #1e40af;">Watch the Playlist:</strong>
              <a href="https://www.youtube.com/playlist?list=PLkE5cGIi8Zdjl6Sb3aa7UKqFrYWQN3uiu" style="color: #3b82f6; text-decoration: none;">Merritt Wellness Onboarding Videos</a>
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
              We recommend watching these in advance so you feel fully confident on the day of your event.
            </p>
            <p style="color: #1e3a8a; line-height: 1.6; margin: 15px 0 0 0;">
              <strong>Need your access code?</strong> Please email
              <a href="mailto:clientservices@merrittwellness.net" style="color: #3b82f6; text-decoration: none;">clientservices@merrittwellness.net</a>
              to receive your personal access code before your event.
            </p>
          </div>

          <!-- Wi-Fi Info -->
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">Wi-Fi Access</h2>
            <table style="border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 12px 4px 0; color: #374151; font-weight: 600;">Network:</td>
                <td style="padding: 4px 0; color: #111827;">merrittcowork</td>
              </tr>
              <tr>
                <td style="padding: 4px 12px 4px 0; color: #374151; font-weight: 600;">Password:</td>
                <td style="padding: 4px 0; color: #111827;">Merritt23X</td>
              </tr>
            </table>
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
  }),

  // Sent to the renter immediately after the monthly invoicer writes the
  // upcoming-month invoice item. Tells them what will be billed, when it
  // will be charged, and against which payment method.
  monthlyBillingClient: ({ booking, year, month, occurrences, totalHours, amount, hourlyRate, chargeDate, paymentMethod, summaryText }) => {
    const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const chargeLabel = formatBillingDate(chargeDate);
    const paymentLabel = paymentMethod === 'ach'
      ? 'ACH Auto-Debit (bank transfer, no processing fee)'
      : 'Card on file (3% processing fee)';

    const rowsHtml = occurrences.map((occ) => {
      const dow = new Date(Date.UTC(
        Number(occ.date.slice(0, 4)),
        Number(occ.date.slice(5, 7)) - 1,
        Number(occ.date.slice(8, 10))
      )).getUTCDay();
      const dayName = DAY_LABELS[dow] || '';
      const pretty = new Date(occ.date + 'T00:00:00Z').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC'
      });
      return `<tr>
        <td style="padding: 6px 12px 6px 0; color: #111827;">${pretty}</td>
        <td style="padding: 6px 0; color: #374151; text-align: right;">${occ.hours} hrs</td>
      </tr>`;
    }).join('');

    return {
      subject: `Your ${monthLabel} invoice — ${booking.event_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #059669; margin: 0; font-size: 24px;">${monthLabel} Invoice Ready</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0;">Merritt Wellness Historic Sanctuary</p>
            </div>

            <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">Hi ${booking.contact_name},</p>
            <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
              Here is your upcoming ${monthLabel} invoice for <strong>${booking.event_name}</strong>. The charge below will appear on your ${paymentMethod === 'ach' ? 'bank' : 'card'} statement shortly after the billing date.
            </p>

            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">Invoice Summary</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600; width: 55%;">Billing period:</td>
                  <td style="padding: 6px 0; color: #111827;">${monthLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600;">Total hours:</td>
                  <td style="padding: 6px 0; color: #111827;">${totalHours} hrs</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600;">Hourly rate:</td>
                  <td style="padding: 6px 0; color: #111827;">$${Number(hourlyRate).toFixed(0)}/hr</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600;">Amount due:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600;">$${Number(amount).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600;">Payment method:</td>
                  <td style="padding: 6px 0; color: #111827;">${paymentLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600;">Charge date:</td>
                  <td style="padding: 6px 0; color: #111827;">${chargeLabel}</td>
                </tr>
              </table>
            </div>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">Scheduled Dates</h3>
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">${summaryText || ''}</p>
              <table style="width: 100%; border-collapse: collapse;">
                ${rowsHtml || '<tr><td style="padding: 6px 0; color: #6b7280;">No scheduled dates in this month.</td></tr>'}
              </table>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #451a03; line-height: 1.6; font-size: 14px;">
                Need to adjust your schedule, add a date, or cancel? Reply to this email or reach us at clientservices@merrittwellness.net. Changes made before the charge date can be applied to this invoice.
              </p>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0;">Questions? Reach out any time:</p>
              <p style="color: #374151; margin: 5px 0;">(720) 357-9499</p>
              <p style="color: #374151; margin: 5px 0;">clientservices@merrittwellness.net</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Booking ID: <strong>${booking.id}</strong><br>
                Historic Merritt Wellness — Where Sacred Architecture Meets Modern Wellness
              </p>
            </div>
          </div>
        </div>
      `,
    };
  },

  // End-of-run roll-up for the ops team. One table row per booking the cron
  // touched, separated into Succeeded / Skipped / Failed sections so failures
  // are impossible to miss.
  monthlyBillingRollup: ({ year, month, results, durationMs, dryRun }) => {
    const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    const money = (n) => `$${Number(n || 0).toFixed(2)}`;

    const renderRow = (r) => `<tr>
      <td style="padding: 8px 12px 8px 0; color: #111827; border-bottom: 1px solid #e5e7eb;">${r.contactName || ''}<br><span style="color: #6b7280; font-size: 12px;">${r.eventName || ''}</span></td>
      <td style="padding: 8px 12px 8px 0; color: #374151; border-bottom: 1px solid #e5e7eb;">${r.occurrenceCount != null ? r.occurrenceCount : '—'}</td>
      <td style="padding: 8px 12px 8px 0; color: #374151; border-bottom: 1px solid #e5e7eb;">${r.totalHours != null ? `${r.totalHours} hrs` : '—'}</td>
      <td style="padding: 8px 12px 8px 0; color: #111827; border-bottom: 1px solid #e5e7eb;">${r.amount != null ? money(r.amount) : '—'}</td>
      <td style="padding: 8px 0; color: #6b7280; font-size: 12px; border-bottom: 1px solid #e5e7eb;">${r.note || ''}</td>
    </tr>`;

    const tableHead = `<thead><tr>
      <th style="text-align: left; padding: 8px 12px 8px 0; color: #374151; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #d1d5db;">Client / Series</th>
      <th style="text-align: left; padding: 8px 12px 8px 0; color: #374151; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #d1d5db;">Occurrences</th>
      <th style="text-align: left; padding: 8px 12px 8px 0; color: #374151; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #d1d5db;">Hours</th>
      <th style="text-align: left; padding: 8px 12px 8px 0; color: #374151; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #d1d5db;">Amount</th>
      <th style="text-align: left; padding: 8px 0; color: #374151; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #d1d5db;">Note</th>
    </tr></thead>`;

    const succeededTotal = results.succeeded.reduce((s, r) => s + Number(r.amount || 0), 0);

    const section = (title, rows, color) => {
      if (!rows || rows.length === 0) return '';
      return `<div style="margin: 20px 0;">
        <h2 style="color: ${color}; margin: 0 0 10px 0; font-size: 18px;">${title} (${rows.length})</h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${tableHead}
          <tbody>${rows.map(renderRow).join('')}</tbody>
        </table>
      </div>`;
    };

    const headerBanner = dryRun
      ? `<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
           <strong style="color: #92400e;">DRY RUN</strong>
           <span style="color: #451a03;"> — No Stripe invoice items were created and no client emails were sent.</span>
         </div>`
      : '';

    return {
      subject: `Monthly recurring billing — ${monthLabel}${dryRun ? ' (dry run)' : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #111827; margin: 0 0 5px 0; font-size: 22px;">Monthly Recurring Billing Roll-Up</h1>
            <p style="color: #6b7280; margin: 0 0 20px 0;">Billing period: <strong>${monthLabel}</strong></p>

            ${headerBanner}

            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 16px 4px 0; color: #374151; font-weight: 600;">Succeeded:</td>
                  <td style="padding: 4px 0; color: #059669; font-weight: 600;">${results.succeeded.length}</td>
                  <td style="padding: 4px 16px 4px 24px; color: #374151; font-weight: 600;">Skipped:</td>
                  <td style="padding: 4px 0; color: #d97706; font-weight: 600;">${results.skipped.length}</td>
                  <td style="padding: 4px 16px 4px 24px; color: #374151; font-weight: 600;">Failed:</td>
                  <td style="padding: 4px 0; color: #b91c1c; font-weight: 600;">${results.failed.length}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 16px 4px 0; color: #374151; font-weight: 600;">Total billed:</td>
                  <td style="padding: 4px 0; color: #111827; font-weight: 600;" colspan="5">${money(succeededTotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 16px 4px 0; color: #374151; font-weight: 600;">Duration:</td>
                  <td style="padding: 4px 0; color: #111827;" colspan="5">${durationMs} ms</td>
                </tr>
              </table>
            </div>

            ${section('Succeeded', results.succeeded, '#059669')}
            ${section('Skipped (idempotent — already billed this month)', results.skipped, '#d97706')}
            ${section('Failed', results.failed, '#b91c1c')}

            ${results.failed.length > 0 ? `
            <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin-top: 20px;">
              <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">Failure Details</h3>
              ${results.failed.map(r => `<p style="margin: 6px 0; color: #7f1d1d; font-size: 13px;"><strong>${r.eventName || r.bookingId}:</strong> ${r.error || 'Unknown error'}</p>`).join('')}
            </div>
            ` : ''}

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Generated by the monthly-recurring-billing cron. A full row is stored in <code>cron_runs</code> for audit.
              </p>
            </div>
          </div>
        </div>
      `,
    };
  }
};

// Delay helper to avoid Resend free-plan rate limits (2 requests/second)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Read the two ops addresses from env at call time (not at module load) so
// the sender behaves correctly under env-var changes in hot-reloaded dev
// environments. Returns { manager, clientServices, addrs } where `addrs` is
// a filtered array suitable for Resend's `to` or `bcc`.
function getOpsEmails() {
  const manager = (process.env.OPS_EMAIL_MANAGER || '').trim() || null;
  const clientServices = (process.env.OPS_EMAIL_CLIENT_SERVICES || '').trim() || null;
  const addrs = [manager, clientServices].filter(Boolean);
  return { manager, clientServices, addrs };
}

// Extract the raw base64 payload from a "data:<mime>;base64,<content>" URL.
// Returns null if the input isn't a valid data URL so the email still sends.
function extractBase64FromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const commaIndex = dataUrl.indexOf('base64,');
  if (commaIndex === -1) return null;
  return dataUrl.slice(commaIndex + 'base64,'.length);
}

// Build a Resend attachment object from the ID photo columns on a booking row,
// or null if no photo is present. Resend accepts a `content` base64 string.
function buildIdPhotoAttachment(booking) {
  const base64 = extractBase64FromDataUrl(booking?.id_photo_data);
  if (!base64) return null;

  // Derive a filename with the correct extension when the stored name lacks one.
  const mime = booking.id_photo_type || 'image/jpeg';
  const ext = mime.split('/')[1]?.split('+')[0] || 'jpg';
  const rawName = (booking.id_photo_name || `id-photo-${booking.id}`).trim();
  const filename = /\.[a-z0-9]+$/i.test(rawName) ? rawName : `${rawName}.${ext}`;

  return {
    filename,
    content: base64,
    contentType: mime
  };
}

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
    const idPhotoAttachment = buildIdPhotoAttachment(booking);

    const payload = {
      from: EMAIL_CONFIG.from,
      to: [EMAIL_CONFIG.managerEmail, EMAIL_CONFIG.clientServicesEmail],
      replyTo: booking.email,
      ...template
    };

    if (idPhotoAttachment) {
      payload.attachments = [idPhotoAttachment];
      console.log('📎 Attaching renter ID photo:', idPhotoAttachment.filename);
    } else {
      console.warn('⚠️ No ID photo found on booking', booking.id, '- manager email will flag it as missing.');
    }

    const result = await resend.emails.send(payload);

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

export async function sendRecurringSetupClient(booking) {
  try {
    console.log('📧 Sending recurring setup confirmation to:', booking.email);
    const template = EMAIL_TEMPLATES.recurringSetupClient(booking);

    // Silently copy ops on every client-facing recurring billing email so
    // staff see what the client sees without reaching back to the renter.
    const ops = getOpsEmails();
    if (ops.addrs.length === 0) {
      console.warn('⚠️ OPS_EMAIL_MANAGER and OPS_EMAIL_CLIENT_SERVICES both missing — sending recurring setup client email without BCC');
    } else if (ops.addrs.length === 1) {
      console.warn(`⚠️ Only one ops email configured — BCCing ${ops.addrs[0]} only on recurring setup client email`);
    }

    const payload = {
      from: EMAIL_CONFIG.from,
      to: [booking.email],
      replyTo: EMAIL_CONFIG.clientServicesEmail,
      ...template
    };
    if (ops.addrs.length > 0) payload.bcc = ops.addrs;

    const result = await resend.emails.send(payload);
    console.log('✅ Recurring setup client email sent:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send recurring setup client email:', error);
    throw new Error(`Recurring setup client email failed: ${error.message}`);
  }
}

export async function sendRecurringSetupManager(booking) {
  try {
    console.log('📧 Sending recurring setup manager notification');
    const template = EMAIL_TEMPLATES.recurringSetupManager(booking);
    const idPhotoAttachment = buildIdPhotoAttachment(booking);
    const payload = {
      from: EMAIL_CONFIG.from,
      to: [EMAIL_CONFIG.managerEmail, EMAIL_CONFIG.clientServicesEmail],
      replyTo: booking.email,
      ...template
    };
    if (idPhotoAttachment) {
      payload.attachments = [idPhotoAttachment];
    }
    const result = await resend.emails.send(payload);
    console.log('✅ Recurring setup manager email sent:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send recurring setup manager email:', error);
    throw new Error(`Recurring setup manager email failed: ${error.message}`);
  }
}

export async function sendRecurringSetupEmails(booking) {
  const results = { clientEmail: null, managerEmail: null, errors: [] };
  try {
    results.clientEmail = await sendRecurringSetupClient(booking);
  } catch (error) {
    results.errors.push(`Client email failed: ${error.message}`);
  }
  await delay(1000);
  try {
    results.managerEmail = await sendRecurringSetupManager(booking);
  } catch (error) {
    results.errors.push(`Manager email failed: ${error.message}`);
  }
  if (!results.clientEmail && !results.managerEmail) {
    throw new Error(results.errors.join(', ') || 'Both recurring setup emails failed');
  }
  return results;
}

// Sent to the renter immediately after the monthly cron creates an invoice
// item for their upcoming month. Args match the cron's per-booking result
// shape so the route just forwards its plan object.
export async function sendMonthlyBillingClientEmail(args) {
  const { booking } = args;
  try {
    console.log('📧 Sending monthly billing client email to:', booking.email);
    const template = EMAIL_TEMPLATES.monthlyBillingClient(args);

    // Silently copy ops on every client-facing monthly billing email so
    // staff see the exact invoice the client received.
    const ops = getOpsEmails();
    if (ops.addrs.length === 0) {
      console.warn('⚠️ OPS_EMAIL_MANAGER and OPS_EMAIL_CLIENT_SERVICES both missing — sending client billing email without BCC');
    } else if (ops.addrs.length === 1) {
      console.warn(`⚠️ Only one ops email configured — BCCing ${ops.addrs[0]} only on client billing email`);
    }

    const payload = {
      from: EMAIL_CONFIG.from,
      to: [booking.email],
      replyTo: EMAIL_CONFIG.clientServicesEmail,
      ...template
    };
    if (ops.addrs.length > 0) payload.bcc = ops.addrs;

    const result = await resend.emails.send(payload);
    console.log('✅ Monthly billing client email sent:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send monthly billing client email:', error);
    throw new Error(`Monthly billing client email failed: ${error.message}`);
  }
}

// Sent to ops once at the end of each monthly-billing cron run. Bundles the
// whole run into a single email (table with succeeded / skipped / failed).
// Recipients come from the two ops env vars. Both addresses are passed in a
// single Resend `to: [...]` so it arrives as one thread in both inboxes.
export async function sendMonthlyBillingRollupEmail(args) {
  try {
    const ops = getOpsEmails();
    if (ops.addrs.length === 0) {
      console.error('❌ OPS_EMAIL_MANAGER and OPS_EMAIL_CLIENT_SERVICES both missing — skipping monthly billing rollup send');
      return { skipped: true, reason: 'Both ops email env vars missing' };
    }
    if (ops.addrs.length === 1) {
      console.warn(`⚠️ Only one ops email configured — sending rollup to ${ops.addrs[0]} only`);
    }

    console.log('📧 Sending monthly billing rollup to:', ops.addrs.join(', '));
    const template = EMAIL_TEMPLATES.monthlyBillingRollup(args);
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: ops.addrs,
      ...template
    });
    console.log('✅ Monthly billing rollup sent:', result.data?.id);
    return result;
  } catch (error) {
    // The rollup email is informational — don't let a send failure fail the
    // whole cron run. Log loudly and keep going.
    console.error('❌ Failed to send monthly billing rollup email:', error);
    return { error: error.message };
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

    // Delay to avoid Resend rate limit (2 requests/second on free plan)
    await delay(1000);

    try {
      emailResults.managerNotification = await sendManagerNotification(booking);
    } catch (error) {
      emailResults.errors.push(`Manager email failed: ${error.message}`);
    }

    // Delay to avoid Resend rate limit (2 requests/second on free plan)
    await delay(1000);

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