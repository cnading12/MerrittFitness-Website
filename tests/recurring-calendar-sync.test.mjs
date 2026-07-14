// Guards against the "recurring events never appear on the calendar" bug.
//
// What happened: one-time and sponsored bookings create their Google Calendar
// event through booking-fulfillment.js, but the recurring path (subscription
// finalize + webhook safety net + monthly cron) never created ANY calendar
// events. Recurring renters' slots were invisible to staff and — worse — to
// the availability picker and the conflict check, so other clients could
// book right on top of them.
//
// The fix this file locks in:
//   - syncRecurringCalendarEvents expands the booking's recurring pattern and
//     books every occurrence from today through a rolling 3-month horizon
//     (same window the pre-submit conflict check clears).
//   - Every occurrence uses a DETERMINISTIC Google event id, so route/webhook
//     races, retries, and monthly re-syncs never duplicate events (Google's
//     409 on an existing id is counted as "already on the calendar").
//   - Renter-recorded exceptions (skip / reschedule) are honored — a skipped
//     week is never booked, a moved week is booked on its new date.
//   - All three recurring entry points actually call the sync.
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'cal_test@group.calendar.google.com';
process.env.GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || 'test@example.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ||
  '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----';

// ---------- Mock Google Calendar (googleapis) ----------
// Records every insert. Tests can queue scripted errors (e.g. a 409 for an
// existing event id) via `scriptedInsertErrors`; when the queue is empty,
// every insert succeeds.
const calendarInserts = [];
const scriptedInsertErrors = [];
mock.module('googleapis', {
  namedExports: {
    google: {
      auth: {
        GoogleAuth: class {
          constructor() {}
          async getClient() { return {}; }
        },
      },
      calendar: () => ({
        events: {
          insert: async ({ resource }) => {
            if (scriptedInsertErrors.length > 0) {
              const err = scriptedInsertErrors.shift();
              if (err) throw err;
            }
            calendarInserts.push(resource);
            return {
              data: {
                id: resource.id || `cal_event_${calendarInserts.length}`,
                htmlLink: `https://calendar.google.com/event?eid=${calendarInserts.length}`,
                start: resource.start,
                end: resource.end,
              },
            };
          },
        },
      }),
    },
  },
});

const { syncRecurringCalendarEvents, recurringOccurrenceEventId, RECURRING_CALENDAR_HORIZON_MONTHS } =
  await import('../app/lib/recurring-calendar.js');

// Fixed "now": 2026-07-01 12:00 in Denver. The 3-month horizon is then
// July, August, September 2026.
const NOW = new Date('2026-07-01T18:00:00Z');

const baseBooking = {
  id: '3f2b8c1d-9e4a-4f6b-8a2c-1d5e7f9a0b3c',
  event_name: 'Morning Yoga Series',
  event_type: 'Yoga class',
  contact_name: 'Jordan Renter',
  email: 'jordan@example.com',
  phone: '555-0100',
  event_time: '6:00 PM',
  payment_method: 'ach',
  status: 'recurring_active',
  // Weekly Wednesdays 6:00 PM for 2h, started June 3rd 2026.
  recurring_details: {
    startDate: '2026-06-03',
    endDate: null,
    slots: [{ dayOfWeek: 3, startTime: '6:00 PM', durationHours: 2, frequency: 'weekly' }],
    exceptions: [],
  },
};

function resetMocks() {
  calendarInserts.length = 0;
  scriptedInsertErrors.length = 0;
}

// ---------- Deterministic event ids ----------

test('recurringOccurrenceEventId produces a valid base32hex Google event id', () => {
  const id = recurringOccurrenceEventId(baseBooking.id, '2026-07-01', 0);
  // Google requires [a-v0-9], 5-1024 chars, lowercase.
  assert.match(id, /^[a-v0-9]{5,1024}$/);
  // Deterministic: same inputs, same id.
  assert.equal(id, recurringOccurrenceEventId(baseBooking.id, '2026-07-01', 0));
  // Distinct dates and slots get distinct ids.
  assert.notEqual(id, recurringOccurrenceEventId(baseBooking.id, '2026-07-08', 0));
  assert.notEqual(id, recurringOccurrenceEventId(baseBooking.id, '2026-07-01', 1));
});

// ---------- Horizon expansion ----------

test('books every occurrence from today through the 3-month horizon', async () => {
  resetMocks();
  const summary = await syncRecurringCalendarEvents(baseBooking, { now: NOW });

  // Wednesdays: July 2026 has 5 (1,8,15,22,29), August 4, September 5 = 14.
  assert.equal(RECURRING_CALENDAR_HORIZON_MONTHS, 3);
  assert.equal(summary.created, 14);
  assert.equal(summary.failed, 0);
  assert.equal(calendarInserts.length, 14);

  const dates = calendarInserts.map((e) => e.start.dateTime.slice(0, 10));
  // Starts TODAY (July 1 is a Wednesday), not in the past (June occurrences
  // are billing history, not calendar inventory).
  assert.equal(dates[0], '2026-07-01');
  assert.ok(dates.every((d) => d >= '2026-07-01'));
  assert.ok(dates.includes('2026-09-30'));
  assert.ok(!dates.some((d) => d.startsWith('2026-06')));
  assert.ok(!dates.some((d) => d.startsWith('2026-10')));

  // Every event carries its deterministic id and blocks the slot.
  for (const event of calendarInserts) {
    const date = event.start.dateTime.slice(0, 10);
    assert.equal(event.id, recurringOccurrenceEventId(baseBooking.id, date, 0));
    assert.equal(event.transparency, 'opaque');
    assert.match(event.summary, /\(recurring\)/);
    assert.match(event.summary, /Morning Yoga Series/);
    assert.match(event.description, /Recurring schedule: Every Wednesday 6:00 PM/);
    assert.match(event.description, /billed monthly/i);
    // 6:00 PM + 2h in Denver.
    assert.match(event.start.dateTime, /T18:00:00$/);
    assert.match(event.end.dateTime, /T20:00:00$/);
    assert.equal(event.start.timeZone, 'America/Denver');
  }
});

test('a future startDate books from the startDate, clipped to endDate', async () => {
  resetMocks();
  const booking = {
    ...baseBooking,
    recurring_details: {
      ...baseBooking.recurring_details,
      startDate: '2026-07-15',
      endDate: '2026-07-31',
    },
  };
  const summary = await syncRecurringCalendarEvents(booking, { now: NOW });
  assert.equal(summary.created, 3); // July 15, 22, 29 only
  const dates = calendarInserts.map((e) => e.start.dateTime.slice(0, 10));
  assert.deepEqual(dates, ['2026-07-15', '2026-07-22', '2026-07-29']);
});

// ---------- Exceptions ----------

test('honors skip and reschedule exceptions from the conflict-resolution step', async () => {
  resetMocks();
  const booking = {
    ...baseBooking,
    recurring_details: {
      ...baseBooking.recurring_details,
      endDate: '2026-07-31',
      exceptions: [
        { date: '2026-07-08', slotIdx: 0, action: 'skip' },
        { date: '2026-07-15', slotIdx: 0, action: 'reschedule', newDate: '2026-07-16', newStartTime: '7:00 PM' },
      ],
    },
  };
  const summary = await syncRecurringCalendarEvents(booking, { now: NOW });
  assert.equal(summary.created, 4); // 5 July Wednesdays - 1 skipped, 1 moved
  const dates = calendarInserts.map((e) => e.start.dateTime.slice(0, 10));
  assert.ok(!dates.includes('2026-07-08'), 'skipped week must NOT be booked');
  assert.ok(!dates.includes('2026-07-15'), 'original date of a moved week must NOT be booked');
  assert.ok(dates.includes('2026-07-16'), 'rescheduled week is booked on its new date');
  const moved = calendarInserts.find((e) => e.start.dateTime.startsWith('2026-07-16'));
  assert.match(moved.start.dateTime, /T19:00:00$/); // moved to 7:00 PM
});

// ---------- Idempotency ----------

test('Google 409 (event id already exists) counts as alreadyExists, not a failure', async () => {
  resetMocks();
  const booking = {
    ...baseBooking,
    recurring_details: { ...baseBooking.recurring_details, endDate: '2026-07-31' },
  };
  // First two inserts collide with events created by a previous sync.
  const conflict = Object.assign(new Error('The requested identifier already belongs to another event.'), { code: 409 });
  scriptedInsertErrors.push(conflict, conflict);

  const summary = await syncRecurringCalendarEvents(booking, { now: NOW });
  assert.equal(summary.alreadyExists, 2);
  assert.equal(summary.created, 3);
  assert.equal(summary.failed, 0);
});

test('a non-409 Google failure is recorded but never thrown, and later events still book', async () => {
  resetMocks();
  const booking = {
    ...baseBooking,
    recurring_details: { ...baseBooking.recurring_details, endDate: '2026-07-31' },
  };
  scriptedInsertErrors.push(Object.assign(new Error('backend error'), { code: 500 }));

  const summary = await syncRecurringCalendarEvents(booking, { now: NOW });
  assert.equal(summary.failed, 1);
  assert.equal(summary.created, 4);
  assert.equal(summary.errors.length, 1);
});

// ---------- Tolerant input handling ----------

test('recurring_details persisted as a JSON string (intake shape) still syncs', async () => {
  resetMocks();
  const booking = {
    ...baseBooking,
    recurring_details: JSON.stringify({ ...baseBooking.recurring_details, endDate: '2026-07-31' }),
  };
  const summary = await syncRecurringCalendarEvents(booking, { now: NOW });
  assert.equal(summary.created, 5);
});

test('missing or slot-less recurring_details is a safe no-op', async () => {
  resetMocks();
  const noDetails = await syncRecurringCalendarEvents({ ...baseBooking, recurring_details: null }, { now: NOW });
  assert.equal(noDetails.created, 0);
  assert.ok(noDetails.skippedReason);

  const noSlots = await syncRecurringCalendarEvents(
    { ...baseBooking, recurring_details: { startDate: '2026-06-03', slots: [] } },
    { now: NOW },
  );
  assert.equal(noSlots.created, 0);
  assert.ok(noSlots.skippedReason);
  assert.equal(calendarInserts.length, 0);
});

// ---------- Wiring: every recurring entry point runs the sync ----------
// Source-level assertions in the same spirit as the maxDuration checks in
// client-email-delivery.test.mjs: the sync only fixes the bug if the
// finalize route, the webhook safety net, AND the monthly cron all call it.

const WIRED_FILES = [
  'app/api/payment/create-recurring-subscription/route.js',
  'app/api/webhooks/stripe/route.js',
  'app/lib/monthly-billing.js',
];

for (const file of WIRED_FILES) {
  test(`${file} calls syncRecurringCalendarEvents`, () => {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(source, /syncRecurringCalendarEvents\s*\(/, `${file} must invoke the recurring calendar sync`);
  });
}
