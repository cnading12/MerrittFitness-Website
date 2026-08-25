// The weekday daytime window held for Merritt Workspace next door.
//
// The venue shares a wall with a coworking space. A loud event in the main
// hall on a weekday morning lands on people who are working, so weekday
// 8 AM – 4 PM is not generally bookable — but daytime programming that
// benefits the whole building (a yoga class, a meditation sit, a quiet
// workshop) IS welcome, and is unlocked with a promo code we issue by hand.
//
// This file locks in three things:
//   1. The window math, including the two boundary handoffs at 8 AM and 4 PM.
//   2. That the rule is enforced SERVER-SIDE at intake, not just in the form.
//   3. That it fails closed — an unconfigured or unknown code never unlocks.
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon_test';
process.env.GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'cal_test@group.calendar.google.com';
process.env.GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || 'test@example.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ||
  '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----';

// Fixture codes, so no real code ever enters this public repo. Read at call
// time by app/lib/promo-codes.js, so import ordering doesn't matter.
process.env.PROMO_CODE_PARTNER = 'TEST-PARTNER-4H7KQ2NX';
process.env.PROMO_CODE_COMP = 'TEST-COMP-9P3RJ6WM';
process.env.PROMO_CODE_SPONSOR = 'TEST-SPONSOR-5T8DGY2C';
process.env.PROMO_CODE_DAYTIME = 'TEST-DAYTIME-6Q2WVK8B';

// ---------- Mocks (registered before the route import) ----------
const dbInserts = [];
function makeQuery(table) {
  const ctx = { op: null, payload: null };
  const builder = {
    select() { if (!ctx.op) ctx.op = 'select'; return builder; },
    insert(payload) { ctx.op = 'insert'; ctx.payload = Array.isArray(payload) ? payload : [payload]; return builder; },
    update() { ctx.op = 'update'; return builder; },
    eq() { return builder; },
    neq() { return builder; },
    in() { return builder; },
    order() { return builder; },
    limit() { return builder; },
    single() { return Promise.resolve({ data: null, error: null }); },
    then(resolve, reject) {
      if (ctx.op === 'insert') {
        if (table === 'bookings') dbInserts.push(...ctx.payload);
        return Promise.resolve({ data: ctx.payload, error: null }).then(resolve, reject);
      }
      return Promise.resolve({ data: [], error: null }).then(resolve, reject);
    },
  };
  return builder;
}
mock.module('@supabase/supabase-js', {
  namedExports: { createClient: () => ({ from: (table) => makeQuery(table) }) },
});

// Google Calendar. `calendarEvents` is what events.list returns, so a test can
// stage an existing booking; `listShouldFail` simulates an outage.
const calendarState = { events: [], listShouldFail: false };
mock.module('googleapis', {
  namedExports: {
    google: {
      auth: { GoogleAuth: class { async getClient() { return {}; } } },
      calendar: () => ({
        events: {
          insert: async ({ resource }) => ({
            data: { id: 'cal_evt_1', htmlLink: 'https://example.test', start: resource.start, end: resource.end },
          }),
          list: async () => {
            if (calendarState.listShouldFail) throw new Error('calendar unreachable');
            return { data: { items: calendarState.events } };
          },
        },
      }),
    },
  },
});

class MockResend {
  constructor() { this.emails = { send: async () => ({ data: { id: 'mock' }, error: null }) }; }
}
mock.module('resend', { namedExports: { Resend: MockResend } });
mock.module('stripe', { defaultExport: class { constructor() { this.webhooks = {}; } } });

// ---------- Imports AFTER mocks ----------
const {
  overlapsFlexSpaceHours,
  startsInFlexSpaceHours,
  isFlexSpaceDay,
  FLEX_SPACE_START_MINUTES,
  FLEX_SPACE_END_MINUTES,
} = await import('../app/lib/flex-space-hours.js');
const { findFlexSpaceViolations } = await import('../app/lib/booking-guards.js');
const { promoCodeAllowsDaytime, __resetPromoWarning } = await import('../app/lib/promo-codes.js');
const { calculateAccuratePricing } = await import('../app/lib/booking-pricing.js');
const { buildStaffAttentionFlags } = await import('../app/lib/calendar-flags.js');
const { __resetRateLimits } = await import('../app/lib/rate-limit.js');
const { POST: postBookingRequest } = await import('../app/api/booking-request/route.js');

// ---------- Date helpers ----------
// Fixed weekday/weekend anchors, so these tests don't drift with the calendar.
// 2026-09-01 is a Tuesday, 2026-09-05 a Saturday, 2026-09-06 a Sunday.
const TUESDAY = '2026-09-01';
const SATURDAY = '2026-09-05';
const SUNDAY = '2026-09-06';

// A weekday far enough out to clear the "no past bookings" refine, for the
// route-level tests which validate against the real clock.
function futureWeekday(hint = 30) {
  const d = new Date();
  d.setDate(d.getDate() + hint);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function futureSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ---------- 1. Window math ----------

test('the window is 8:00 AM to 4:00 PM', () => {
  assert.equal(FLEX_SPACE_START_MINUTES, 8 * 60);
  assert.equal(FLEX_SPACE_END_MINUTES, 16 * 60);
});

test('a weekday booking inside the window overlaps it', () => {
  assert.equal(overlapsFlexSpaceHours(TUESDAY, '10:00 AM', 2), true);
  assert.equal(overlapsFlexSpaceHours(TUESDAY, '8:00 AM', 1), true);
  assert.equal(overlapsFlexSpaceHours(TUESDAY, '3:00 PM', 0.5), true);
});

test('a booking that merely REACHES INTO the window overlaps it', () => {
  // The rule is about the event running while people are working next door,
  // so an early start or a long afternoon counts — checking the start time
  // alone would let a 7 AM booking run until noon.
  assert.equal(overlapsFlexSpaceHours(TUESDAY, '7:00 AM', 3), true, 'runs to 10 AM');
  assert.equal(overlapsFlexSpaceHours(TUESDAY, '2:00 PM', 6), true, 'starts inside, runs to 8 PM');
});

test('the 8 AM and 4 PM handoffs stay bookable', () => {
  // Half-open intervals. These two cases are the whole point of the boundary:
  // a morning booking that is packed up by 8, and an evening booking that
  // starts as the workspace day ends, are both exactly what we want.
  assert.equal(overlapsFlexSpaceHours(TUESDAY, '6:00 AM', 2), false, 'ends exactly at 8:00 AM');
  assert.equal(overlapsFlexSpaceHours(TUESDAY, '4:00 PM', 4), false, 'starts exactly at 4:00 PM');
});

test('weekends are never restricted', () => {
  // The workspace next door is a weekday operation, and Saturday daytime is
  // premium-rate venue time we very much do sell.
  assert.equal(isFlexSpaceDay(SATURDAY), false);
  assert.equal(isFlexSpaceDay(SUNDAY), false);
  assert.equal(overlapsFlexSpaceHours(SATURDAY, '10:00 AM', 6), false);
  assert.equal(overlapsFlexSpaceHours(SUNDAY, '10:00 AM', 6), false);
});

test('every weekday is restricted', () => {
  // 2026-08-31 Mon through 2026-09-04 Fri.
  for (const date of ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']) {
    assert.equal(isFlexSpaceDay(date), true, `${date} should be a workspace day`);
  }
});

test('startsInFlexSpaceHours gates the picker before a duration is chosen', () => {
  assert.equal(startsInFlexSpaceHours(TUESDAY, '8:00 AM'), true);
  assert.equal(startsInFlexSpaceHours(TUESDAY, '3:00 PM'), true);
  assert.equal(startsInFlexSpaceHours(TUESDAY, '4:00 PM'), false);
  assert.equal(startsInFlexSpaceHours(TUESDAY, '7:00 AM'), false);
  assert.equal(startsInFlexSpaceHours(SATURDAY, '10:00 AM'), false);
});

test('unparseable input never reads as "allowed" by accident', () => {
  assert.equal(overlapsFlexSpaceHours(TUESDAY, 'lunchtime', 2), false);
  assert.equal(overlapsFlexSpaceHours('not-a-date', '10:00 AM', 2), false);
  assert.equal(overlapsFlexSpaceHours(TUESDAY, '10:00 AM', 0), false);
});

// ---------- 2. Which codes unlock the window ----------

test('every configured promo code unlocks daytime', () => {
  // All four are issued by hand, so anyone holding one has already talked to
  // us about what they're hosting.
  for (const env of ['PROMO_CODE_PARTNER', 'PROMO_CODE_COMP', 'PROMO_CODE_SPONSOR', 'PROMO_CODE_DAYTIME']) {
    assert.equal(promoCodeAllowsDaytime(process.env[env]), true, `${env} should unlock daytime`);
  }
});

test('an unknown or empty code does not unlock daytime', () => {
  for (const code of ['', '   ', 'NOT-A-REAL-CODE', 'constructor', '__proto__', 'toString', null, undefined, 42]) {
    assert.equal(promoCodeAllowsDaytime(code), false, `${String(code)} must not unlock daytime`);
  }
});

test('an UNSET daytime code fails closed', () => {
  // The whole point of reading codes from the environment is that a missing
  // variable means "this role has no code", never "everything validates".
  const saved = process.env.PROMO_CODE_DAYTIME;
  delete process.env.PROMO_CODE_DAYTIME;
  __resetPromoWarning();
  try {
    assert.equal(promoCodeAllowsDaytime(''), false);
    assert.equal(promoCodeAllowsDaytime(saved), false, 'the old code stops working once unset');
    // The other codes are unaffected — one unset role doesn't disarm the rest.
    assert.equal(promoCodeAllowsDaytime(process.env.PROMO_CODE_PARTNER), true);
  } finally {
    process.env.PROMO_CODE_DAYTIME = saved;
    __resetPromoWarning();
  }
});

// ---------- 3. The guard used by the intake route ----------

test('findFlexSpaceViolations reports daytime bookings made without a code', () => {
  const bookings = [{ eventName: 'Loud Party', selectedDate: TUESDAY, selectedTime: '11:00 AM', hoursRequested: 3 }];
  const violations = findFlexSpaceViolations(bookings, '');
  assert.equal(violations.length, 1);
  assert.equal(violations[0].eventName, 'Loud Party');
});

test('findFlexSpaceViolations clears the same bookings once a code is applied', () => {
  const bookings = [{ eventName: 'Morning Yoga', selectedDate: TUESDAY, selectedTime: '11:00 AM', hoursRequested: 3 }];
  for (const env of ['PROMO_CODE_DAYTIME', 'PROMO_CODE_PARTNER', 'PROMO_CODE_COMP', 'PROMO_CODE_SPONSOR']) {
    assert.equal(findFlexSpaceViolations(bookings, process.env[env]).length, 0, `${env} should clear it`);
  }
});

test('findFlexSpaceViolations flags only the offending booking in a multi-event application', () => {
  const bookings = [
    { eventName: 'Evening One', selectedDate: TUESDAY, selectedTime: '6:00 PM', hoursRequested: 2 },
    { eventName: 'Daytime One', selectedDate: TUESDAY, selectedTime: '9:00 AM', hoursRequested: 2 },
    { eventName: 'Saturday One', selectedDate: SATURDAY, selectedTime: '9:00 AM', hoursRequested: 2 },
  ];
  const violations = findFlexSpaceViolations(bookings, '');
  assert.deepEqual(violations.map((v) => v.eventName), ['Daytime One']);
});

// ---------- 4. Enforced at intake, not just in the form ----------

function buildSubmission({ date, time, hours = 2, promoCode = '' }) {
  return {
    applicationType: 'single',
    bookings: [{
      id: 1,
      eventName: 'Daytime Test Event',
      eventType: 'wellness',
      eventVisibility: 'private',
      selectedDate: date,
      selectedTime: time,
      hoursRequested: hours,
      specialRequests: '',
      needsTables: false,
      needsChairs: false,
      needsMat: false,
      needsDividerRemoval: false,
      expectedAttendees: 20,
    }],
    contactInfo: {
      contactName: 'Test Renter',
      email: 'renter@example.com',
      phone: '7203579499',
      homeAddress: '123 Test Street, Denver, CO 80211',
      businessName: '',
      websiteUrl: '',
      isRecurring: false,
      recurringDetails: '',
      paymentMethod: 'card',
      isFirstEvent: false,
      wantsOnsiteAssistance: false,
      hasAlcohol: false,
    },
    pricing: {
      totalHours: hours, totalBookings: 1, baseAmount: 190, subtotal: 190, total: 190,
      promoCode,
    },
    idPhoto: {
      dataUrl: 'data:image/png;base64,aGVsbG8=',
      name: 'id.png', type: 'image/png', size: 1024,
    },
  };
}

function request(body) {
  return new Request('https://merrittwellness.net/api/booking-request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function reset() {
  __resetRateLimits();
  dbInserts.length = 0;
  calendarState.events = [];
  calendarState.listShouldFail = false;
}

test('the route REJECTS a weekday daytime booking with no code', async () => {
  // The form greys these slots out, but the form is not the gate: a stale tab
  // or a direct POST has to hit the same wall.
  reset();
  const response = await postBookingRequest(request(buildSubmission({ date: futureWeekday(), time: '11:00 AM' })));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, 'FLEX_SPACE_HOURS_RESTRICTED');
  assert.match(body.details, /Merritt Workspace/);
  // Nothing was written — a rejected booking must leave no row behind.
  assert.equal(dbInserts.length, 0);
});

test('the route ACCEPTS the same daytime booking when the code is supplied', async () => {
  reset();
  const response = await postBookingRequest(request(buildSubmission({
    date: futureWeekday(), time: '11:00 AM', promoCode: process.env.PROMO_CODE_DAYTIME,
  })));
  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
  assert.equal(dbInserts.length, 1);
  assert.equal(dbInserts[0].promo_code, process.env.PROMO_CODE_DAYTIME);
});

test('the route accepts a weekday EVENING booking with no code', async () => {
  reset();
  const response = await postBookingRequest(request(buildSubmission({ date: futureWeekday(), time: '6:00 PM' })));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
});

test('the route accepts a SATURDAY daytime booking with no code', async () => {
  reset();
  const response = await postBookingRequest(request(buildSubmission({ date: futureSaturday(), time: '11:00 AM' })));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
});

test('the route rejects a booking that STARTS before 8 AM and runs into the window', async () => {
  // The check that matters most, and the one a start-time-only rule misses.
  reset();
  const response = await postBookingRequest(request(buildSubmission({
    date: futureWeekday(), time: '7:00 AM', hours: 4,
  })));
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, 'FLEX_SPACE_HOURS_RESTRICTED');
});

// ---------- 5. What the code does to price and to staff visibility ----------

test('the daytime code comps staff coverage but still bills venue time', () => {
  const contactInfo = { isFirstEvent: true, paymentMethod: 'card', isRecurring: false };
  const bookings = [{ selectedDate: TUESDAY, selectedTime: '10:00 AM', hoursRequested: 2, expectedAttendees: 20 }];

  const withCode = calculateAccuratePricing(bookings, contactInfo, process.env.PROMO_CODE_DAYTIME);
  const withoutCode = calculateAccuratePricing(bookings, contactInfo, '');

  // The $35 first-hour onboarding is charged on a first event... unless comped.
  assert.ok(withoutCode.onsiteAssistanceFee > 0, 'control: first event is normally charged');
  assert.equal(withCode.onsiteAssistanceFee, 0);
  // Venue time is NOT discounted — this code buys access, not a price cut.
  assert.equal(withCode.baseAmount, withoutCode.baseAmount);
  assert.ok(withCode.baseAmount > 0);
});

test('the daytime code comps the Facility Host on a 40+ attendee event', () => {
  const contactInfo = { isFirstEvent: false, paymentMethod: 'card', isRecurring: false };
  const bookings = [{ selectedDate: TUESDAY, selectedTime: '10:00 AM', hoursRequested: 4, expectedAttendees: 60 }];

  const withoutCode = calculateAccuratePricing(bookings, contactInfo, '');
  assert.ok(withoutCode.eventSupervisionFee > 0, 'control: 60 guests normally requires a paid host');

  const withCode = calculateAccuratePricing(bookings, contactInfo, process.env.PROMO_CODE_DAYTIME);
  assert.equal(withCode.eventSupervisionFee, 0);
});

test('a zero-discount code is still RECORDED when the extended discount wins', () => {
  // Regression: the automatic 8+ hour discount used to clear the promo code
  // whenever it beat it on price. A code that discounts nothing always loses
  // that comparison — and clearing it would erase the only record of why this
  // booking was allowed into workspace hours, from the row, the calendar badge
  // and the staff email alike.
  const contactInfo = { isFirstEvent: false, paymentMethod: 'card', isRecurring: false };
  const bookings = [{ selectedDate: TUESDAY, selectedTime: '10:00 AM', hoursRequested: 9, expectedAttendees: 20 }];

  const pricing = calculateAccuratePricing(bookings, contactInfo, process.env.PROMO_CODE_DAYTIME);
  assert.ok(pricing.extendedDiscountApplied, 'the extended discount should win on price');
  assert.equal(pricing.promoCode, process.env.PROMO_CODE_DAYTIME, 'but the code must survive');
});

test('a DISCOUNT code still clears when the extended discount beats it', () => {
  // The other half of that rule: a code that lost purely on price is not
  // "applied", and must not be reported as though it were.
  const contactInfo = { isFirstEvent: false, paymentMethod: 'card', isRecurring: false };
  const bookings = [{ selectedDate: TUESDAY, selectedTime: '6:00 PM', hoursRequested: 9, expectedAttendees: 20 }];
  const pricing = calculateAccuratePricing(bookings, contactInfo, process.env.PROMO_CODE_PARTNER);
  if (pricing.extendedDiscountApplied) {
    assert.equal(pricing.promoCode, '');
  }
});

test('comped coverage still shows on the calendar for staff', () => {
  // Every other staff badge keys off a persisted dollar amount, so comping the
  // FEES silently removed the badge: a 60-person daytime event arrived with no
  // supervision flag at all. The staffing was free, not unnecessary.
  const flags = buildStaffAttentionFlags({
    promo_code: process.env.PROMO_CODE_DAYTIME,
    event_date: TUESDAY,
    event_time: '10:00 AM',
    hours_requested: 4,
    expected_attendees: 60,
    event_supervision_fee: 0,
    onsite_assistance_fee: 0,
  });
  const tags = flags.map((f) => f.tag).join(' ');
  assert.match(tags, /SUPERVISION/, 'supervision is still required, just comped');
  assert.match(tags, /WORKSPACE HOURS/, 'on-site staff must know the workspace is at work');
});

test('an evening booking gets no workspace-hours badge', () => {
  const flags = buildStaffAttentionFlags({
    event_date: TUESDAY, event_time: '6:00 PM', hours_requested: 3, expected_attendees: 20,
  });
  assert.doesNotMatch(flags.map((f) => f.tag).join(' '), /WORKSPACE HOURS/);
});
