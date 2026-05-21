// Tests for the Stripe webhook payment-success handler when a renter pays for
// a multi-event ("multiple booking") group.
//
// Bug this guards against: previously the webhook only updated the single
// booking row whose id rode along in the Stripe metadata, leaving the other
// bookings stuck in pending_payment with no calendar event and no email. The
// renter saw the right charge but only received one confirmation and only one
// event appeared on the calendar.
//
// We mock every external dependency (Stripe, Supabase, Google Calendar, Resend)
// so the webhook can be invoked end-to-end without network calls.
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_dummy';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon_test';
process.env.GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'cal_test@group.calendar.google.com';
// calendar.js's getGoogleAuth() pre-validates that these env vars exist (and
// look like a PEM key) before we ever reach the mocked google.calendar() call,
// so provide credentials that pass its shape checks. The mocked GoogleAuth
// constructor below ignores them anyway.
process.env.GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || 'test@example.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ||
  '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----';

// ---------- Mock Supabase ----------
// Minimal chainable query builder so the webhook's `.from(...).update(...)...`
// and `.from(...).select(...)...` calls return what we want without us having
// to enumerate every chain ordering.
const dbState = {
  bookings: [],
  updates: [], // records every applied update {id, patch}
};

function makeQuery(table) {
  const ctx = {
    table,
    op: null,
    payload: null,
    filters: [],
    notFilters: [],
    orderBy: null,
    limit: null,
    single: false,
  };

  // Apply current op against dbState and return a Supabase-shaped response.
  function execute() {
    let rows = dbState[table].slice();

    for (const [col, val] of ctx.filters) {
      rows = rows.filter((r) => r[col] === val);
    }
    for (const [col, val] of ctx.notFilters) {
      rows = rows.filter((r) => r[col] !== val);
    }
    if (ctx.orderBy) {
      const { col, asc } = ctx.orderBy;
      rows = rows.slice().sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0));
      if (!asc) rows.reverse();
    }
    if (typeof ctx.limit === 'number') rows = rows.slice(0, ctx.limit);

    if (ctx.op === 'select') {
      if (ctx.single) {
        if (rows.length === 0) return Promise.resolve({ data: null, error: { message: 'not found' } });
        return Promise.resolve({ data: rows[0], error: null });
      }
      return Promise.resolve({ data: rows, error: null });
    }

    if (ctx.op === 'update') {
      const updated = [];
      for (const row of rows) {
        Object.assign(row, ctx.payload);
        dbState.updates.push({ id: row.id, patch: { ...ctx.payload } });
        updated.push({ ...row });
      }
      return Promise.resolve({ data: updated, error: null });
    }

    if (ctx.op === 'insert') {
      const inserted = [];
      for (const row of ctx.payload) {
        dbState[table].push(row);
        inserted.push({ ...row });
      }
      if (ctx.single) {
        return Promise.resolve({ data: inserted[0] || null, error: null });
      }
      return Promise.resolve({ data: inserted, error: null });
    }

    return Promise.resolve({ data: null, error: { message: `unhandled op ${ctx.op}` } });
  }

  const builder = {
    select() {
      if (!ctx.op) ctx.op = 'select';
      return builder;
    },
    insert(payload) {
      ctx.op = 'insert';
      ctx.payload = Array.isArray(payload) ? payload : [payload];
      return builder;
    },
    update(payload) {
      ctx.op = 'update';
      ctx.payload = payload;
      return builder;
    },
    eq(col, val) {
      ctx.filters.push([col, val]);
      return builder;
    },
    neq(col, val) {
      ctx.notFilters.push([col, val]);
      return builder;
    },
    in(col, vals) {
      ctx.filters.push([col, vals[0]]); // simplistic; only first arr value used in webhook
      return builder;
    },
    order(col, opts = {}) {
      ctx.orderBy = { col, asc: opts.ascending !== false };
      return builder;
    },
    limit(n) {
      ctx.limit = n;
      return builder;
    },
    single() {
      ctx.single = true;
      return execute();
    },
    then(resolve, reject) {
      return execute().then(resolve, reject);
    },
  };

  return builder;
}

const mockSupabase = {
  from: (table) => makeQuery(table),
};

mock.module('@supabase/supabase-js', {
  namedExports: {
    createClient: () => mockSupabase,
  },
});

// ---------- Mock Stripe ----------
// We don't want to actually verify a webhook signature, so we make
// constructEvent a pass-through that parses the raw body and returns it.
class MockStripe {
  constructor() {
    this.webhooks = {
      constructEvent: (body /*, signature, secret */) => JSON.parse(body),
    };
  }
}
mock.module('stripe', { defaultExport: MockStripe });

// ---------- Mock Google Calendar (googleapis) ----------
const calendarInserts = [];
mock.module('googleapis', {
  namedExports: {
    google: {
      auth: {
        GoogleAuth: class {
          constructor() {}
          async getClient() {
            return {};
          }
        },
      },
      calendar: () => ({
        events: {
          insert: async ({ resource }) => {
            calendarInserts.push(resource);
            return {
              data: {
                id: `cal_event_${calendarInserts.length}`,
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

// ---------- Mock Resend ----------
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

// ---------- Import the webhook AFTER mocks are registered ----------
const { POST } = await import('../app/api/webhooks/stripe/route.js');

// ---------- Helpers ----------
function resetState() {
  dbState.bookings.length = 0;
  dbState.updates.length = 0;
  calendarInserts.length = 0;
  sentEmails.length = 0;
}

function seedGroup({ masterId, dates, email = 'jane@example.com' }) {
  const rows = dates.map((date, idx) => ({
    id: `booking_${masterId}_${idx + 1}`,
    master_booking_id: masterId,
    event_name: `Workshop ${idx + 1}`,
    event_type: 'workshop',
    event_date: date,
    event_time: '6:00 PM',
    hours_requested: 2,
    contact_name: 'Jane Doe',
    email,
    phone: '555-1212',
    status: 'pending_payment',
    payment_intent_id: null,
    calendar_event_id: null,
    total_amount: 760,
    subtotal: 700,
  }));
  dbState.bookings.push(...rows);
  return rows;
}

async function postPaymentSucceeded({ seedBookingId, paymentIntentId = 'pi_test_123' }) {
  const event = {
    id: 'evt_test_1',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: paymentIntentId,
        amount: 76000,
        status: 'succeeded',
        metadata: { bookingId: seedBookingId },
      },
    },
  };

  const body = JSON.stringify(event);
  const request = new Request('https://example.com/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig_test' },
    body,
  });
  return POST(request);
}

// ---------- Tests ----------

test('multi-booking webhook: confirms every booking in the master group', async () => {
  resetState();
  seedGroup({
    masterId: 'master_A',
    dates: ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22'],
  });

  const response = await postPaymentSucceeded({ seedBookingId: 'booking_master_A_1' });
  assert.equal(response.status, 200);

  const confirmed = dbState.bookings.filter((b) => b.status === 'confirmed');
  assert.equal(
    confirmed.length,
    4,
    `expected all 4 bookings confirmed, got ${confirmed.length} (statuses: ${dbState.bookings.map((b) => b.status).join(', ')})`,
  );
  for (const b of confirmed) {
    assert.equal(b.payment_intent_id, 'pi_test_123');
    assert.ok(b.payment_confirmed_at, `booking ${b.id} missing payment_confirmed_at`);
  }
});

test('multi-booking webhook: creates a calendar event for EACH booking', async () => {
  resetState();
  seedGroup({
    masterId: 'master_B',
    dates: ['2026-07-01', '2026-07-08', '2026-07-15', '2026-07-22'],
  });

  await postPaymentSucceeded({ seedBookingId: 'booking_master_B_1' });

  assert.equal(
    calendarInserts.length,
    4,
    `expected 4 calendar inserts, got ${calendarInserts.length}`,
  );
  const dates = calendarInserts.map((e) => e.start.dateTime.slice(0, 10)).sort();
  assert.deepEqual(dates, ['2026-07-01', '2026-07-08', '2026-07-15', '2026-07-22']);

  // Every booking row should have a calendar_event_id persisted.
  const withEventId = dbState.bookings.filter((b) => b.calendar_event_id);
  assert.equal(withEventId.length, 4, 'every booking should record its calendar_event_id');
});

test('multi-booking webhook: sends customer + manager email per booking, onboarding once', async () => {
  resetState();
  seedGroup({
    masterId: 'master_C',
    dates: ['2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22'],
  });

  await postPaymentSucceeded({ seedBookingId: 'booking_master_C_1' });

  const subjects = sentEmails.map((e) => e.subject);
  const confirmations = subjects.filter((s) => /Booking Confirmed/i.test(s));
  const managerNotes = subjects.filter((s) => /New Booking/i.test(s));
  const onboarding = subjects.filter((s) => /Welcome to Merritt Wellness/i.test(s));

  assert.equal(
    confirmations.length,
    4,
    `expected 4 customer confirmations, got ${confirmations.length}: ${subjects.join(' | ')}`,
  );
  assert.equal(
    managerNotes.length,
    4,
    `expected 4 manager notifications, got ${managerNotes.length}: ${subjects.join(' | ')}`,
  );
  assert.equal(
    onboarding.length,
    1,
    `expected exactly 1 onboarding email (group-wide), got ${onboarding.length}`,
  );

  // Customer confirmations should each reference a different date so the
  // renter can tell which event is which in their inbox.
  const datesInSubjects = confirmations.map((s) => s.match(/\d{4}-\d{2}-\d{2}/)?.[0]).sort();
  assert.deepEqual(datesInSubjects, ['2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22']);
});

test('multi-booking webhook: is idempotent when Stripe retries the same event', async () => {
  resetState();
  seedGroup({
    masterId: 'master_D',
    dates: ['2026-09-01', '2026-09-08'],
  });

  await postPaymentSucceeded({ seedBookingId: 'booking_master_D_1' });
  const calendarCallsAfterFirst = calendarInserts.length;
  const emailsAfterFirst = sentEmails.length;
  assert.equal(calendarCallsAfterFirst, 2);
  assert.equal(emailsAfterFirst, 5); // 2 customer + 2 manager + 1 onboarding

  // Stripe redelivers the same payment_intent.succeeded — every booking is
  // already in `confirmed`, so confirmBooking should short-circuit and no new
  // calendar events or emails should fire.
  await postPaymentSucceeded({ seedBookingId: 'booking_master_D_1' });

  assert.equal(
    calendarInserts.length,
    calendarCallsAfterFirst,
    'retried webhook should not create duplicate calendar events',
  );
  assert.equal(
    sentEmails.length,
    emailsAfterFirst,
    'retried webhook should not re-send confirmation emails',
  );
});

test('multi-booking webhook: single-event booking (no master_booking_id) still works', async () => {
  resetState();
  dbState.bookings.push({
    id: 'booking_solo',
    master_booking_id: null,
    event_name: 'Solo Event',
    event_type: 'workshop',
    event_date: '2026-10-15',
    event_time: '6:00 PM',
    hours_requested: 2,
    contact_name: 'Solo Renter',
    email: 'solo@example.com',
    status: 'pending_payment',
    total_amount: 200,
  });

  const response = await postPaymentSucceeded({ seedBookingId: 'booking_solo' });
  assert.equal(response.status, 200);

  const updated = dbState.bookings.find((b) => b.id === 'booking_solo');
  assert.equal(updated.status, 'confirmed');
  assert.equal(calendarInserts.length, 1, 'one calendar event for solo booking');

  const subjects = sentEmails.map((e) => e.subject);
  assert.ok(subjects.some((s) => /Booking Confirmed/i.test(s)));
  assert.ok(subjects.some((s) => /New Booking/i.test(s)));
  assert.ok(subjects.some((s) => /Welcome to Merritt Wellness/i.test(s)));
});

test('multi-booking webhook: surviving a calendar failure does not block other bookings or emails', async () => {
  resetState();
  seedGroup({
    masterId: 'master_E',
    dates: ['2026-11-01', '2026-11-08', '2026-11-15'],
  });

  // Wire calendar mock to throw on the second insert only.
  let callCount = 0;
  const stubCalendar = () => ({
    events: {
      insert: async ({ resource }) => {
        callCount += 1;
        if (callCount === 2) {
          throw new Error('Google Calendar 500');
        }
        calendarInserts.push(resource);
        return {
          data: {
            id: `cal_event_recovered_${callCount}`,
            start: resource.start,
            end: resource.end,
          },
        };
      },
    },
  });
  const googleapisModule = await import('googleapis');
  const originalCalendar = googleapisModule.google.calendar;
  googleapisModule.google.calendar = stubCalendar;

  try {
    const response = await postPaymentSucceeded({ seedBookingId: 'booking_master_E_1' });
    assert.equal(response.status, 200);

    // All 3 bookings should still be confirmed even though one calendar call blew up.
    const confirmed = dbState.bookings.filter(
      (b) => b.master_booking_id === 'master_E' && b.status === 'confirmed',
    );
    assert.equal(confirmed.length, 3, 'all bookings confirmed despite calendar failure');

    // Emails go out for every booking regardless of calendar outcome.
    const subjects = sentEmails.map((e) => e.subject);
    assert.equal(subjects.filter((s) => /Booking Confirmed/i.test(s)).length, 3);
    assert.equal(subjects.filter((s) => /New Booking/i.test(s)).length, 3);
  } finally {
    googleapisModule.google.calendar = originalCalendar;
  }
});
