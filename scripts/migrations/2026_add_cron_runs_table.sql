-- Migration: Create `cron_runs` table for cron-job observability.
--
-- Each Vercel Cron execution writes one row: which job, how many bookings
-- were processed, what succeeded / was skipped / failed, how long it took,
-- and a JSONB `details` blob with per-booking outcomes. Used to:
--   - Sanity-check the first few real monthly-billing runs.
--   - Debug a production run after the fact without re-running Stripe.
--   - Prove idempotency (repeated runs produce mostly `skipped` outcomes).
--
-- Safe to run multiple times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS cron_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  job_name          TEXT NOT NULL,
  succeeded_count   INTEGER NOT NULL DEFAULT 0,
  skipped_count     INTEGER NOT NULL DEFAULT 0,
  failed_count      INTEGER NOT NULL DEFAULT 0,
  duration_ms       INTEGER NOT NULL DEFAULT 0,
  -- Per-booking outcomes: [{ bookingId, outcome, reason?, stripeInvoiceItemId?, ... }]
  -- plus top-level context like { dryRun, year, month, triggeredBy }.
  details           JSONB
);

-- The cron dashboard filters by job and orders by most-recent-first.
CREATE INDEX IF NOT EXISTS idx_cron_runs_job_run_at
  ON cron_runs(job_name, run_at DESC);

COMMENT ON TABLE cron_runs IS
  'One row per Vercel Cron execution. Written by the monthly-recurring-billing job (and future cron jobs) so we have an auditable log of what ran, what succeeded, and what failed.';
