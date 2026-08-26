// The end-to-end test booking code (PROMO_CODE_TEST).
//
// WHY IT EXISTS
//
// There was no way to run a real booking through this app without paying for
// it. The only 100%-off path was PROMO_CODE_COMP — the venue's genuine
// sponsorship credential — so "let me check the booking flow works" meant
// typing the most dangerous string in the system into a public form, and the
// booking it produced was indistinguishable from a real comped reservation
// sitting on the live venue calendar.
//
// PROMO_CODE_TEST takes the same no-payment path, because anything less is not
// a test of the real pipeline: it must hit the conflict guards, the database
// write, the Google Calendar insert, and the full email set. What it adds is a
// LABEL, and the label is the entire safety story. This file pins it:
//
//   1. A test booking is comped and confirmed exactly like a sponsored one.
//   2. It is ALSO labelled a test — on the calendar title, in the calendar
//      colour, and in the staff email subject and body.
//   3. The TEST badge outranks the SPONSORED badge, so a truncated calendar
//      title still says "not real".
//   4. A genuine sponsored booking is never labelled a test.
//   5. Unset PROMO_CODE_TEST fails closed: no test code exists, and nothing
//      gets labelled a test.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

// Deliberately not the production strings — tests/promo-code-privacy.test.mjs
// scans this repository for whatever is configured, and this repo is public.
process.env.PROMO_CODE_COMP = 'TEST-COMP-9P3RJ6WM';
process.env.PROMO_CODE_TEST = 'TEST-TESTCODE-3M9XBF7L';
process.env.PROMO_CODE_PARTNER = 'TEST-PARTNER-4H7KQ2NX';

const COMP = process.env.PROMO_CODE_COMP;
const TESTCODE = process.env.PROMO_CODE_TEST;

const { lookupPromoCode, isTestPromoCode, testPromoCodes, __resetPromoWarning } = await import(
  '../app/lib/promo-codes.js'
);
const {
  isTestBooking,
  isSponsoredBooking,
  buildStaffAttentionFlags,
  pickCalendarColorId,
} = await import('../app/lib/calendar-flags.js');
const { EMAIL_TEMPLATES } = await import('../app/lib/email.js');

/** A minimal confirmed booking row, as the calendar and email code sees one. */
function booking(overrides = {}) {
  return {
    id: 'booking_test_1',
    event_name: 'Pipeline Check',
    event_date: '2026-09-14',
    event_time: '18:00',
    hours_requested: 2,
    expected_attendees: 10,
    total_amount: 0,
    payment_method: 'pay-later',
    contact_name: 'Cole Nading',
    customer_email: 'colenading@gmail.com',
    ...overrides,
  };
}

const tagsOf = (b) => buildStaffAttentionFlags(b).map((f) => f.tag);

test('the test code comps the booking outright, like the real sponsorship', () => {
  const data = lookupPromoCode(TESTCODE);
  assert.ok(data, 'PROMO_CODE_TEST must resolve to a configured code');
  assert.equal(data.discount, 1.0, 'a test booking must cost nothing');
  assert.equal(
    data.sponsored,
    true,
    'it must take the sponsored path — skipping Stripe is what makes it a real ' +
      'test of the no-payment flow'
  );
  assert.equal(
    data.daytimeAllowed,
    true,
    'a test must be bookable into any slot, including the workspace daytime window'
  );
  assert.equal(isTestPromoCode(TESTCODE), true);
  assert.deepEqual(testPromoCodes(), [TESTCODE]);
});

test('a test booking is labelled a test on the calendar, ahead of SPONSORED', () => {
  const tags = tagsOf(booking({ promo_code: TESTCODE }));

  assert.equal(
    tags[0],
    '🧪 TEST BOOKING',
    'the test badge must come FIRST — calendar grid views truncate the title, ' +
      'and "not a real booking" is the one tag that has to survive'
  );
  assert.ok(
    tags.includes('🎁 SPONSORED'),
    'it is still a comped booking and must still say so'
  );

  const detail = buildStaffAttentionFlags(booking({ promo_code: TESTCODE }))[0].detail;
  assert.match(detail, /NOT a real reservation/i);
  assert.match(detail, /delete this calendar event/i);
});

test('a test booking gets its own calendar colour, not the sponsored one', () => {
  const testColor = pickCalendarColorId(tagsOf(booking({ promo_code: TESTCODE })).map((tag) => ({ tag })));
  const sponsoredColor = pickCalendarColorId(tagsOf(booking({ promo_code: COMP })).map((tag) => ({ tag })));

  assert.notEqual(
    testColor,
    sponsoredColor,
    'a test event must not be shaded like a genuine comped booking'
  );
  assert.equal(testColor, '8', 'Graphite — visually unlike any real booking');
});

test('a genuine sponsored booking is never labelled a test', () => {
  const real = booking({ promo_code: COMP });
  assert.equal(isSponsoredBooking(real), true);
  assert.equal(
    isTestBooking(real),
    false,
    'labelling a real sponsorship "no one is coming" would lose the venue an event'
  );
  assert.ok(!tagsOf(real).includes('🧪 TEST BOOKING'));

  // And an ordinary paid booking carries neither label.
  const paid = booking({ promo_code: '', total_amount: 250 });
  assert.equal(isTestBooking(paid), false);
  assert.equal(isSponsoredBooking(paid), false);
});

test('the staff notification announces the test in the subject line', () => {
  const email = EMAIL_TEMPLATES.managerNotification(booking({ promo_code: TESTCODE }));

  assert.ok(
    email.subject.startsWith('🧪 TEST'),
    `the label must lead the subject so an inbox preview carries it, got: ${email.subject}`
  );
  assert.match(email.html, /TEST BOOKING/);
  assert.match(email.html, /No one is coming/i);
  assert.match(email.html, /delete/i);

  // A real booking's subject must be untouched.
  const real = EMAIL_TEMPLATES.managerNotification(booking({ promo_code: COMP }));
  assert.ok(!real.subject.includes('TEST'), `got: ${real.subject}`);
  assert.ok(!real.html.includes('TEST BOOKING'));
});

test('unset PROMO_CODE_TEST fails closed — no test code, nothing labelled', () => {
  const saved = process.env.PROMO_CODE_TEST;
  try {
    delete process.env.PROMO_CODE_TEST;
    __resetPromoWarning();

    assert.deepEqual(testPromoCodes(), [], 'no configuration must mean no test code');
    assert.equal(lookupPromoCode(saved), null, 'the old string must stop validating');
    // The dangerous direction here is the opposite of the comp code's: not a
    // free booking, but a REAL reservation wearing a "no one is coming" badge.
    assert.equal(isTestBooking({ promo_code: saved }), false);
    assert.equal(isTestBooking({ promo_code: COMP }), false);
    assert.equal(isTestBooking({ promo_code: '' }), false);
    assert.equal(isTestBooking(null), false);
  } finally {
    process.env.PROMO_CODE_TEST = saved;
    __resetPromoWarning();
  }
});
