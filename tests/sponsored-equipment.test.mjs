// Regression tests: equipment selections (tables / chairs / full-floor mat)
// must survive the whole booking pipeline — DB insert, calendar event, and
// confirmation emails — for BOTH the sponsored (comped, no-Stripe) path and
// the paid (Stripe webhook) path.
//
// Bug this guards against: a renter booked with the sponsored promo code,
// selected tables + chairs + mat, and the calendar event / confirmation email
// showed "None requested" / "No" for all of them.
//
// The fully-comped code is COLESTEST (it took over the no-payment behavior
// that used to live on MerrittSponsor100, which now bills staffing).
//
// We mock every external dependency (Supabase, Google Calendar, Resend,
// Stripe) so both routes can be invoked end-to-end without network calls.
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
process.env.GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || 'test@example.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ||
  '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----';

// ---------- Mock Supabase ----------
// Same minimal chainable builder as webhook-multi-booking.test.mjs, plus a log
// of raw insert payloads so we can assert exactly which columns the route
// tried to persist.
const dbState = {
  bookings: [],
  updates: [],
  inserts: [], // every raw insert payload row, as passed by the route
  // Column names the simulated DB "doesn't have". Any insert that references
  // one fails with PostgREST's PGRST204 (schema-cache miss), exactly like a
  // production Supabase instance where a migration hasn't been run yet.
  missingColumns: new Set(),
};

function makeQuery(table) {
  const ctx = { table, op: null, payload: null, filters: [], notFilters: [], orderBy: null, limit: null, single: false };

  function execute() {
    let rows = (dbState[table] || []).slice();
    for (const [col, val] of ctx.filters) rows = rows.filter((r) => r[col] === val);
    for (const [col, val] of ctx.notFilters) rows = rows.filter((r) => r[col] !== val);
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
      // The missing-column emulation and the `inserts` attempt log exist to
      // assert what the route sends to the BOOKINGS table. Other tables (the
      // email_events delivery log) just accept rows so they don't pollute
      // those assertions.
      if (table === 'bookings') {
        // Emulate PostgREST: reject the whole insert if any payload key targets
        // a column the schema doesn't have (reported one column at a time).
        for (const row of ctx.payload) {
          const missing = Object.keys(row).find((k) => dbState.missingColumns.has(k));
          if (missing) {
            return Promise.resolve({
              data: null,
              error: {
                code: 'PGRST204',
                message: `Could not find the '${missing}' column of 'bookings' in the schema cache`,
              },
            });
          }
        }
      }
      const inserted = [];
      dbState[table] = dbState[table] || [];
      for (const row of ctx.payload) {
        if (table === 'bookings') dbState.inserts.push({ ...row });
        dbState[table].push(row);
        inserted.push({ ...row });
      }
      if (ctx.single) return Promise.resolve({ data: inserted[0] || null, error: null });
      return Promise.resolve({ data: inserted, error: null });
    }
    return Promise.resolve({ data: null, error: { message: `unhandled op ${ctx.op}` } });
  }

  const builder = {
    select() { if (!ctx.op) ctx.op = 'select'; return builder; },
    insert(payload) { ctx.op = 'insert'; ctx.payload = Array.isArray(payload) ? payload : [payload]; return builder; },
    update(payload) { ctx.op = 'update'; ctx.payload = payload; return builder; },
    eq(col, val) { ctx.filters.push([col, val]); return builder; },
    neq(col, val) { ctx.notFilters.push([col, val]); return builder; },
    in(col, vals) { ctx.filters.push([col, vals[0]]); return builder; },
    order(col, opts = {}) { ctx.orderBy = { col, asc: opts.ascending !== false }; return builder; },
    limit(n) { ctx.limit = n; return builder; },
    single() { ctx.single = true; return execute(); },
    then(resolve, reject) { return execute().then(resolve, reject); },
  };
  return builder;
}

mock.module('@supabase/supabase-js', {
  namedExports: { createClient: () => ({ from: (table) => makeQuery(table) }) },
});

// ---------- Mock Google Calendar (googleapis) ----------
const calendarInserts = [];
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
          list: async () => ({ data: { items: [] } }),
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

// ---------- Mock Stripe (needed by the webhook route import) ----------
class MockStripe {
  constructor() {
    this.webhooks = { constructEvent: (body) => JSON.parse(body) };
  }
}
mock.module('stripe', { defaultExport: MockStripe });

// ---------- Import routes AFTER mocks are registered ----------
const { POST: postBookingRequest } = await import('../app/api/booking-request/route.js');
const { POST: postStripeWebhook } = await import('../app/api/webhooks/stripe/route.js');

// ---------- Helpers ----------
function resetState() {
  dbState.bookings.length = 0;
  dbState.updates.length = 0;
  dbState.inserts.length = 0;
  dbState.missingColumns = new Set();
  calendarInserts.length = 0;
  sentEmails.length = 0;
}

// A date safely in the future so the "no past bookings" refine passes.
function futureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function buildSubmission({ promoCode, needsTables = true, needsChairs = true, needsMat = true }) {
  return {
    applicationType: 'single',
    bookings: [
      {
        id: 1,
        eventName: 'Equipment Test Event',
        eventType: 'workshop',
        eventVisibility: 'private',
        selectedDate: futureDate(),
        selectedTime: '2:00 PM',
        hoursRequested: 2,
        specialRequests: '',
        needsTables,
        needsChairs,
        needsMat,
        expectedAttendees: 20,
      },
    ],
    contactInfo: {
      contactName: 'Test Renter',
      email: 'renter@example.com',
      phone: '3035551212',
      homeAddress: '123 Main Street, Denver, CO 80211',
      businessName: '',
      websiteUrl: '',
      isRecurring: false,
      paymentMethod: 'card',
      isFirstEvent: false,
      wantsOnsiteAssistance: false,
      hasAlcohol: false,
    },
    // The server recomputes pricing; these values just need to satisfy the schema.
    pricing: {
      totalHours: 2,
      totalBookings: 1,
      baseAmount: 190,
      subtotal: 0,
      total: 0,
      promoCode,
    },
    idPhoto: {
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      name: 'id.png',
      type: 'image/png',
      size: 1024,
    },
    coiDocument: null,
  };
}

async function submitBooking(submission) {
  const request = new Request('https://example.com/api/booking-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  });
  const response = await postBookingRequest(request);
  const body = await response.json();
  return { response, body };
}

async function fireWebhook(bookingId) {
  const event = {
    id: 'evt_test_1',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_123',
        amount: 10000,
        status: 'succeeded',
        metadata: { bookingId },
      },
    },
  };
  const request = new Request('https://example.com/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig_test' },
    body: JSON.stringify(event),
  });
  return postStripeWebhook(request);
}

// ---------- Tests ----------

test('sponsored booking: equipment flags are persisted to the DB row', async () => {
  resetState();
  const { response, body } = await submitBooking(buildSubmission({ promoCode: 'COLESTEST' }));
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
  assert.equal(body.sponsored, true, 'booking should be recognized as sponsored');

  assert.equal(dbState.inserts.length, 1, 'exactly one insert attempt expected (no fallback)');
  const row = dbState.inserts[0];
  assert.equal(row.needs_tables, true, 'needs_tables must be persisted as true');
  assert.equal(row.needs_chairs, true, 'needs_chairs must be persisted as true');
  assert.equal(row.needs_mat, true, 'needs_mat must be persisted as true');
  assert.equal(row.status, 'confirmed', 'sponsored booking is confirmed at insert');
});

test('sponsored booking: calendar event lists tables, chairs, and mat', async () => {
  resetState();
  await submitBooking(buildSubmission({ promoCode: 'COLESTEST' }));

  assert.equal(calendarInserts.length, 1, 'sponsored path must create the calendar event immediately');
  const description = calendarInserts[0].description;
  assert.match(description, /Tables \/ Chairs: Tables \+ Chairs/, `calendar description should list Tables + Chairs, got:\n${description}`);
  assert.match(description, /Full-floor mat: Yes/, `calendar description should show the mat as requested, got:\n${description}`);
  assert.doesNotMatch(description, /None requested/, 'calendar description must not claim no equipment was requested');
});

test('sponsored booking: confirmation + manager emails reflect the equipment selections', async () => {
  resetState();
  await submitBooking(buildSubmission({ promoCode: 'COLESTEST' }));

  const confirmation = sentEmails.find((e) => /Booking Confirmed/i.test(e.subject));
  assert.ok(confirmation, `customer confirmation email should be sent; got subjects: ${sentEmails.map((e) => e.subject).join(' | ')}`);
  assert.match(confirmation.html, /Tables \+ Chairs/, 'confirmation email should list Tables + Chairs');
  assert.doesNotMatch(confirmation.html, />None</, 'confirmation email must not show equipment as "None"');

  const managerNote = sentEmails.find((e) => /New Booking/i.test(e.subject));
  assert.ok(managerNote, 'manager notification email should be sent');
  assert.match(managerNote.html, /Tables \+ Chairs/, 'manager email should list Tables + Chairs');
});

test('partially-migrated DB: a missing UNRELATED column must not drop the equipment flags', async () => {
  resetState();
  // Simulate a production DB where the alcohol/COI migration was never run but
  // the tables/chairs + mat migrations were. The insert fallback must drop
  // ONLY the missing column — not the whole "newest columns" layer.
  dbState.missingColumns = new Set(['serving_alcohol']);

  const { response, body } = await submitBooking(buildSubmission({ promoCode: 'COLESTEST' }));
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);

  const stored = dbState.bookings[0];
  assert.ok(stored, 'booking row should be stored');
  assert.equal(stored.needs_tables, true, 'needs_tables must survive an unrelated missing column');
  assert.equal(stored.needs_chairs, true, 'needs_chairs must survive an unrelated missing column');
  assert.equal(stored.needs_mat, true, 'needs_mat must survive an unrelated missing column');
  assert.equal('serving_alcohol' in stored, false, 'the genuinely missing column is skipped');

  const description = calendarInserts[0]?.description || '';
  assert.match(description, /Tables \/ Chairs: Tables \+ Chairs/, `calendar should still list the equipment, got:\n${description}`);
  assert.match(description, /Full-floor mat: Yes/, 'calendar should still show the mat');

  const confirmation = sentEmails.find((e) => /Booking Confirmed/i.test(e.subject));
  assert.ok(confirmation, 'confirmation email should be sent');
  assert.match(confirmation.html, /Tables \+ Chairs/, 'confirmation email should still list the equipment');
});

test('equipment columns missing entirely: sponsored calendar + emails still reflect the request', async () => {
  resetState();
  // Worst case: the equipment migrations themselves have not been run. The
  // columns cannot be persisted, but the sponsored path fulfills calendar +
  // emails in the same request — those must be built from the renter's actual
  // selections, not from the column-stripped DB row.
  dbState.missingColumns = new Set([
    'needs_tables', 'needs_chairs', 'tables_chairs_fees', 'needs_mat', 'mat_rental_fee',
  ]);

  const { response, body } = await submitBooking(buildSubmission({ promoCode: 'COLESTEST' }));
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);

  const description = calendarInserts[0]?.description || '';
  assert.match(description, /Tables \/ Chairs: Tables \+ Chairs/, `calendar should list the requested equipment even pre-migration, got:\n${description}`);
  assert.match(description, /Full-floor mat: Yes/, 'calendar should show the requested mat even pre-migration');

  const confirmation = sentEmails.find((e) => /Booking Confirmed/i.test(e.subject));
  assert.ok(confirmation, 'confirmation email should be sent');
  assert.match(confirmation.html, /Tables \+ Chairs/, 'confirmation email should list the requested equipment even pre-migration');
});

test('paid booking: equipment flags survive insert and webhook-driven calendar + email', async () => {
  resetState();
  const { response, body } = await submitBooking(buildSubmission({ promoCode: '' }));
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.sponsored, false);

  const row = dbState.inserts[0];
  assert.equal(row.needs_tables, true, 'paid path: needs_tables must be persisted as true');
  assert.equal(row.needs_chairs, true, 'paid path: needs_chairs must be persisted as true');
  assert.equal(row.needs_mat, true, 'paid path: needs_mat must be persisted as true');
  assert.equal(row.status, 'pending_payment');
  assert.equal(calendarInserts.length, 0, 'paid path: no calendar event before payment');

  // Payment completes → webhook creates the calendar event + emails.
  const webhookResponse = await fireWebhook(body.id);
  assert.equal(webhookResponse.status, 200);

  assert.equal(calendarInserts.length, 1, 'webhook should create the calendar event');
  const description = calendarInserts[0].description;
  assert.match(description, /Tables \/ Chairs: Tables \+ Chairs/, `paid calendar description should list Tables + Chairs, got:\n${description}`);
  assert.match(description, /Full-floor mat: Yes/, 'paid calendar description should show the mat as requested');

  const confirmation = sentEmails.find((e) => /Booking Confirmed/i.test(e.subject));
  assert.ok(confirmation, 'paid path: customer confirmation email should be sent');
  assert.match(confirmation.html, /Tables \+ Chairs/, 'paid confirmation email should list Tables + Chairs');
});
