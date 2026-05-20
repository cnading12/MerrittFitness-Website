// One-off preview script: renders the client onboarding email template to
// an HTML file so the content can be reviewed in a browser without
// dispatching a real Resend send.

import { writeFileSync } from 'node:fs';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'preview_only';

const { EMAIL_TEMPLATES } = await import('../app/lib/email.js');

const sampleBooking = {
  id: 'preview_booking_1',
  contact_name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-555-1212',
  event_name: 'Yoga Workshop',
  event_date: '2026-05-15',
  event_time: '6:00 PM',
  hours_requested: 2,
};

const { subject, html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);

const fullDoc = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
  <style>body { margin: 0; background: #f3f4f6; }</style>
</head>
<body>
${html}
</body>
</html>`;

writeFileSync('onboarding-email-preview.html', fullDoc);
console.log('Subject:', subject);
console.log('Wrote onboarding-email-preview.html');
