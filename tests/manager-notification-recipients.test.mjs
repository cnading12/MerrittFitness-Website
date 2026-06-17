// Tests for staff-facing booking notification recipients.
//
// Bug this guards against: sendManagerNotification() (and the recurring
// equivalent) used to be hardcoded to a single address
// (clientservices@merrittwellness.net), so manager@merrittwellness.net never
// received a new-booking notification and a single bad address meant staff got
// nothing. The fix routes these to the whole ops team (manager + client
// services), preferring the OPS_EMAIL_* env vars and falling back to the known
// staff addresses so no recipient is ever silently dropped.
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';

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

const { sendManagerNotification, sendRecurringSetupManager } =
  await import('../app/lib/email.js');

const sampleBooking = {
  id: 'booking_test_1',
  contact_name: 'Jane Doe',
  email: 'jane@example.com',
  event_name: 'Yoga Workshop',
  event_type: 'workshop',
  event_date: '2026-05-15',
  event_time: '6:00 PM',
  hours_requested: 2,
  total_amount: 250,
};

function withOpsEnv(manager, clientServices, fn) {
  const prevManager = process.env.OPS_EMAIL_MANAGER;
  const prevClient = process.env.OPS_EMAIL_CLIENT_SERVICES;
  if (manager === undefined) delete process.env.OPS_EMAIL_MANAGER;
  else process.env.OPS_EMAIL_MANAGER = manager;
  if (clientServices === undefined) delete process.env.OPS_EMAIL_CLIENT_SERVICES;
  else process.env.OPS_EMAIL_CLIENT_SERVICES = clientServices;
  return Promise.resolve(fn()).finally(() => {
    if (prevManager === undefined) delete process.env.OPS_EMAIL_MANAGER;
    else process.env.OPS_EMAIL_MANAGER = prevManager;
    if (prevClient === undefined) delete process.env.OPS_EMAIL_CLIENT_SERVICES;
    else process.env.OPS_EMAIL_CLIENT_SERVICES = prevClient;
  });
}

test('sendManagerNotification: falls back to both staff addresses when ops env is unset', async () => {
  await withOpsEnv(undefined, undefined, async () => {
    sentEmails.length = 0;
    await sendManagerNotification(sampleBooking);

    assert.equal(sentEmails.length, 1, 'expected exactly one Resend send');
    const { to } = sentEmails[0];
    assert.ok(to.includes('manager@merrittwellness.net'), 'manager must be a recipient');
    assert.ok(to.includes('clientservices@merrittwellness.net'), 'client services must be a recipient');
  });
});

test('sendManagerNotification: uses configured ops distribution list when set', async () => {
  await withOpsEnv('boss@example.com', 'desk@example.com', async () => {
    sentEmails.length = 0;
    await sendManagerNotification(sampleBooking);

    const { to } = sentEmails[0];
    assert.deepEqual([...to].sort(), ['boss@example.com', 'desk@example.com']);
  });
});

test('sendManagerNotification: de-duplicates when both ops vars share an address', async () => {
  await withOpsEnv('same@example.com', 'same@example.com', async () => {
    sentEmails.length = 0;
    await sendManagerNotification(sampleBooking);

    const { to } = sentEmails[0];
    assert.deepEqual(to, ['same@example.com'], 'duplicate addresses must collapse to one');
  });
});

test('sendRecurringSetupManager: reaches the whole ops team', async () => {
  await withOpsEnv(undefined, undefined, async () => {
    sentEmails.length = 0;
    await sendRecurringSetupManager({ ...sampleBooking, recurring_details: null });

    const { to } = sentEmails[0];
    assert.ok(to.includes('manager@merrittwellness.net'), 'manager must be a recipient');
    assert.ok(to.includes('clientservices@merrittwellness.net'), 'client services must be a recipient');
  });
});
