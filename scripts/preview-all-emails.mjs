// Preview-only script: renders every automated email template to a single
// self-contained HTML file so the new logo branding can be reviewed in a
// browser without dispatching real Resend sends. The live templates point the
// logo at its absolute public URL; for this offline preview we swap that URL
// for an embedded base64 data URI so the logo always renders.

import { readFileSync, writeFileSync } from 'node:fs';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'preview_only';

const { EMAIL_TEMPLATES } = await import('../app/lib/email.js');

// Embed the real navbar logo so the preview displays it without network.
const logoBase64 = readFileSync('public/images/hero/logo.png').toString('base64');
const logoDataUri = `data:image/png;base64,${logoBase64}`;
const LIVE_LOGO_URL = 'https://merrittwellness.net/images/hero/logo.png';

const sampleBooking = {
  id: 'preview_booking_1',
  contact_name: 'Jane Doe',
  event_name: 'Sunset Yoga Workshop',
  event_type: 'wellness-class',
  event_date: '2026-07-18',
  event_time: '6:00 PM',
  hours_requested: 3,
  email: 'jane@example.com',
  phone: '555-555-1212',
  home_address: '123 Maple Ave, Denver, CO 80211',
  business_name: 'Bloom Wellness Co.',
  special_requests: 'Would love access to the side room for a quiet changing area.',
  total_amount: 285,
  subtotal: 285,
  payment_method: 'ach',
  status: 'confirmed',
  created_at: new Date('2026-06-03T10:00:00Z').toISOString(),
  recurring_details: {
    slots: [
      { dayOfWeek: 2, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
      { dayOfWeek: 6, startTime: '9:00 AM', durationHours: 3, frequency: 'biweekly' },
    ],
    hourlyRate: 95,
    monthlyMinCharge: 760,
    monthlyMaxCharge: 1140,
    firstMonthCharge: 570,
    firstBillingDate: '2026-08-01',
    startDate: '2026-07-18',
    paymentMethod: 'ach',
  },
};

const billingArgs = {
  booking: sampleBooking,
  year: 2026,
  month: 7,
  occurrences: [
    { date: '2026-07-07', hours: 2 },
    { date: '2026-07-14', hours: 2 },
    { date: '2026-07-21', hours: 2 },
    { date: '2026-07-28', hours: 2 },
  ],
  totalHours: 8,
  amount: 760,
  hourlyRate: 95,
  chargeDate: '2026-07-01',
  paymentMethod: 'ach',
};

const rollupArgs = {
  year: 2026,
  month: 7,
  durationMs: 4200,
  dryRun: false,
  results: {
    succeeded: [
      { contactName: 'Jane Doe', eventName: 'Sunset Yoga Workshop', occurrenceCount: 4, totalHours: 8, amount: 760, note: '' },
      { contactName: 'Sam Lee', eventName: 'Meditation Circle', occurrenceCount: 2, totalHours: 4, amount: 380, note: '' },
    ],
    skipped: [
      { contactName: 'Pat Kim', eventName: 'Sound Bath', occurrenceCount: 0, note: 'No occurrences this month' },
    ],
    failed: [
      { contactName: 'Alex Roe', eventName: 'Breathwork', note: 'Payment method declined' },
    ],
  },
};

const templates = [
  ['Booking Confirmation (customer)', EMAIL_TEMPLATES.bookingConfirmation(sampleBooking)],
  ['Client Onboarding (customer)', EMAIL_TEMPLATES.clientOnboarding(sampleBooking)],
  ['Manager Notification (staff)', EMAIL_TEMPLATES.managerNotification(sampleBooking)],
  ['Recurring Setup — Client', EMAIL_TEMPLATES.recurringSetupClient(sampleBooking)],
  ['Recurring Setup — Manager (staff)', EMAIL_TEMPLATES.recurringSetupManager(sampleBooking)],
  ['Monthly Billing Invoice (customer)', EMAIL_TEMPLATES.monthlyBillingClient(billingArgs)],
  ['Monthly Billing Roll-Up (staff)', EMAIL_TEMPLATES.monthlyBillingRollup(rollupArgs)],
];

const sections = templates.map(([label, { subject, html }]) => {
  const embedded = html.split(LIVE_LOGO_URL).join(logoDataUri);
  return `
    <section style="margin: 0 auto 48px auto; max-width: 760px;">
      <div style="font-family: Arial, sans-serif; background: #111827; color: #fff; padding: 12px 18px; border-radius: 8px 8px 0 0;">
        <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af;">${label}</div>
        <div style="font-size: 15px; font-weight: 700; margin-top: 4px;">Subject: ${subject}</div>
      </div>
      <div style="border: 1px solid #d1d5db; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;">
        ${embedded}
      </div>
    </section>`;
}).join('\n');

const fullDoc = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Merritt Wellness — Email Branding Preview</title>
  <style>body { margin: 0; background: #e5e7eb; padding: 32px 16px; }</style>
</head>
<body>
  <h1 style="font-family: Arial, sans-serif; text-align: center; color: #111827; max-width: 760px; margin: 0 auto 32px auto;">Automated Email Branding Preview</h1>
  ${sections}
</body>
</html>`;

writeFileSync('email-branding-preview.html', fullDoc);
console.log('Wrote email-branding-preview.html with', templates.length, 'templates');
