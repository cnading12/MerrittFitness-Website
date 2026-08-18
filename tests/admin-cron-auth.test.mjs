// app/lib/auth.js — the shared-secret guards on /api/admin/* and /api/cron/*.
//
// These endpoints can bill every recurring renter's card and read the email
// log for any booking, and a single static header value is all that stands in
// front of them. The properties pinned here:
//
//   1. A missing secret FAILS CLOSED. An unconfigured env var must lock the
//      endpoint, never open it.
//   2. Wrong secrets are rejected; the correct one is accepted.
//   3. Comparison is constant-time and length-independent — no early return on
//      the first wrong byte, and no throw on a length mismatch (which would
//      itself leak the secret's length).
//   4. The cron guard requires the full "Bearer <secret>" form.
//
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

const { secretsMatch, requireAdminAuth, requireCronAuth } =
  await import('../app/lib/auth.js');

const withHeaders = (headers) =>
  new Request('https://example.com/api/admin/thing', { method: 'POST', headers });

test('secretsMatch accepts only the exact secret', () => {
  assert.equal(secretsMatch('hunter2', 'hunter2'), true);
  assert.equal(secretsMatch('hunter3', 'hunter2'), false);
  assert.equal(secretsMatch('Hunter2', 'hunter2'), false, 'comparison is case-sensitive');
});

test('secretsMatch handles differing lengths without throwing', () => {
  // node:crypto's timingSafeEqual throws on unequal buffer lengths, and that
  // throw is itself a length oracle. Hashing both sides first is what makes
  // these cases safe — so a short and a very long guess must both just be
  // `false`, never an exception.
  assert.equal(secretsMatch('', 'a-long-secret-value'), false);
  assert.equal(secretsMatch('x'.repeat(5000), 'a-long-secret-value'), false);
  assert.equal(secretsMatch('a-long-secret-value-plus-more', 'a-long-secret-value'), false);
});

test('secretsMatch treats missing input as a failed match, never a pass', () => {
  assert.equal(secretsMatch(undefined, 'real-secret'), false);
  assert.equal(secretsMatch(null, 'real-secret'), false);
  // An empty or absent EXPECTED secret must never match anything.
  assert.equal(secretsMatch('anything', ''), false);
  assert.equal(secretsMatch('anything', undefined), false);
  assert.equal(secretsMatch('', ''), false);
});

test('admin guard fails closed when ADMIN_API_SECRET is not configured', () => {
  const saved = process.env.ADMIN_API_SECRET;
  delete process.env.ADMIN_API_SECRET;
  try {
    const result = requireAdminAuth(withHeaders({ 'x-admin-secret': 'anything' }));
    assert.equal(result.ok, false, 'an unconfigured secret must LOCK the endpoint');
    assert.equal(result.status, 500);
  } finally {
    if (saved === undefined) delete process.env.ADMIN_API_SECRET;
    else process.env.ADMIN_API_SECRET = saved;
  }
});

test('admin guard rejects a wrong secret and accepts the right one', () => {
  const saved = process.env.ADMIN_API_SECRET;
  process.env.ADMIN_API_SECRET = 'correct-admin-secret';
  try {
    assert.equal(requireAdminAuth(withHeaders({})).ok, false, 'no header at all');
    assert.equal(requireAdminAuth(withHeaders({ 'x-admin-secret': 'nope' })).status, 401);
    assert.equal(requireAdminAuth(withHeaders({ 'x-admin-secret': 'correct-admin-secret' })).ok, true);
  } finally {
    if (saved === undefined) delete process.env.ADMIN_API_SECRET;
    else process.env.ADMIN_API_SECRET = saved;
  }
});

test('cron guard fails closed when CRON_SECRET is not configured', () => {
  const saved = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const result = requireCronAuth(withHeaders({ authorization: 'Bearer anything' }));
    assert.equal(result.ok, false);
    assert.equal(result.status, 500);
  } finally {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  }
});

test('cron guard requires the full Bearer form', () => {
  const saved = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'cron-secret-value';
  try {
    assert.equal(requireCronAuth(withHeaders({ authorization: 'Bearer cron-secret-value' })).ok, true);
    // The bare secret without the scheme must not authenticate.
    assert.equal(requireCronAuth(withHeaders({ authorization: 'cron-secret-value' })).ok, false);
    assert.equal(requireCronAuth(withHeaders({ authorization: 'Bearer wrong' })).status, 401);
    assert.equal(requireCronAuth(withHeaders({})).status, 401);
  } finally {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  }
});
