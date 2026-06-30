// Tests for the multi-event clarity messaging in booking emails.
//
// Bug this guards against: when a renter books several events in one
// transaction, every booking row stores the SAME group-wide combined total.
// Each event still gets its own confirmation + manager email, so without
// context the shared total (e.g. $489) reads as a per-event price — staff had
// to manually confirm the renter paid $489 total for BOTH events, not $489
// each. The templates now label each email "event X of N" and spell out that
// the amount is the combined, charged-once total for the whole group.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';

const { EMAIL_TEMPLATES, buildGroupContext } = await import('../app/lib/email.js');

function makeGroup() {
  const shared = {
    contact_name: 'Jane Doe',
    event_name: 'Soften & Unwind: A Restorative Evening',
    event_type: 'therapy',
    email: 'jane@example.com',
    expected_attendees: 20,
    hours_requested: 2.5,
    // Each row carries the GROUP total — this is the real shape that caused the
    // confusion: combined $489 across both events, repeated on every row.
    total_amount: 489,
    subtotal: 475,
    stripe_fee: 14,
    payment_method: 'card',
    status: 'confirmed',
  };
  return [
    { ...shared, id: 'b1', master_booking_id: 'm', event_date: '2026-08-13', event_time: '6:00 PM' },
    { ...shared, id: 'b2', master_booking_id: 'm', event_date: '2026-09-17', event_time: '6:00 PM' },
  ];
}

test('buildGroupContext: returns null for a single booking', () => {
  const [solo] = makeGroup();
  assert.equal(buildGroupContext(solo, [solo]), null);
  assert.equal(buildGroupContext(solo, undefined), null);
});

test('buildGroupContext: positions each booking chronologically within the group', () => {
  const group = makeGroup();
  const ctxFirst = buildGroupContext(group[0], group);
  const ctxSecond = buildGroupContext(group[1], group);

  assert.equal(ctxFirst.total, 2);
  assert.equal(ctxFirst.position, 1);
  assert.equal(ctxSecond.position, 2);
  // The combined total is the row's own stored total — never the sum of rows.
  assert.equal(ctxFirst.combinedTotal, 489);
  assert.deepEqual(ctxFirst.events.map((e) => e.date), ['2026-08-13', '2026-09-17']);
});

test('customer confirmation: multi-event email states combined, charged-once total', () => {
  const group = makeGroup();
  const ctx = buildGroupContext(group[0], group);
  const { subject, html } = EMAIL_TEMPLATES.bookingConfirmation(group[0], ctx);

  assert.match(subject, /\(1 of 2\)/);
  assert.match(html, /Multi-event booking/i);
  assert.match(html, /Event 1 of 2/);
  assert.match(html, /combined total for all 2 events/i);
  assert.match(html, /charged once/i);
  // The receipt's total row is relabeled so $489 can't read as a single event.
  assert.match(html, /Total \(all 2 events\)/);
  // Both event dates are listed so the renter can place this email in the group.
  assert.match(html, /Sep 17, 2026/);
});

test('manager notification: multi-event email flags the amount as combined', () => {
  const group = makeGroup();
  const ctx = buildGroupContext(group[0], group);
  const { subject, html } = EMAIL_TEMPLATES.managerNotification(group[0], ctx);

  assert.match(subject, /\(1 of 2\)/);
  assert.match(html, /Multi-event booking/i);
  assert.match(html, /combined total for all 2 events \(charged once, not per event\)/i);
  assert.match(html, /Total \(all 2 events\)/);
});

test('single booking: no multi-event messaging leaks in', () => {
  const [solo] = makeGroup();
  const ctx = buildGroupContext(solo, [solo]); // null
  const confirmation = EMAIL_TEMPLATES.bookingConfirmation(solo, ctx);
  const manager = EMAIL_TEMPLATES.managerNotification(solo, ctx);

  assert.doesNotMatch(confirmation.subject, /\d of \d/);
  assert.doesNotMatch(confirmation.html, /Multi-event booking/i);
  assert.doesNotMatch(confirmation.html, /Total \(all/);
  assert.doesNotMatch(manager.html, /Multi-event booking/i);
  // Single-booking total stays the plain "Total" label.
  assert.match(confirmation.html, />Total</);
});
