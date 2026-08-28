// POST /api/inquiry — the marketing-page inquiry/waitlist intake.
//
// This route sends email, so it must follow the same delivery rules as the
// booking pipeline (see CLAUDE.md):
//   1. Client ack is sent BEFORE the staff notification, so a cut-short
//      function never costs the inquirer their reply.
//   2. Every send carries a Resend Idempotency-Key scoped to the inquiry id.
//   3. The staff notification reaches the WHOLE ops team — client services is
//      the venue's contact of record and is the line every page publishes, so
//      it must see the lead it will be answering. This used to be manager-only,
//      which meant a lead sat unread whenever that single inbox did.
//   4. Subjects embed inquiry-specific detail so no two inquiries produce
//      byte-identical messages.
//   5. A failed DB insert does not lose the inquiry (email still goes out),
//      and the honeypot field short-circuits bots without sending anything.
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon_test';
process.env.OPS_EMAIL_MANAGER = 'boss@example.com';
process.env.OPS_EMAIL_CLIENT_SERVICES = 'desk@example.com';

// ---------- Mocks (registered BEFORE importing app modules) ----------

const attempts = [];
class MockResend {
  constructor() {
    this.emails = {
      send: async (payload, options = {}) => {
        attempts.push({ payload, options });
        return { data: { id: `mock_${attempts.length}` }, error: null };
      },
    };
  }
}
mock.module('resend', { namedExports: { Resend: MockResend } });

let insertShouldFail = false;
const insertedRows = [];
mock.module('@supabase/supabase-js', {
  namedExports: {
    createClient: () => ({
      from: (table) => ({
        insert: async (rows) => {
          if (insertShouldFail) return { error: { message: 'relation "inquiries" does not exist' } };
          insertedRows.push({ table, rows });
          return { error: null };
        },
      }),
    }),
  },
});

const { POST } = await import('../app/api/inquiry/route.js');

function makeRequest(body) {
  return new Request('http://localhost/api/inquiry', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const baseInquiry = {
  kind: 'event',
  page: '/weddings',
  name: 'Avery Example',
  email: 'avery@example.com',
  phone: '555-0100',
  eventType: 'Wedding',
  eventDate: '2027-06-12',
  guestCount: '110',
  message: 'Looking at a Saturday in June.',
};

test('inquiry sends client ack before staff notification, both with idempotency keys', async () => {
  attempts.length = 0;
  const res = await POST(makeRequest(baseInquiry));
  assert.equal(res.status, 200);

  assert.equal(attempts.length, 2, 'exactly two emails: ack + staff notification');

  const [ack, notification] = attempts;
  assert.deepEqual(ack.payload.to, ['avery@example.com'],
    'first send is the client-facing ack');
  assert.ok(notification.payload.to.includes('desk@example.com'),
    'client services is the contact of record and must receive every new inquiry');
  assert.ok(notification.payload.to.includes('boss@example.com'),
    'the manager stays on the staff notification so nothing is lost');

  assert.match(ack.options.idempotencyKey, /^inquiry-ack\//);
  assert.match(notification.options.idempotencyKey, /^inquiry-notification\//);
  const ackId = ack.options.idempotencyKey.split('/')[1];
  const noteId = notification.options.idempotencyKey.split('/')[1];
  assert.equal(ackId, noteId, 'both keys scope to the same inquiry id');

  assert.ok(ack.payload.text, 'ack carries a plain-text part');
  assert.ok(notification.payload.text, 'notification carries a plain-text part');
  assert.ok(ack.payload.subject.includes('Avery Example'),
    'subject embeds inquiry-specific detail');
  assert.equal(notification.payload.replyTo, 'avery@example.com',
    'staff can reply straight to the inquirer');
  assert.equal(ack.payload.replyTo, 'desk@example.com',
    "the inquirer's reply lands with client services, the line the ack tells them to call");
});

test('waitlist inquiries include the desired start window', async () => {
  attempts.length = 0;
  const res = await POST(makeRequest({
    kind: 'waitlist',
    page: '/studio',
    name: 'Jordan Example',
    email: 'jordan@example.com',
    startWindow: 'January 2027',
  }));
  assert.equal(res.status, 200);
  assert.equal(attempts.length, 2);
  assert.ok(attempts[0].payload.subject.includes('January 2027'),
    'waitlist ack subject embeds the start window');
  assert.ok(attempts[1].payload.subject.toLowerCase().includes('waitlist'),
    'staff notification identifies itself as a waitlist entry');
});

test('a failed DB insert does not lose the inquiry', async () => {
  attempts.length = 0;
  insertShouldFail = true;
  try {
    const res = await POST(makeRequest(baseInquiry));
    assert.equal(res.status, 200, 'email delivery keeps the inquiry alive');
    assert.equal(attempts.length, 2);
  } finally {
    insertShouldFail = false;
  }
});

test('honeypot submissions are quietly dropped', async () => {
  attempts.length = 0;
  insertedRows.length = 0;
  const res = await POST(makeRequest({ ...baseInquiry, website: 'http://spam.example' }));
  assert.equal(res.status, 200, 'bots get a quiet success');
  assert.equal(attempts.length, 0, 'no emails for honeypot hits');
  assert.equal(insertedRows.length, 0, 'no DB row for honeypot hits');
});

test('invalid inquiries are rejected with 400', async () => {
  attempts.length = 0;
  const res = await POST(makeRequest({ kind: 'event', name: '', email: 'not-an-email' }));
  assert.equal(res.status, 400);
  assert.equal(attempts.length, 0);
});
