// Double-booking guards.
//
// The venue can host exactly one event at a time, and until this guard existed
// nothing in the request path enforced that. The booking form greyed out taken
// slots and /api/booking-request never re-checked, so every one of these wrote
// straight through to a booking the venue could not honor:
//
//   * a tab left open while someone else booked the slot;
//   * two renters submitting the same evening seconds apart;
//   * a POST that never went through the form at all;
//   * and — the quiet one — a booking whose START was free but whose DURATION
//     ran through an existing reservation. Availability was computed on start
//     times alone, so with 6–8 PM booked, a 5 PM start for 3 hours was offered
//     by the form, accepted by the API, and written to the calendar.
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
process.env.PROMO_CODE_DAYTIME = 'TEST-DAYTIME-6Q2WVK8B';

// ---------- Mocks ----------
const dbInserts = [];
function makeQuery(table) {
  const ctx = { op: null, payload: null };
  const builder = {
    select() { if (!ctx.op) ctx.op = 'select'; return builder; },
    insert(payload) { ctx.op = 'insert'; ctx.payload = Array.isArray(payload) ? payload : [payload]; return builder; },
    update() { ctx.op = 'update'; return builder; },
    eq() { return builder; }, neq() { return builder; }, in() { return builder; },
    order() { return builder; }, limit() { return builder; },
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
mock.module('resend', {
  namedExports: { Resend: class { constructor() { this.emails = { send: async () => ({ data: { id: 'm' }, error: null }) }; } } },
});
mock.module('stripe', { defaultExport: class { constructor() { this.webhooks = {}; } } });

// ---------- Imports AFTER mocks ----------
const { findConflict, slotAvailability, rangesOverlap, minutesToTime } =
  await import('../app/lib/availability.js');
const { findCalendarConflicts, findSelfOverlaps, describeConflict } =
  await import('../app/lib/booking-guards.js');
const { __resetRateLimits } = await import('../app/lib/rate-limit.js');
const { POST: postBookingRequest } = await import('../app/api/booking-request/route.js');

// ---------- Helpers ----------
// A weekday EVENING date, so these tests exercise the conflict guard and not
// the weekday-daytime restriction (tests/flex-space-hours.test.mjs owns that).
function futureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

// Stage an existing Google Calendar event on `date` between two 24-hour times.
function stageBusy(date, startHour, endHour) {
  const pad = (n) => String(n).padStart(2, '0');
  calendarState.events.push({
    summary: '🔒 BOOKED: Someone Else\'s Private Wedding',
    start: { dateTime: `${date}T${pad(startHour)}:00:00-06:00` },
    end: { dateTime: `${date}T${pad(endHour)}:00:00-06:00` },
  });
}

function buildSubmission(bookingSpecs) {
  return {
    applicationType: 'single',
    bookings: bookingSpecs.map((spec, i) => ({
      id: i + 1,
      eventName: spec.eventName || `Event ${i + 1}`,
      eventType: 'wellness',
      eventVisibility: 'private',
      selectedDate: spec.date,
      selectedTime: spec.time,
      hoursRequested: spec.hours,
      specialRequests: '',
      needsTables: false, needsChairs: false, needsMat: false, needsDividerRemoval: false,
      expectedAttendees: 20,
    })),
    contactInfo: {
      contactName: 'Test Renter', email: 'renter@example.com', phone: '7203579499',
      homeAddress: '123 Test Street, Denver, CO 80211', businessName: '', websiteUrl: '',
      isRecurring: false, recurringDetails: '', paymentMethod: 'card',
      isFirstEvent: false, wantsOnsiteAssistance: false, hasAlcohol: false,
    },
    pricing: { totalHours: 2, totalBookings: bookingSpecs.length, baseAmount: 190, subtotal: 190, total: 190, promoCode: '' },
    idPhoto: { dataUrl: 'data:image/png;base64,aGVsbG8=', name: 'id.png', type: 'image/png', size: 1024 },
  };
}

function request(body) {
  return new Request('https://merrittwellness.net/api/booking-request', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

function reset() {
  __resetRateLimits();
  dbInserts.length = 0;
  calendarState.events = [];
  calendarState.listShouldFail = false;
}

// ---------- 1. Interval math ----------

test('overlap is half-open, so back-to-back bookings do not collide', () => {
  // Stacking bookings end to end is deliberate — it's why the venue requires
  // setup and breakdown to happen inside the booked window.
  assert.equal(rangesOverlap(14 * 60, 16 * 60, 16 * 60, 18 * 60), false);
  assert.equal(rangesOverlap(16 * 60, 18 * 60, 14 * 60, 16 * 60), false);
  assert.equal(rangesOverlap(14 * 60, 17 * 60, 16 * 60, 18 * 60), true);
});

test('findConflict catches a booking that RUNS INTO a later reservation', () => {
  // The original bug, in one assertion: 6–8 PM booked, a 5 PM start is free,
  // and a 3-hour duration is not.
  const busy = [{ startMinutes: 18 * 60, endMinutes: 20 * 60 }];
  assert.equal(findConflict(busy, '5:00 PM', 1), null, '5–6 PM fits');
  assert.ok(findConflict(busy, '5:00 PM', 3), '5–8 PM does not');
});

test('findConflict catches a booking that ENGULFS a reservation', () => {
  const busy = [{ startMinutes: 18 * 60, endMinutes: 19 * 60 }];
  assert.ok(findConflict(busy, '4:00 PM', 6), 'a long booking swallowing a short one still conflicts');
});

test('slotAvailability narrows as the requested duration grows', () => {
  const busy = [{ startMinutes: 18 * 60, endMinutes: 20 * 60 }]; // 6–8 PM
  const shortBooking = slotAvailability(busy, { durationHours: 1 });
  const longBooking = slotAvailability(busy, { durationHours: 3 });

  assert.equal(shortBooking['5:00 PM'], true, '5–6 PM fits');
  assert.equal(longBooking['5:00 PM'], false, '5–8 PM does not');
  // Both agree the booked hours themselves are gone.
  assert.equal(shortBooking['6:00 PM'], false);
  assert.equal(longBooking['6:00 PM'], false);
});

// ---------- 2. The guards ----------

test('findCalendarConflicts never leaks the other event\'s name', () => {
  // This response reaches an anonymous caller. Calendar titles read
  // "🔒 BOOKED: <event name>", so echoing them would turn the booking form
  // into a way to harvest every private event at the venue.
  const date = '2026-09-01';
  const busy = [{ date, startMinutes: 600, endMinutes: 720, summary: '🔒 BOOKED: Private Wedding' }];
  const conflicts = findCalendarConflicts(
    [{ eventName: 'Mine', selectedDate: date, selectedTime: '10:00 AM', hoursRequested: 2 }], busy);

  assert.equal(conflicts.length, 1);
  assert.equal(JSON.stringify(conflicts).includes('Private Wedding'), false);
  assert.equal(describeConflict(conflicts[0]).includes('Wedding'), false);
  // It still tells the renter what they need: which window is taken.
  assert.match(describeConflict(conflicts[0]), /10:00 AM to 12:00 PM/);
});

test('findCalendarConflicts only compares bookings against their OWN date', () => {
  const busy = [{ date: '2026-09-01', startMinutes: 600, endMinutes: 720 }];
  const conflicts = findCalendarConflicts(
    [{ eventName: 'Different day', selectedDate: '2026-09-02', selectedTime: '10:00 AM', hoursRequested: 2 }], busy);
  assert.equal(conflicts.length, 0);
});

test('findSelfOverlaps catches two events in ONE application on the same hours', () => {
  // Neither exists on the calendar yet, so the calendar check cannot see this.
  const overlaps = findSelfOverlaps([
    { eventName: 'A', selectedDate: '2026-09-01', selectedTime: '2:00 PM', hoursRequested: 2 },
    { eventName: 'B', selectedDate: '2026-09-01', selectedTime: '3:00 PM', hoursRequested: 2 },
  ]);
  assert.equal(overlaps.length, 1);
  assert.equal(overlaps[0].first, 'A');
  assert.equal(overlaps[0].second, 'B');
});

test('findSelfOverlaps allows back-to-back and different-day bookings', () => {
  assert.equal(findSelfOverlaps([
    { eventName: 'A', selectedDate: '2026-09-01', selectedTime: '2:00 PM', hoursRequested: 2 },
    { eventName: 'B', selectedDate: '2026-09-01', selectedTime: '4:00 PM', hoursRequested: 2 },
  ]).length, 0, 'back-to-back is fine');

  assert.equal(findSelfOverlaps([
    { eventName: 'A', selectedDate: '2026-09-01', selectedTime: '2:00 PM', hoursRequested: 2 },
    { eventName: 'B', selectedDate: '2026-09-02', selectedTime: '2:00 PM', hoursRequested: 2 },
  ]).length, 0, 'different days are fine');
});

// ---------- 3. Enforced at intake ----------

test('the route REJECTS a booking that collides with an existing event', async () => {
  reset();
  const date = futureDate();
  stageBusy(date, 18, 20); // 6–8 PM taken

  const response = await postBookingRequest(request(buildSubmission([{ date, time: '6:00 PM', hours: 2 }])));
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, 'TIME_SLOT_CONFLICT');
  assert.equal(dbInserts.length, 0, 'a rejected booking must leave no row behind');
});

test('the route REJECTS a booking whose DURATION runs into an existing event', async () => {
  // The case the old start-time-only availability check waved straight through.
  reset();
  const date = futureDate();
  stageBusy(date, 18, 20); // 6–8 PM taken

  const response = await postBookingRequest(request(buildSubmission([{ date, time: '5:00 PM', hours: 3 }])));
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, 'TIME_SLOT_CONFLICT');
  assert.equal(dbInserts.length, 0);
});

test('the route ACCEPTS a booking that ends exactly when the next begins', async () => {
  reset();
  const date = futureDate();
  stageBusy(date, 18, 20); // 6–8 PM taken

  const response = await postBookingRequest(request(buildSubmission([{ date, time: '4:00 PM', hours: 2 }])));
  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
});

test('the route REJECTS two overlapping events inside one application', async () => {
  reset();
  const date = futureDate();
  const response = await postBookingRequest(request(buildSubmission([
    { eventName: 'First Half', date, time: '4:00 PM', hours: 3 },
    { eventName: 'Second Half', date, time: '6:00 PM', hours: 2 },
  ])));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, 'SELF_OVERLAP');
  assert.equal(dbInserts.length, 0);
});

test('the route FAILS CLOSED when the calendar is unreachable', async () => {
  // Deliberate trade. A calendar outage becomes a few renters told to retry;
  // accepting blind becomes two events on the same evening, discovered after
  // both have paid and planned.
  reset();
  calendarState.listShouldFail = true;

  const response = await postBookingRequest(request(buildSubmission([{ date: futureDate(), time: '6:00 PM', hours: 2 }])));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.code, 'CALENDAR_UNAVAILABLE');
  assert.equal(dbInserts.length, 0);
  // The renter is told plainly that nothing was taken from them.
  assert.match(body.details, /no payment has been collected/i);
});

test('a clear calendar still lets a normal booking through', async () => {
  // Guard against the guard: fail-closed must not mean fail-always.
  reset();
  const response = await postBookingRequest(request(buildSubmission([{ date: futureDate(), time: '6:00 PM', hours: 2 }])));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(dbInserts.length, 1);
});

test('minutesToTime renders windows the way renters read them', () => {
  assert.equal(minutesToTime(0), '12:00 AM');
  assert.equal(minutesToTime(12 * 60), '12:00 PM');
  assert.equal(minutesToTime(18 * 60 + 30), '6:30 PM');
});

// ---------- 4. The recurring path ----------

// A recurring application: one weekly slot, starting soon.
function buildRecurringSubmission({ startDate, dayOfWeek, startTime, durationHours = 2, exceptions = [] }) {
  return {
    applicationType: 'recurring',
    contactInfo: {
      contactName: 'Test Renter', email: 'renter@example.com', phone: '7203579499',
      homeAddress: '123 Test Street, Denver, CO 80211', businessName: '', websiteUrl: '',
      isRecurring: true, recurringDetails: '', paymentMethod: 'ach',
      isFirstEvent: false, wantsOnsiteAssistance: false, hasAlcohol: false,
    },
    recurringSchedule: {
      eventName: 'Weekly Series', eventType: 'wellness', eventVisibility: 'private',
      expectedAttendees: 20, startDate, endDate: null, paymentPreference: 'ach',
      specialRequests: '', needsMat: false,
      slots: [{ dayOfWeek, startTime, durationHours, frequency: 'weekly' }],
      exceptions,
    },
    pricing: {
      weeklyHours: durationHours, monthlyMinHours: 8, monthlyMaxHours: 10,
      monthlyMinCharge: 760, monthlyMaxCharge: 950, firstMonthHours: 8,
      firstMonthCharge: 760, firstMonthTotal: 760, hourlyRate: 95, paymentPreference: 'ach',
    },
    idPhoto: { dataUrl: 'data:image/png;base64,aGVsbG8=', name: 'id.png', type: 'image/png', size: 1024 },
  };
}

// The next occurrence of `dayOfWeek` at least `minDays` out.
function nextWeekdayDate(dayOfWeek, minDays = 14) {
  const d = new Date();
  d.setDate(d.getDate() + minDays);
  while (d.getDay() !== dayOfWeek) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

test('the route REJECTS a recurring series whose slot collides with an existing event', async () => {
  // The booking page walks the renter through /api/recurring-conflicts and
  // makes them skip or move every colliding date — but that scan ran in the
  // browser, possibly minutes ago, and nothing forces a submission to have run
  // it at all. Same check, applied where the row is actually written.
  reset();
  const THURSDAY = 4;
  const firstDate = nextWeekdayDate(THURSDAY);
  stageBusy(firstDate, 18, 20); // 6-8 PM taken on the very first occurrence

  const response = await postBookingRequest(request(buildRecurringSubmission({
    startDate: firstDate, dayOfWeek: THURSDAY, startTime: '6:00 PM',
  })));
  const body = await response.json();

  assert.equal(response.status, 409, JSON.stringify(body));
  assert.equal(body.code, 'RECURRING_CONFLICT');
  assert.equal(dbInserts.length, 0, 'a rejected series must leave no row behind');
  // Times and dates, never the other renter's event name.
  assert.equal(JSON.stringify(body).includes('Wedding'), false);
});

test('the route ACCEPTS a recurring series once the colliding date is skipped', async () => {
  // The renter resolved the conflict in the modal; the exception must carry
  // through to the server check exactly as it does in the pre-submit scan,
  // or resolving a conflict would be impossible.
  reset();
  const THURSDAY = 4;
  const firstDate = nextWeekdayDate(THURSDAY);
  stageBusy(firstDate, 18, 20);

  const response = await postBookingRequest(request(buildRecurringSubmission({
    startDate: firstDate, dayOfWeek: THURSDAY, startTime: '6:00 PM',
    exceptions: [{ date: firstDate, slotIdx: 0, action: 'skip', reason: 'calendar conflict' }],
  })));
  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
});

test('the route ACCEPTS a clear recurring series', async () => {
  reset();
  const THURSDAY = 4;
  const response = await postBookingRequest(request(buildRecurringSubmission({
    startDate: nextWeekdayDate(THURSDAY), dayOfWeek: THURSDAY, startTime: '6:00 PM',
  })));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
});

test('a recurring series FAILS CLOSED when the calendar is unreachable', async () => {
  reset();
  calendarState.listShouldFail = true;
  const THURSDAY = 4;

  const response = await postBookingRequest(request(buildRecurringSubmission({
    startDate: nextWeekdayDate(THURSDAY), dayOfWeek: THURSDAY, startTime: '6:00 PM',
  })));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.code, 'CALENDAR_UNAVAILABLE');
  assert.equal(dbInserts.length, 0);
});
