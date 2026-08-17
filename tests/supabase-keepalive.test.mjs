// GET/POST /api/cron/supabase-keepalive — the daily ping that stops Supabase
// from auto-pausing the project.
//
// Why it exists: Supabase pauses Free-plan projects after ~7 days without
// database activity. The venue regularly goes a week between bookings, so the
// next renter used to land on a paused database, fail, and have to rebook. One
// real query per day resets that clock.
//
// These tests lock in:
//   1. The route is secret-protected (a public keep-alive endpoint would be a
//      free way for anyone to hammer the database).
//   2. A successful run actually TOUCHES the database — the read is the whole
//      point of the job, so a refactor that stops querying must fail here.
//   3. The best-effort `cron_runs` audit row can fail without the ping
//      reporting the database as down (that table's migration is optional).
//   4. A failed ping returns non-2xx (so Vercel's cron dashboard shows it) AND
//      emails staff — silent failure is the exact failure mode being fixed.
//   5. The alert is staff-only and deduped per day, and the route exports
//      maxDuration like every other email-sending route (see CLAUDE.md).
//
// Run with: npm test

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_key';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon_test';
process.env.OPS_EMAIL_MANAGER = 'boss@example.com';
process.env.OPS_EMAIL_CLIENT_SERVICES = 'desk@example.com';
process.env.CRON_SECRET = 'cron_test_secret';

// ---------- Mocks (registered BEFORE importing app modules) ----------

const attempts = [];
let sendShouldThrow = false;
class MockResend {
  constructor() {
    this.emails = {
      send: async (payload, options = {}) => {
        attempts.push({ payload, options });
        if (sendShouldThrow) throw new Error('resend unreachable');
        return { data: { id: `mock_${attempts.length}` }, error: null };
      },
    };
  }
}
mock.module('resend', { namedExports: { Resend: MockResend } });

// Supabase mock. `readError` simulates a paused/unreachable project;
// `insertError` simulates the optional `cron_runs` table being absent.
let readError = null;
let insertError = null;
const reads = [];
const insertedRows = [];
mock.module('@supabase/supabase-js', {
  namedExports: {
    createClient: () => ({
      from: (table) => ({
        select: async (columns, options) => {
          reads.push({ table, columns, options });
          if (readError) return { count: null, error: { message: readError } };
          return { count: 42, error: null };
        },
        insert: async (row) => {
          if (insertError) return { error: { message: insertError } };
          insertedRows.push({ table, row });
          return { error: null };
        },
      }),
    }),
  },
});

const route = await import('../app/api/cron/supabase-keepalive/route.js');

function makeRequest({ secret = 'cron_test_secret' } = {}) {
  return new Request('http://localhost/api/cron/supabase-keepalive', {
    method: 'GET',
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

function reset() {
  attempts.length = 0;
  reads.length = 0;
  insertedRows.length = 0;
  readError = null;
  insertError = null;
  sendShouldThrow = false;
}

// ---------- 1. Authentication ----------

test('keep-alive rejects requests without the cron secret', async () => {
  reset();
  const res = await route.GET(makeRequest({ secret: null }));
  assert.equal(res.status, 401);
  assert.equal(reads.length, 0, 'unauthenticated request must not touch the database');
});

test('keep-alive rejects requests with the wrong cron secret', async () => {
  reset();
  const res = await route.GET(makeRequest({ secret: 'wrong' }));
  assert.equal(res.status, 401);
  assert.equal(reads.length, 0);
});

// ---------- 2. The happy path actually queries the database ----------

test('keep-alive issues a real database read', async () => {
  reset();
  const res = await route.GET(makeRequest());
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.bookingCount, 42);

  assert.equal(reads.length, 1, 'exactly one read — this query IS the keep-alive');
  assert.equal(reads[0].table, 'bookings');
  assert.equal(reads[0].options?.head, true,
    'head:true keeps the ping cheap — no rows are transferred');
  assert.equal(attempts.length, 0, 'a healthy ping sends no email');
});

test('keep-alive records an audit row in cron_runs', async () => {
  reset();
  const res = await route.GET(makeRequest());
  const body = await res.json();

  assert.equal(body.auditRowWritten, true);
  const audit = insertedRows.find((r) => r.table === 'cron_runs');
  assert.ok(audit, 'a cron_runs row proves the ping ran, after the fact');
  assert.equal(audit.row.job_name, 'supabase-keepalive');
  assert.equal(audit.row.details.bookingCount, 42);
});

// ---------- 3. The audit row is best-effort ----------

test('a missing cron_runs table does not make a healthy ping look failed', async () => {
  reset();
  insertError = 'relation "cron_runs" does not exist';

  const res = await route.GET(makeRequest());
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.ok, true, 'the READ is what proves the database is awake');
  assert.equal(body.auditRowWritten, false);
  assert.equal(attempts.length, 0, 'no false alarm to staff');
});

// ---------- 4. A failed ping is loud ----------

test('unreachable database returns non-2xx and alerts staff', async () => {
  reset();
  readError = 'fetch failed';

  const res = await route.GET(makeRequest());
  const body = await res.json();

  assert.equal(res.status, 500, 'non-2xx so the failure shows in Vercel cron logs');
  assert.equal(body.ok, false);
  assert.equal(body.error, 'fetch failed');
  assert.equal(body.alerted, true);

  assert.equal(attempts.length, 1, 'exactly one alert email');
  const alert = attempts[0];
  assert.deepEqual(alert.payload.to.sort(), ['boss@example.com', 'desk@example.com'],
    'the alert is staff-only — no client ever receives it');
  assert.match(alert.payload.subject, /database unreachable/i);
  assert.match(alert.payload.html, /fetch failed/,
    'the underlying error is included so staff can act on it');
  assert.ok(alert.payload.text, 'every send carries a plain-text part (CLAUDE.md rule 8)');
});

test('alert email is deduped per day by idempotency key', async () => {
  reset();
  readError = 'fetch failed';

  await route.GET(makeRequest());
  await route.POST(makeRequest());

  assert.equal(attempts.length, 2, 'both runs attempt a send…');
  const [first, second] = attempts;
  assert.ok(first.options.idempotencyKey, '…each carrying an Idempotency-Key');
  assert.equal(first.options.idempotencyKey, second.options.idempotencyKey,
    'same UTC day ⇒ same key, so Resend collapses the retry into one email');
  assert.match(first.options.idempotencyKey, /^database-unreachable-alert\/\d{4}-\d{2}-\d{2}$/,
    'key is scoped to the day, so an outage that spans days still alerts daily');
});

test('a failing alert email does not mask the failing ping', async () => {
  reset();
  readError = 'fetch failed';
  sendShouldThrow = true;

  const res = await route.GET(makeRequest());
  const body = await res.json();

  assert.equal(res.status, 500, 'the ping result is reported regardless of the email');
  assert.equal(body.ok, false);
  assert.equal(body.error, 'fetch failed');
  assert.equal(body.alerted, false, 'and the response says the alert did not get out');
});

// ---------- 5. Route-level contract ----------

test('keep-alive route exports maxDuration', async () => {
  assert.ok(route.maxDuration >= 60,
    `supabase-keepalive route sends email, so it must export maxDuration ≥ 60, got ${route.maxDuration}`);
});

test('keep-alive is scheduled daily in vercel.json', async () => {
  const { readFile } = await import('node:fs/promises');
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const cron = config.crons.find((c) => c.path === '/api/cron/supabase-keepalive');
  assert.ok(cron, 'the route only helps if Vercel actually calls it');
  // Daily (every day-of-month, every month, every day-of-week) — Supabase's
  // pause needs 7 consecutive quiet days, so daily leaves ~6 days of slack.
  const [, , dom, month, dow] = cron.schedule.split(' ');
  assert.deepEqual([dom, month, dow], ['*', '*', '*'],
    `keep-alive must run daily, got "${cron.schedule}"`);
});
