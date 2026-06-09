// Tests for the client-onboarding email sent after a successful booking.
//
// Two layers of coverage:
//   1. Template-level: the rendered HTML contains the up-to-date contact
//      info, phone numbers, and HVAC walkthrough bullet.
//   2. Dispatch-level: sendConfirmationEmails() — the function the Stripe
//      webhook calls after a paid booking — actually invokes the onboarding
//      send. We intercept Resend at the SDK class level so no real emails
//      are dispatched.
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

// Resend throws if RESEND_API_KEY is missing at construction time.
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';

// Replace the `resend` package with a stub BEFORE importing email.js so the
// `resend` instance the module creates routes every send through our
// recorder. ES module namespaces are read-only, so we use node:test's
// experimental mock.module API rather than mutating the real module.
const sentEmails = [];
class MockResend {
  constructor() {
    this.emails = {
      send: async (payload) => {
        sentEmails.push(payload);
        return { data: { id: `mock_${sentEmails.length}` }, error: null };
      },
    };
  }
}
mock.module('resend', { namedExports: { Resend: MockResend } });

const { EMAIL_TEMPLATES, sendConfirmationEmails, sendClientOnboarding } =
  await import('../app/lib/email.js');

const sampleBooking = {
  id: 'booking_test_1',
  contact_name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-555-1212',
  event_name: 'Yoga Workshop',
  event_date: '2026-05-15',
  start_time: '6:00 PM',
  end_time: '8:00 PM',
  total_amount: 250,
  attendees: 20,
};

test('clientOnboarding template: subject is welcome message', () => {
  const { subject } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.match(subject, /Welcome to Merritt Wellness/i);
});

test('clientOnboarding template: greets the contact by name', () => {
  const { html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.ok(html.includes('Hi Jane Doe'), 'expected greeting with contact_name');
});

test('clientOnboarding template: includes client services phone 720-357-9499', () => {
  const { html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.ok(html.includes('720-357-9499'), 'expected client services phone number');
  assert.ok(
    html.includes('clientservices@merrittwellness.net'),
    'expected client services email'
  );
});

test('clientOnboarding template: includes manager phone 720-357-9499', () => {
  const { html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.ok(html.includes('720-357-9499'), 'expected manager phone number');
  assert.ok(
    html.includes('manager@merrittwellness.net'),
    'expected manager email'
  );
});

test('clientOnboarding template: lists heating and air conditioning video', () => {
  const { html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.match(
    html,
    /heating and air conditioning/i,
    'expected HVAC bullet in the facility walkthrough list'
  );
});

test('clientOnboarding template: lists surround sound & wireless mics video', () => {
  const { html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.match(
    html,
    /Surround Sound Audio System (?:&amp;|&) Wireless Microphones/i,
    'expected surround sound & wireless mics bullet in the facility walkthrough list'
  );
});

test('clientOnboarding template: links to the YouTube playlist', () => {
  const { html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.ok(
    html.includes('youtube.com/playlist?list=PLkE5cGIi8Zdjl6Sb3aa7UKqFrYWQN3uiu'),
    'expected onboarding playlist URL'
  );
});

test('clientOnboarding template: includes Wi-Fi credentials', () => {
  const { html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.ok(html.includes('merrittcowork'), 'expected Wi-Fi network name');
  assert.ok(html.includes('Merritt23X'), 'expected Wi-Fi password');
});

test('clientOnboarding template: makes clear renters must watch the onboarding videos beforehand', () => {
  const { html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.match(
    html,
    /must.{0,40}watch the onboarding/i,
    'expected explicit "must watch the onboarding videos" language'
  );
  assert.match(
    html,
    /before your event/i,
    'expected language emphasizing watching before the event'
  );
});

test('clientOnboarding template: warns about charges/fines for arriving early or staying late', () => {
  const { html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.match(
    html,
    /charged or fined/i,
    'expected "charged or fined" language for overstaying'
  );
  assert.match(
    html,
    /no showing up early/i,
    'expected explicit "no showing up early" policy'
  );
  assert.match(
    html,
    /(staying late|no.{0,10}stay)/i,
    'expected explicit no-late-stay policy'
  );
});

test('clientOnboarding template: emphasizes the lock-up video and $50 fine', () => {
  const { html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.match(
    html,
    /lock.?up/i,
    'expected lock-up language'
  );
  assert.match(
    html,
    /most important/i,
    'expected the lock-up video to be flagged as the most important'
  );
  assert.match(
    html,
    /\$50/,
    'expected the $50 fine amount to be stated'
  );
});

test("clientOnboarding template: makes clear fines are at Merritt Wellness's discretion", () => {
  const { html } = EMAIL_TEMPLATES.clientOnboarding(sampleBooking);
  assert.match(
    html,
    /discretion/i,
    'expected explicit language that fines are at our discretion'
  );
});

test('sendClientOnboarding: dispatches via Resend with correct recipient and subject', async () => {
  sentEmails.length = 0;
  const result = await sendClientOnboarding(sampleBooking);

  assert.equal(sentEmails.length, 1, 'expected exactly one Resend send call');
  const payload = sentEmails[0];
  assert.deepEqual(payload.to, ['jane@example.com']);
  assert.match(payload.subject, /Welcome to Merritt Wellness/i);
  assert.equal(payload.replyTo, 'clientservices@merrittwellness.net');
  assert.ok(result?.data?.id, 'expected Resend success response');
});

test('sendConfirmationEmails: includes the onboarding email in the booking flow', async () => {
  sentEmails.length = 0;
  const result = await sendConfirmationEmails(sampleBooking);

  // Three emails fire on a successful booking: customer confirmation,
  // manager notification, and the client onboarding email.
  const subjects = sentEmails.map((e) => e.subject);
  assert.equal(sentEmails.length, 3, `expected 3 sends, got ${subjects.length}: ${subjects.join(' | ')}`);

  const onboardingSent = subjects.some((s) => /Welcome to Merritt Wellness/i.test(s));
  assert.ok(onboardingSent, 'expected the onboarding email to be sent');

  assert.ok(result.success, 'sendConfirmationEmails should report success');
  assert.ok(result.clientOnboarding, 'clientOnboarding result should be populated');
  assert.deepEqual(result.errors, [], 'no errors expected on the happy path');
});

test('sendConfirmationEmails: spaces sends out to stay under Resend rate limit', async () => {
  // Resend's free plan caps at 2 requests/second. We send 3 emails per
  // booking, so the flow must insert ~1s pauses between sends. Record the
  // wall-clock timestamp of each Resend invocation and assert the gaps are
  // present — without this, bursts of bookings would hit a 429.
  sentEmails.length = 0;
  const sendTimestamps = [];
  const realNow = Date.now.bind(Date);

  // Re-stub Resend's send to capture the time of each call. The MockResend
  // class is already what `email.js` is using; we attach a timestamp recorder
  // by patching the array push.
  const origPush = sentEmails.push.bind(sentEmails);
  sentEmails.push = (...args) => {
    sendTimestamps.push(realNow());
    return origPush(...args);
  };

  try {
    await sendConfirmationEmails(sampleBooking);
  } finally {
    sentEmails.push = origPush;
  }

  assert.equal(sendTimestamps.length, 3, 'expected three timed sends');
  const gap1 = sendTimestamps[1] - sendTimestamps[0];
  const gap2 = sendTimestamps[2] - sendTimestamps[1];

  // Allow a small clock-jitter tolerance below the nominal 1000ms delay.
  assert.ok(
    gap1 >= 900,
    `expected ≥900ms between customer and manager sends, got ${gap1}ms`
  );
  assert.ok(
    gap2 >= 900,
    `expected ≥900ms between manager and onboarding sends, got ${gap2}ms`
  );
});
