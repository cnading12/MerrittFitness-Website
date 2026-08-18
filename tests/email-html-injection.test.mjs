// Renter-supplied text must be HTML-escaped before it reaches an email body.
//
// Every template in app/lib/email.js is built by string interpolation, and
// most of the values come straight off the booking form. Interpolated raw, a
// renter can close the surrounding tag and write their own markup into a
// message that goes out from OUR domain, from OUR address:
//
//   - the staff notification becomes a phishing channel (a "special request"
//     that renders as an approve-this link the manager did not write);
//   - the renter's own confirmation can be dressed up with fake payment
//     instructions and forwarded on as proof of what we sent.
//
// Mail clients don't execute scripts, so this is spoofing rather than XSS —
// but it is a real primitive, and unescaped input also lets one malformed
// value break the layout of every downstream template.
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon_test';
process.env.OPS_EMAIL_MANAGER = 'boss@example.com';
process.env.OPS_EMAIL_CLIENT_SERVICES = 'desk@example.com';

const sent = [];
class MockResend {
  constructor() {
    this.emails = {
      send: async (payload) => {
        sent.push(payload);
        return { data: { id: `mock_${sent.length}` }, error: null };
      },
    };
  }
}
mock.module('resend', { namedExports: { Resend: MockResend } });
mock.module('@supabase/supabase-js', {
  namedExports: {
    createClient: () => ({
      from: () => ({ insert: async () => ({ error: null }) }),
    }),
  },
});

const {
  esc,
  sendBookingConfirmation,
  sendManagerNotification,
  sendInquiryNotification,
  sendMonthlyBillingRollupEmail,
} = await import('../app/lib/email.js');

// The payload an attacker would submit: markup that breaks out of the table
// cell it lands in and writes a link the recipient will read as ours.
const BREAKOUT = '</td></tr><tr><td><a href="https://evil.example/pay">Pay here instead</a>';

function maliciousBooking() {
  return {
    id: 'b-injection-1',
    master_booking_id: 'b-injection-1',
    event_name: `Yoga${BREAKOUT}`,
    event_type: 'wellness',
    event_date: '2026-09-01',
    event_time: '10:00 AM',
    hours_requested: 2,
    expected_attendees: 10,
    contact_name: `Ann${BREAKOUT}`,
    email: 'renter@example.com',
    phone: '555-0100',
    home_address: `1 Main St${BREAKOUT}`,
    business_name: `Studio${BREAKOUT}`,
    special_requests: BREAKOUT,
    total_amount: 190,
    subtotal: 190,
    status: 'confirmed',
  };
}

test('the confirmation email neutralizes markup in renter-supplied fields', async () => {
  sent.length = 0;
  await sendBookingConfirmation(maliciousBooking());

  const html = sent.map((s) => s.html).join('\n');
  assert.ok(html.length > 0, 'an email should have been produced');
  assert.ok(
    !html.includes('<a href="https://evil.example/pay">'),
    'the injected anchor must not survive as live markup'
  );
  assert.ok(
    html.includes('&lt;/td&gt;&lt;/tr&gt;') || html.includes('&lt;a href='),
    'the payload should appear escaped, as literal text'
  );
});

test('the staff notification neutralizes markup in every renter field', async () => {
  sent.length = 0;
  await sendManagerNotification(maliciousBooking());

  const html = sent.map((s) => s.html).join('\n');
  assert.ok(html.length > 0, 'an email should have been produced');
  assert.ok(
    !html.includes('<a href="https://evil.example/pay">'),
    'staff must never be shown an attacker-authored link as if we wrote it'
  );
});

test('the inquiry notification escapes the free-text message', async () => {
  sent.length = 0;
  await sendInquiryNotification({
    id: 'inq-1',
    kind: 'event',
    name: `Bob${BREAKOUT}`,
    email: 'bob@example.com',
    phone: '555-0111',
    message: BREAKOUT,
    page: '/weddings',
  });

  const html = sent.map((s) => s.html).join('\n');
  assert.ok(html.length > 0, 'an email should have been produced');
  assert.ok(
    !html.includes('<a href="https://evil.example/pay">'),
    'the inquiry message is the least-validated input in the app — it must be escaped'
  );
});

test('esc covers every HTML-significant character, including both quote styles', () => {
  // Both quote styles matter: these templates interpolate into quoted
  // attribute values (href="mailto:${...}") as well as into text nodes.
  assert.equal(esc(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
  assert.equal(esc('plain text'), 'plain text');
  // Ampersands must be escaped first, or the other replacements get
  // double-encoded into visible garbage.
  assert.equal(esc('Tom & Jerry'), 'Tom &amp; Jerry');
});

test('esc renders null and undefined as empty, never as the words', () => {
  // A field the renter left blank must not print "undefined" in their
  // confirmation email.
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(0), '0', 'zero is a real value and must survive');
  assert.equal(esc(false), 'false');
});


test('the monthly billing roll-up escapes every per-booking cell', async () => {
  // This one is easy to miss: the roll-up's fields look server-authored, and
  // the email is staff-only. But `error` carries err.message from Stripe and
  // Postgres, and those messages quote the offending value — a renter's event
  // name reaches Stripe as an invoice-item description and can come straight
  // back inside an error string. Every cell gets escaped, not just the ones
  // that obviously hold renter text.
  sent.length = 0;
  await sendMonthlyBillingRollupEmail({
    year: 2026,
    month: 9,
    dryRun: false,
    results: {
      succeeded: [{
        bookingId: 'b1',
        eventName: `Yoga${BREAKOUT}`,
        contactName: `Ann${BREAKOUT}`,
        amount: 100,
        totalHours: 2,
        occurrenceCount: 1,
        note: `Note${BREAKOUT}`,
      }],
      skipped: [{ bookingId: 'b3', eventName: `Skip${BREAKOUT}`, note: `Skipped${BREAKOUT}` }],
      failed: [{ bookingId: 'b2', eventName: `Bad${BREAKOUT}`, error: `Stripe said: ${BREAKOUT}` }],
    },
  });

  const html = sent.map((s) => s.html).join('\n');
  assert.ok(html.length > 0, 'a roll-up email should have been produced');
  assert.ok(
    !html.includes('<a href="https://evil.example/pay">'),
    'no cell in the roll-up may render attacker-authored markup'
  );
});
