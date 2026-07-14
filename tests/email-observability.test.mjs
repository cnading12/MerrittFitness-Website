// Guards the durable email-delivery log (app/lib/email-log.js).
//
// Why it exists: the recurring "client only received their first email"
// incident could never be diagnosed after the fact — the only evidence lived
// in ephemeral serverless logs. Every send outcome is now recorded in the
// `email_events` table:
//   - 'sent' rows carry the Resend message id (so /api/admin/email-status can
//     ask Resend whether it was actually delivered, bounced, or marked spam),
//   - 'failed' rows carry the final error after retries,
//   - a MISSING row proves the pipeline never reached that send.
//
// These tests lock in: every pipeline email logs an event, failures are
// logged too, and a broken/missing log table can never break the send itself.
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon_test';
process.env.OPS_EMAIL_MANAGER = process.env.OPS_EMAIL_MANAGER || 'boss@example.com';
process.env.OPS_EMAIL_CLIENT_SERVICES = process.env.OPS_EMAIL_CLIENT_SERVICES || 'desk@example.com';

// ---------- Mocks (registered BEFORE importing app modules) ----------
const sentEmails = [];
// Subjects matching this pattern fail with a non-retryable Resend error.
let failPattern = null;
class MockResend {
  constructor() {
    this.emails = {
      send: async (payload) => {
        if (failPattern && failPattern.test(payload.subject)) {
          return { data: null, error: { name: 'validation_error', message: 'mock rejection' } };
        }
        sentEmails.push(payload);
        return { data: { id: `mock_${sentEmails.length}` }, error: null };
      },
    };
  }
}
mock.module('resend', { namedExports: { Resend: MockResend } });

// Supabase mock that captures inserts per table. `failInserts` simulates the
// email_events table being missing so we can prove logging failures are
// swallowed.
const inserted = { email_events: [] };
let failInserts = false;
mock.module('@supabase/supabase-js', {
  namedExports: {
    createClient: () => ({
      from: (table) => {
        const builder = {
          select: () => builder,
          insert: (row) => {
            if (failInserts) {
              return Promise.resolve({ data: null, error: { message: 'relation "email_events" does not exist' } });
            }
            (inserted[table] = inserted[table] || []).push(row);
            return Promise.resolve({ data: [row], error: null });
          },
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
      auth: { GoogleAuth: class { constructor() {} async getClient() { return {}; } } },
      calendar: () => ({ events: { insert: async () => ({ data: { id: 'cal_1' } }) } }),
    },
  },
});

const { sendBookingEmails } = await import('../app/lib/booking-fulfillment.js');

const sampleBooking = {
  id: 'booking_obs_1',
  master_booking_id: 'master_obs_1',
  contact_name: 'Jane Doe',
  email: 'jane@example.com',
  event_name: 'Yoga Workshop',
  event_type: 'workshop',
  event_date: '2026-05-15',
  event_time: '6:00 PM',
  hours_requested: 2,
  total_amount: 250,
  is_public: true,
};

function reset() {
  sentEmails.length = 0;
  inserted.email_events = [];
  failInserts = false;
  failPattern = null;
}

test('every email in the pipeline records a sent event with its Resend id', async () => {
  reset();
  const errors = await sendBookingEmails(sampleBooking, {
    sendOnboarding: true,
    sendPublicMarketing: true,
  });
  assert.deepEqual(errors, []);

  const events = inserted.email_events;
  assert.equal(events.length, 4, `expected 4 logged events, got ${events.length}`);

  const kinds = events.map((e) => e.email_kind);
  assert.deepEqual(kinds, [
    'booking-confirmation',
    'client-onboarding',
    'public-event-marketing',
    'manager-notification',
  ], 'one event per pipeline email, in send order');

  for (const e of events) {
    assert.equal(e.status, 'sent');
    assert.equal(e.booking_id, 'booking_obs_1');
    assert.equal(e.master_booking_id, 'master_obs_1');
    assert.match(e.resend_id, /^mock_\d+$/, 'sent events must carry the Resend message id');
    assert.ok(e.idempotency_key, 'sent events must record the idempotency key');
    assert.ok(e.recipient, 'sent events must record the recipient');
  }
});

test('a rejected send records a failed event with the Resend error', async () => {
  reset();
  failPattern = /Welcome to Merritt Wellness/i; // onboarding is rejected

  const errors = await sendBookingEmails(sampleBooking, {
    sendOnboarding: true,
    sendPublicMarketing: true,
  });
  assert.equal(errors.length, 1, 'onboarding failure is reported');
  assert.match(errors[0], /^onboarding:/);

  const failed = inserted.email_events.filter((e) => e.status === 'failed');
  assert.equal(failed.length, 1);
  assert.equal(failed[0].email_kind, 'client-onboarding');
  assert.match(failed[0].error_message, /mock rejection/);

  // The rest of the pipeline still ran and logged.
  const sent = inserted.email_events.filter((e) => e.status === 'sent');
  assert.deepEqual(sent.map((e) => e.email_kind), [
    'booking-confirmation',
    'public-event-marketing',
    'manager-notification',
  ]);
});

test('a broken email_events table never blocks the emails themselves', async () => {
  reset();
  failInserts = true; // simulate the migration not having been run

  const errors = await sendBookingEmails(sampleBooking, {
    sendOnboarding: true,
    sendPublicMarketing: true,
  });

  assert.deepEqual(errors, [], 'sends must succeed even when logging fails');
  assert.equal(sentEmails.length, 4, 'all 4 emails still go out');
});

test('admin email-status route exports maxDuration', async () => {
  const route = await import('../app/api/admin/email-status/route.js');
  assert.ok(route.maxDuration >= 60,
    `email-status route must export maxDuration ≥ 60, got ${route.maxDuration}`);
});
