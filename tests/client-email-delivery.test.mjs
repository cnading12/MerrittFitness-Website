// Guards against the "client only got email #1" incident.
//
// What happened: the Stripe webhook (and the sponsored-booking route) exported
// no maxDuration, so Vercel's default ~10s function timeout killed the handler
// mid-email-pipeline. The customer confirmation (sent first) went out; the
// onboarding and public-marketing emails (sent last, spaced ~1s apart for
// Resend's 2 req/sec cap) were silently never sent. The Resend delays were
// compliant with the rate limit — they were simply eating the function's
// timeout budget.
//
// This file locks in the fixes:
//   1. Every route that sends email exports maxDuration.
//   2. Client-facing emails are sent BEFORE the staff notification, so a
//      cut-short function can never again cost the client their emails.
//   3. Recurring renters receive the onboarding email too.
//   4. Staff receive ONLY their booking notification — no BCC copies of
//      client-facing emails.
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_dummy';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon_test';
process.env.GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'cal_test@group.calendar.google.com';
process.env.GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || 'test@example.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ||
  '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----';
// Set explicit ops addresses so the no-BCC assertions are meaningful — with
// these present, the old code WOULD have BCC'd them on client emails.
process.env.OPS_EMAIL_MANAGER = process.env.OPS_EMAIL_MANAGER || 'boss@example.com';
process.env.OPS_EMAIL_CLIENT_SERVICES = process.env.OPS_EMAIL_CLIENT_SERVICES || 'desk@example.com';

// ---------- Mocks (registered BEFORE importing app modules) ----------
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

mock.module('@supabase/supabase-js', {
  namedExports: {
    createClient: () => ({
      from: () => {
        const builder = {
          select: () => builder,
          insert: () => builder,
          update: () => builder,
          eq: () => builder,
          neq: () => builder,
          in: () => builder,
          order: () => builder,
          limit: () => builder,
          single: () => Promise.resolve({ data: null, error: null }),
          then: (resolve) => resolve({ data: [], error: null }),
        };
        return builder;
      },
    }),
  },
});

mock.module('googleapis', {
  namedExports: {
    google: {
      auth: {
        GoogleAuth: class {
          constructor() {}
          async getClient() { return {}; }
        },
      },
      calendar: () => ({
        events: {
          insert: async ({ resource }) => ({
            data: { id: 'cal_event_1', start: resource.start, end: resource.end },
          }),
        },
      }),
    },
  },
});

class MockStripe {
  constructor() {
    this.webhooks = { constructEvent: (body) => JSON.parse(body) };
    this.prices = { list: async () => ({ data: [] }) };
    this.products = { create: async () => ({ id: 'prod_test' }) };
  }
}
mock.module('stripe', { defaultExport: MockStripe });

const { sendBookingEmails } = await import('../app/lib/booking-fulfillment.js');
const {
  sendRecurringSetupEmails,
  sendPublicEventMarketing,
  sendRecurringSetupClient,
} = await import('../app/lib/email.js');

const CLIENT_EMAIL = 'jane@example.com';
const sampleBooking = {
  id: 'booking_delivery_1',
  contact_name: 'Jane Doe',
  email: CLIENT_EMAIL,
  phone: '555-555-1212',
  event_name: 'Yoga Workshop',
  event_type: 'workshop',
  event_date: '2026-05-15',
  event_time: '6:00 PM',
  hours_requested: 2,
  total_amount: 250,
  attendees: 20,
  is_public: true,
};

function isClientFacing(payload) {
  return Array.isArray(payload.to) && payload.to.includes(CLIENT_EMAIL);
}

// ---------- 1. Client emails first, staff notification last ----------

test('sendBookingEmails: every client-facing email is sent before the staff notification', async () => {
  sentEmails.length = 0;
  const errors = await sendBookingEmails(sampleBooking, {
    sendOnboarding: true,
    sendPublicMarketing: true,
  });

  assert.deepEqual(errors, [], 'no send errors expected');
  const subjects = sentEmails.map((e) => e.subject);
  assert.equal(sentEmails.length, 4, `expected 4 sends, got: ${subjects.join(' | ')}`);

  // Confirmation, onboarding, and marketing all go to the client — and they
  // must ALL precede the staff notification so a cut-short function never
  // costs the client an email again.
  const staffIndex = sentEmails.findIndex((e) => !isClientFacing(e));
  assert.equal(staffIndex, sentEmails.length - 1,
    `staff notification must be last, but send #${staffIndex + 1} of ${sentEmails.length} was staff-facing: ${subjects.join(' | ')}`);

  assert.match(subjects[0], /Booking Confirmed/i, 'confirmation first');
  assert.match(subjects[1], /Welcome to Merritt Wellness/i, 'onboarding second');
  assert.match(subjects[2], /promote/i, 'public marketing third');
  assert.match(subjects[3], /New Booking/i, 'staff notification last');
});

// ---------- 2. Recurring renters get onboarding too ----------

test('sendRecurringSetupEmails: includes the client onboarding email', async () => {
  sentEmails.length = 0;
  const results = await sendRecurringSetupEmails({
    ...sampleBooking,
    is_public: false,
    recurring_details: null,
  });

  const subjects = sentEmails.map((e) => e.subject);
  const onboarding = sentEmails.filter((e) => /Welcome to Merritt Wellness/i.test(e.subject));
  assert.equal(onboarding.length, 1,
    `expected exactly 1 onboarding email, got ${onboarding.length}: ${subjects.join(' | ')}`);
  assert.deepEqual(onboarding[0].to, [CLIENT_EMAIL], 'onboarding goes to the client');
  assert.ok(results.onboardingEmail, 'result should record the onboarding send');
  assert.deepEqual(results.errors, [], 'no errors expected');
});

test('sendRecurringSetupEmails: client emails precede the staff notification', async () => {
  sentEmails.length = 0;
  await sendRecurringSetupEmails({ ...sampleBooking, recurring_details: null });

  const subjects = sentEmails.map((e) => e.subject);
  assert.equal(sentEmails.length, 4,
    `expected 4 sends (setup, onboarding, marketing, staff), got: ${subjects.join(' | ')}`);
  const staffIndex = sentEmails.findIndex((e) => !isClientFacing(e));
  assert.equal(staffIndex, sentEmails.length - 1,
    `staff notification must be last: ${subjects.join(' | ')}`);
});

// ---------- 3. Staff only receive their booking notification ----------

test('sendPublicEventMarketing: no staff BCC on the client-facing email', async () => {
  sentEmails.length = 0;
  await sendPublicEventMarketing(sampleBooking);

  assert.equal(sentEmails.length, 1);
  const payload = sentEmails[0];
  assert.deepEqual(payload.to, [CLIENT_EMAIL]);
  assert.equal(payload.bcc, undefined, 'staff must not be BCC\'d on the marketing email');
});

test('sendRecurringSetupClient: no staff BCC on the client-facing email', async () => {
  sentEmails.length = 0;
  await sendRecurringSetupClient({ ...sampleBooking, recurring_details: null });

  assert.equal(sentEmails.length, 1);
  const payload = sentEmails[0];
  assert.deepEqual(payload.to, [CLIENT_EMAIL]);
  assert.equal(payload.bcc, undefined, 'staff must not be BCC\'d on the recurring setup email');
});

test('sendBookingEmails: staff never appear on client-facing sends', async () => {
  sentEmails.length = 0;
  await sendBookingEmails(sampleBooking, { sendOnboarding: true, sendPublicMarketing: true });

  const staffAddrs = ['boss@example.com', 'desk@example.com'];
  for (const payload of sentEmails.filter(isClientFacing)) {
    const cc = [...(payload.cc || []), ...(payload.bcc || [])];
    for (const addr of staffAddrs) {
      assert.ok(!cc.includes(addr),
        `staff address ${addr} must not be CC/BCC'd on "${payload.subject}"`);
    }
  }
});

// ---------- 4. Email-sending routes must survive their whole pipeline ----------
// Vercel's default function timeout is far shorter than the email pipeline
// (calendar insert + N spaced sends). Any route that sends email without an
// explicit maxDuration WILL drop trailing emails under load.

test('stripe webhook route exports maxDuration', async () => {
  const route = await import('../app/api/webhooks/stripe/route.js');
  assert.ok(route.maxDuration >= 60,
    `webhook route must export maxDuration ≥ 60, got ${route.maxDuration}`);
});

test('booking-request route exports maxDuration', async () => {
  const route = await import('../app/api/booking-request/route.js');
  assert.ok(route.maxDuration >= 60,
    `booking-request route must export maxDuration ≥ 60, got ${route.maxDuration}`);
});

test('create-recurring-subscription route exports maxDuration', async () => {
  const route = await import('../app/api/payment/create-recurring-subscription/route.js');
  assert.ok(route.maxDuration >= 60,
    `create-recurring-subscription route must export maxDuration ≥ 60, got ${route.maxDuration}`);
});
