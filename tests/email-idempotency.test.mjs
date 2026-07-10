// Guards against the "client received the onboarding email 4 times and the
// marketing email never" incident.
//
// What happened: a multi-date booking group was being fulfilled by the Stripe
// webhook when the function was cut short mid-group. Stripe redelivered the
// webhook; the retry correctly skipped the already-confirmed bookings, but the
// in-memory "onboarding already sent" flag reset with every invocation, so
// each retry re-sent the onboarding email with the next booking in the group.
// Meanwhile emails later in the pipeline (public marketing) were killed every
// round and never arrived. Separately, `sendEmailWithRetry` could re-send an
// email whose previous attempt WAS accepted by Resend but whose response was
// lost in transit.
//
// The fix this file locks in: every send carries a Resend Idempotency-Key.
//   - Per-booking emails (confirmation, staff notification) key on booking.id.
//   - Once-per-GROUP emails (onboarding, public marketing) key on
//     master_booking_id, so a re-attempt from ANY booking in the group — even
//     in a fresh invocation — dedupes against the first delivery.
//   - Transient transport errors are retried (safe now) with the SAME key.
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon_test';
process.env.GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'cal_test@group.calendar.google.com';
process.env.GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || 'test@example.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ||
  '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----';

// ---------- Mocks (registered BEFORE importing app modules) ----------

// Records every attempt as { payload, options }. Individual tests can queue
// scripted results (e.g. a transport error) via `scriptedResults`; when the
// queue is empty every send succeeds.
const attempts = [];
const scriptedResults = [];
class MockResend {
  constructor() {
    this.emails = {
      send: async (payload, options = {}) => {
        attempts.push({ payload, options });
        if (scriptedResults.length > 0) {
          return scriptedResults.shift();
        }
        return { data: { id: `mock_${attempts.length}` }, error: null };
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

const { sendBookingEmails } = await import('../app/lib/booking-fulfillment.js');
const {
  sendClientOnboarding,
  sendPublicEventMarketing,
  sendRecurringSetupEmails,
} = await import('../app/lib/email.js');

const MASTER_ID = 'master_group_42';
const baseBooking = {
  id: 'booking_a',
  master_booking_id: MASTER_ID,
  contact_name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-555-1212',
  event_name: 'Yoga Workshop',
  event_type: 'workshop',
  event_date: '2026-08-15',
  event_time: '6:00 PM',
  hours_requested: 2,
  total_amount: 250,
  is_public: true,
};
const siblingBooking = { ...baseBooking, id: 'booking_b', event_date: '2026-08-22' };

function keysByLabelSubstring(substr) {
  return attempts
    .filter((a) => (a.payload.subject || '').toLowerCase().includes(substr))
    .map((a) => a.options.idempotencyKey);
}

// ---------- 1. Every email in the booking pipeline carries a key ----------

test('sendBookingEmails: every send carries an idempotency key with the right scope', async () => {
  attempts.length = 0;
  const errors = await sendBookingEmails(baseBooking, {
    sendOnboarding: true,
    sendPublicMarketing: true,
  });

  assert.deepEqual(errors, []);
  assert.equal(attempts.length, 4, 'confirmation, onboarding, marketing, staff');
  for (const { payload, options } of attempts) {
    assert.ok(options.idempotencyKey,
      `send "${payload.subject}" is missing an idempotency key`);
  }

  const keys = attempts.map((a) => a.options.idempotencyKey);
  // Per-booking emails key on the booking id.
  assert.equal(keys[0], `booking-confirmation/${baseBooking.id}`);
  assert.equal(keys[3], `manager-notification/${baseBooking.id}`);
  // Once-per-group emails key on the master booking id.
  assert.equal(keys[1], `client-onboarding/${MASTER_ID}`);
  assert.equal(keys[2], `public-event-marketing/${MASTER_ID}`);
});

// ---------- 2. The incident: onboarding re-attempted from a DIFFERENT booking
// in the group (fresh webhook invocation after a mid-group crash) must reuse
// the same key, so Resend dedupes instead of delivering again ----------

test('onboarding + marketing keys are identical for every booking in a group', async () => {
  attempts.length = 0;
  await sendClientOnboarding(baseBooking);
  await sendClientOnboarding(siblingBooking);
  await sendPublicEventMarketing(baseBooking);
  await sendPublicEventMarketing(siblingBooking);

  const [onb1, onb2] = keysByLabelSubstring('welcome to merritt wellness');
  assert.equal(onb1, onb2,
    'a retried invocation sending onboarding via a different booking must dedupe');

  const [mkt1, mkt2] = keysByLabelSubstring('promote');
  assert.equal(mkt1, mkt2,
    'a retried invocation sending marketing via a different booking must dedupe');
});

test('bookings without a master_booking_id fall back to their own id', async () => {
  attempts.length = 0;
  await sendClientOnboarding({ ...baseBooking, master_booking_id: null });
  assert.equal(attempts[0].options.idempotencyKey, `client-onboarding/${baseBooking.id}`);
});

// ---------- 3. Transient transport errors retry with the SAME key ----------
// The Resend SDK never throws — a lost response surfaces as
// { error: { name: 'application_error', message: 'Unable to fetch data...' } }.
// The email may have been accepted, so the retry MUST reuse the key.

test('a lost-response transport error is retried once with the same key', async () => {
  attempts.length = 0;
  scriptedResults.push({
    data: null,
    error: { name: 'application_error', message: 'Unable to fetch data. The request could not be resolved.' },
  });

  const result = await sendClientOnboarding(baseBooking);
  assert.ok(result.data?.id, 'second attempt should succeed');
  assert.equal(attempts.length, 2, 'exactly one retry');
  assert.equal(attempts[0].options.idempotencyKey, attempts[1].options.idempotencyKey,
    'the retry must reuse the original idempotency key or Resend cannot dedupe');
});

test('rate-limit errors still retry (with the same key)', async () => {
  attempts.length = 0;
  scriptedResults.push({
    data: null,
    error: { statusCode: 429, name: 'rate_limit_exceeded', message: 'Too many requests' },
  });

  const result = await sendClientOnboarding(baseBooking);
  assert.ok(result.data?.id);
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].options.idempotencyKey, attempts[1].options.idempotencyKey);
});

test('non-retryable API errors fail after a single attempt', async () => {
  attempts.length = 0;
  scriptedResults.push({
    data: null,
    error: { statusCode: 422, name: 'validation_error', message: 'Invalid `to` address' },
  });

  await assert.rejects(() => sendClientOnboarding(baseBooking), /Invalid `to` address/);
  assert.equal(attempts.length, 1, 'validation errors must not be retried');
});

// ---------- 4. Recurring pipeline sends carry keys too ----------

test('sendRecurringSetupEmails: every send carries an idempotency key', async () => {
  attempts.length = 0;
  const results = await sendRecurringSetupEmails({
    ...baseBooking,
    master_booking_id: baseBooking.id, // recurring series: master == application id
    recurring_details: null,
  });

  assert.deepEqual(results.errors, []);
  assert.equal(attempts.length, 4, 'setup, onboarding, marketing, staff');
  for (const { payload, options } of attempts) {
    assert.ok(options.idempotencyKey,
      `send "${payload.subject}" is missing an idempotency key`);
  }
});
