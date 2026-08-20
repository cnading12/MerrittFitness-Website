// Structural guards on the security posture.
//
// The other tests in this suite check behavior. These check SHAPE — that new
// code can't quietly reintroduce a class of bug that was already fixed once.
// They read the source files rather than calling anything, so they catch a
// route added next month that forgets a rate limit, or a module that builds
// its own database client with the weak key.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, match, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, match, acc);
    else if (match.test(full)) acc.push(full);
  }
  return acc;
}

const ROUTE_FILES = walk('app/api', /route\.js$/);
const read = (f) => readFileSync(f, 'utf8');

test('there are API routes to check', () => {
  assert.ok(ROUTE_FILES.length > 5, 'the route scan should have found the API surface');
});

test('every anonymous route enforces a rate limit', () => {
  // The cron routes are exempt: they are guarded by a shared secret and are
  // called once a day by Vercel, so a limit would only risk blocking a
  // legitimate retry. Everything else public gets one.
  const EXEMPT = [/app\/api\/cron\//, /app\/api\/webhooks\//];

  const missing = ROUTE_FILES.filter((file) => {
    if (EXEMPT.some((re) => re.test(file))) return false;
    return !read(file).includes('enforceRateLimit');
  });

  assert.deepEqual(
    missing,
    [],
    `These routes are reachable anonymously with no rate limit:\n${missing.join('\n')}`
  );
});

test('the Stripe webhook is NOT rate limited', () => {
  // Stripe retries failed webhook deliveries in bursts. Throttling them would
  // drop payment confirmations — the booking is paid but never confirmed,
  // never calendared, and the client never gets an email.
  const webhook = ROUTE_FILES.find((f) => f.includes('webhooks/stripe'));
  assert.ok(webhook, 'the Stripe webhook route should exist');
  assert.ok(
    !read(webhook).includes('enforceRateLimit'),
    'throttling Stripe retries would silently lose paid bookings'
  );
});

test('no route hardcodes a wildcard CORS origin', () => {
  const offenders = ROUTE_FILES.filter((f) =>
    /['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/.test(read(f))
  );
  assert.deepEqual(
    offenders,
    [],
    `Wildcard CORS lets any site read these responses:\n${offenders.join('\n')}`
  );
});

test('no module builds its own Supabase client', () => {
  // One shared client in app/lib/supabase-server.js is what guarantees every
  // query uses the service-role key. A stray createClient() call silently
  // falls back to the anon key, which RLS denies.
  const sources = walk('app', /\.(js|ts|tsx|jsx)$/);
  const offenders = sources.filter((f) => {
    if (f.endsWith('supabase-server.js')) return false;
    return /createClient\s*\(\s*\n?\s*process\.env\.SUPABASE_URL/.test(read(f));
  });
  assert.deepEqual(
    offenders,
    [],
    `These build their own Supabase client instead of importing the shared one:\n${offenders.join('\n')}`
  );
});

test('the service-role key is never exposed as a NEXT_PUBLIC_ variable', () => {
  // NEXT_PUBLIC_ variables are inlined into the browser bundle. The
  // service-role key bypasses RLS entirely, so publishing it would be strictly
  // worse than having no RLS at all.
  const sources = [...walk('app', /\.(js|ts|tsx|jsx)$/), ...walk('components', /\.(js|ts|tsx|jsx)$/)];
  const offenders = sources.filter((f) => /NEXT_PUBLIC_SUPABASE_SERVICE|NEXT_PUBLIC_.*SERVICE_ROLE/i.test(read(f)));
  assert.deepEqual(offenders, [], `Service-role key exposed to the client:\n${offenders.join('\n')}`);

  const envExample = read('.env.example');
  assert.ok(
    !/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/i.test(envExample),
    '.env.example must not suggest a public service-role key'
  );
});

test('admin and cron routes use the shared constant-time auth helper', () => {
  // A local `provided !== expected` comparison returns at the first differing
  // byte and leaks the secret one character at a time.
  const guarded = ROUTE_FILES.filter((f) => f.includes('/api/admin/') || f.includes('/api/cron/'));
  assert.ok(guarded.length >= 4, 'admin and cron routes should exist');

  for (const file of guarded) {
    const src = read(file);
    assert.ok(
      /requireAdminAuth|requireCronAuth/.test(src),
      `${file} must use the shared auth helper`
    );
    assert.ok(
      !/process\.env\.(ADMIN_API_SECRET|CRON_SECRET)\s*(===|!==)/.test(src),
      `${file} compares a secret directly instead of in constant time`
    );
  }
});

test('the RLS migration covers every table the app writes to', () => {
  const migration = read('scripts/migrations/2026_enable_rls_lockdown.sql');

  // Tables discovered from the code, so a new table added later fails this
  // test until the migration is updated.
  const sources = walk('app', /\.js$/);
  const tables = new Set();
  for (const file of sources) {
    for (const m of read(file).matchAll(/\.from\(\s*['"]([a-z_]+)['"]\s*\)/g)) tables.add(m[1]);
  }
  assert.ok(tables.size > 0, 'should have found tables in use');

  const uncovered = [...tables].filter((t) => !migration.includes(t));
  assert.deepEqual(
    uncovered,
    [],
    `These tables are written by the app but absent from the RLS migration:\n${uncovered.join('\n')}`
  );
});

test('no statement in the RLS migration can abort on a missing table', () => {
  // REVOKE, GRANT and ALTER TABLE ... DISABLE have no IF EXISTS form here. A
  // bare one against a table that was never created aborts the whole script,
  // leaving RLS half applied. That bit us for real: this project has no
  // `inquiries` table, and an unguarded rollback failed mid-outage.
  //
  // Checks the ROLLBACK block too (it lives in comments, so `--` is stripped
  // before matching) — a rollback is run under pressure and must not be the
  // thing that fails.
  const migration = read('scripts/migrations/2026_enable_rls_lockdown.sql');

  const unguarded = migration
    .split('\n')
    .map((l) => l.replace(/^\s*--\s?/, '').trim())
    .filter((l) => {
      if (/^execute format\(/.test(l)) return false;   // inside a DO block
      return (
        /^revoke\s+all\s+on\s+(table\s+)?public\./i.test(l) ||
        /^grant\s+all\s+on\s+table\s+public\./i.test(l) ||
        /^alter\s+table\s+(?!if\s+exists)/i.test(l)
      );
    });

  assert.deepEqual(
    unguarded,
    [],
    `These statements abort if the table is absent — guard them:\n${unguarded.join('\n')}`
  );
});

test('API responses are marked no-store so caches cannot hold renter PII', async () => {
  const { securityHeaders } = await import('../app/lib/security-headers.js');
  const api = securityHeaders({ isApi: true });
  assert.match(api['Cache-Control'] || '', /no-store/);
  assert.match(api['X-Robots-Tag'] || '', /noindex/);

  // Pages must still be cacheable and indexable — this is an SEO-driven site.
  const page = securityHeaders();
  assert.equal(page['Cache-Control'], undefined);
  assert.match(page['X-Robots-Tag'] || '', /index, follow/);
});
