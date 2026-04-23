// Confirms the two emails sent immediately after a client finishes the
// Stripe SetupIntent and their recurring subscription goes live:
//
//   1. `recurringSetupClient` — the renter's copy (with ops BCC'd in prod).
//   2. `recurringSetupManager` — the ops team's copy (manager +
//      clientservices inboxes), delivered with the ID photo attached.
//
// Resend's SDK throws if instantiated without an API key, so we set a dummy
// key before the module loads. Templates themselves don't call Resend — they
// just return { subject, html } strings — so we can assert on their content
// directly without mocking the network.
process.env.RESEND_API_KEY ||= 're_test_recurring_setup';

import test from 'node:test';
import assert from 'node:assert/strict';

const { EMAIL_TEMPLATES } = await import('../app/lib/email.js');

// A fully-populated booking that mirrors what finalizeRecurringSetup writes
// back to Supabase after the subscription is created. Using realistic values
// surfaces template bugs (e.g. missing interpolation, broken currency
// formatting) that a sparse fixture would hide.
function buildRecurringBooking(overrides = {}) {
  return {
    id: 'book_abc123',
    event_name: 'Sunset Yoga Flow',
    event_type: 'yoga-class',
    contact_name: 'Alex Rivera',
    email: 'alex@example.com',
    phone: '+1-720-555-0110',
    home_address: '123 Irving St, Denver, CO 80204',
    business_name: 'Rivera Yoga Co.',
    expected_attendees: 18,
    stripe_subscription_id: 'sub_live_XYZ',
    stripe_customer_id: 'cus_live_ABC',
    payment_method: 'ach',
    subtotal: 665, // prorated first-month amount calculated at intake
    id_photo_name: 'alex-id.jpg',
    id_photo_data: 'data:image/jpeg;base64,AAAA', // non-null triggers "attached" copy
    id_photo_type: 'image/jpeg',
    recurring_details: JSON.stringify({
      hourlyRate: 95,
      slots: [
        { dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' },
        { dayOfWeek: 5, startTime: '7:00 PM', durationHours: 4, frequency: 'biweekly' },
      ],
      startDate: '2026-11-15',
      endDate: null,
      firstMonthCharge: 665,
      firstBillingDate: '2026-12-01T00:00:00.000Z',
      monthlyMinCharge: 1520,
      monthlyMaxCharge: 1900,
      paymentMethod: 'ach',
    }),
    ...overrides,
  };
}

test('recurring setup client email: subject names the event', () => {
  const { subject } = EMAIL_TEMPLATES.recurringSetupClient(buildRecurringBooking());
  assert.match(subject, /Recurring booking confirmed/i);
  assert.match(subject, /Sunset Yoga Flow/);
});

test('recurring setup client email: prorated first-month charge is displayed', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupClient(buildRecurringBooking());
  // The $665.00 prorated amount must be visible so the client knows exactly
  // what will hit their account on the first billing date.
  assert.match(html, /First-month prorated charge/);
  assert.match(html, /\$665\.00/);
});

test('recurring setup client email: start date and first billing date are displayed', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupClient(buildRecurringBooking());
  // The human-readable start date (Nov 15, 2026) must appear so the client
  // can reconcile the amount against their own calendar.
  assert.match(html, /November 15, 2026/);
  // First billing date is the 1st of the *next* month.
  assert.match(html, /December 1, 2026/);
});

test('recurring setup client email: lists every recurring slot', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupClient(buildRecurringBooking());
  // Weekly Wednesday + biweekly Friday should both be rendered as prose.
  assert.match(html, /Every Wednesday at 6:00 PM for 2 hrs/);
  assert.match(html, /Every other Friday at 7:00 PM for 4 hrs/);
});

test('recurring setup client email: payment method labels ACH vs. card correctly', () => {
  const ach = EMAIL_TEMPLATES.recurringSetupClient(buildRecurringBooking());
  assert.match(ach.html, /ACH Auto-Debit/);
  assert.doesNotMatch(ach.html, /3% processing fee/);

  const card = EMAIL_TEMPLATES.recurringSetupClient(
    buildRecurringBooking({
      payment_method: 'card',
      recurring_details: JSON.stringify({
        ...JSON.parse(buildRecurringBooking().recurring_details),
        paymentMethod: 'card',
      }),
    })
  );
  assert.match(card.html, /Card.*3% processing fee/);
});

test('recurring setup client email: monthly estimate range reflects min/max', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupClient(buildRecurringBooking());
  // Min/max come straight from recurring_details. This is what sets the
  // client's expectation that totals vary 4-5× / 2-3× per month.
  assert.match(html, /\$1520/);
  assert.match(html, /\$1900/);
});

test('recurring setup client email: booking id is surfaced for support replies', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupClient(buildRecurringBooking());
  assert.match(html, /book_abc123/);
});

test('recurring setup client email: greets the client by name', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupClient(buildRecurringBooking());
  assert.match(html, /Hi Alex Rivera/);
});

test('recurring setup manager email: subject identifies the series', () => {
  const { subject } = EMAIL_TEMPLATES.recurringSetupManager(buildRecurringBooking());
  assert.match(subject, /New recurring booking/);
  assert.match(subject, /Sunset Yoga Flow/);
});

test('recurring setup manager email: renter contact info is fully surfaced', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupManager(buildRecurringBooking());
  assert.match(html, /Alex Rivera/);
  assert.match(html, /alex@example\.com/);
  assert.match(html, /\+1-720-555-0110/);
  assert.match(html, /123 Irving St, Denver, CO 80204/);
  assert.match(html, /Rivera Yoga Co\./);
});

test('recurring setup manager email: Stripe subscription and customer ids are linked', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupManager(buildRecurringBooking());
  // Ops uses these to look things up in Stripe when the client calls.
  assert.match(html, /sub_live_XYZ/);
  assert.match(html, /cus_live_ABC/);
});

test('recurring setup manager email: prorated first-month and first billing date shown', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupManager(buildRecurringBooking());
  // Ops needs to see the same numbers the renter sees.
  assert.match(html, /\$665\.00/);
  assert.match(html, /December 1, 2026/);
});

test('recurring setup manager email: lists every recurring slot', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupManager(buildRecurringBooking());
  assert.match(html, /Every Wednesday/);
  assert.match(html, /Every other Friday/);
});

test('recurring setup manager email: flags when the ID photo is missing', () => {
  const booking = buildRecurringBooking({ id_photo_data: null, id_photo_name: null });
  const { html } = EMAIL_TEMPLATES.recurringSetupManager(booking);
  assert.match(html, /Not provided — contact renter/);
});

test('recurring setup manager email: shows ID photo attachment note when present', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupManager(buildRecurringBooking());
  assert.match(html, /Attached/);
  assert.match(html, /alex-id\.jpg/);
});

test('recurring setup manager email: expected attendee count shown for capacity planning', () => {
  const { html } = EMAIL_TEMPLATES.recurringSetupManager(buildRecurringBooking());
  assert.match(html, /18/);
});
