// Tests for the Resend send wrapper (`sendEmailWithRetry`) in app/lib/email.js.
//
// Bug this guards against: the Resend SDK does NOT throw when the API rejects a
// send — it resolves to `{ data: null, error: {...} }`. The send functions used
// to read only `result.data?.id` and ignore `result.error`, so a rate-limit
// rejection (HTTP 429) was logged as a phantom "✅ sent successfully" while the
// email was silently dropped. That is how a booking confirmation / manager
// notification could go missing even though nothing was logged as failed.
//
// The fix: every send goes through `sendEmailWithRetry`, which inspects
// `result.error`, retries rate-limit errors with backoff, and throws on any
// unrecoverable error so the caller records it instead of reporting success.
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';

// ---------- Mock Resend ----------
// `sendQueue` lets each test script the sequence of responses Resend returns.
// When the queue is empty, default to success. A queued entry may be an object
// ({ data, error }) or a function (payload) => response.
let sendQueue = [];
const sendCalls = [];

class MockResend {
  constructor() {
    this.emails = {
      send: async (payload) => {
        sendCalls.push(payload);
        const next = sendQueue.shift();
        if (typeof next === 'function') return next(payload);
        return next ?? { data: { id: `ok_${sendCalls.length}` }, error: null };
      },
    };
  }
}
mock.module('resend', { namedExports: { Resend: MockResend } });

const { sendBookingConfirmation } = await import('../app/lib/email.js');

const sampleBooking = {
  id: 'booking_1',
  email: 'renter@example.com',
  event_name: 'Yoga Workshop',
  event_type: 'workshop',
  event_date: '2026-06-20',
  event_time: '6:00 PM',
  hours_requested: 2,
};

function rateLimitError() {
  return {
    data: null,
    error: { name: 'rate_limit_exceeded', statusCode: 429, message: 'Too many requests' },
  };
}

function resetSends() {
  sendCalls.length = 0;
  sendQueue = [];
}

test('a one-off 429 is retried and the email still goes out', async () => {
  resetSends();
  sendQueue = [
    rateLimitError(),
    { data: { id: 'email_recovered' }, error: null },
  ];

  const result = await sendBookingConfirmation(sampleBooking);

  assert.equal(sendCalls.length, 2, 'should retry once after the 429');
  assert.equal(result.data.id, 'email_recovered');
});

test('a Resend error response is NOT treated as a phantom success', async () => {
  resetSends();
  // A non-rate-limit API error (e.g. validation) — must surface, not silently
  // pass as success the way the old `result.data?.id`-only code did.
  sendQueue = [
    { data: null, error: { name: 'validation_error', statusCode: 422, message: 'Invalid recipient' } },
  ];

  await assert.rejects(
    () => sendBookingConfirmation(sampleBooking),
    /Email confirmation failed.*Invalid recipient/,
  );
  assert.equal(sendCalls.length, 1, 'non-rate-limit errors are not retried');
});

test('a rate limit that never clears throws after exhausting retries', async () => {
  resetSends();
  // Always rate-limited — the wrapper should give up after RESEND_MAX_ATTEMPTS
  // and throw so the caller records the failure instead of dropping it silently.
  sendQueue = Array.from({ length: 10 }, () => rateLimitError());

  await assert.rejects(
    () => sendBookingConfirmation(sampleBooking),
    /Email confirmation failed/,
  );
  assert.equal(sendCalls.length, 4, 'should attempt exactly RESEND_MAX_ATTEMPTS times');
});

test('a clean send returns the Resend id without retrying', async () => {
  resetSends();
  sendQueue = [{ data: { id: 'email_clean' }, error: null }];

  const result = await sendBookingConfirmation(sampleBooking);

  assert.equal(sendCalls.length, 1, 'a successful send is not retried');
  assert.equal(result.data.id, 'email_clean');
});
