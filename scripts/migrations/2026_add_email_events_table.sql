-- Migration: Create `email_events` table — a durable delivery log for every
-- transactional email send.
--
-- Why: the recurring "client only received their first email" incident was
-- impossible to diagnose after the fact because the only evidence lived in
-- ephemeral serverless function logs. Every send now writes one row here
-- (from app/lib/email.js → recordEmailEvent):
--
--   status = 'sent'   → Resend ACCEPTED the email; resend_id is the Resend
--                       message id. If the client still didn't get it, the
--                       problem is delivery-side (spam / bounce / mailbox
--                       rules) — check /api/admin/email-status?bookingId=...
--                       which asks Resend for the message's live last_event
--                       (delivered / bounced / complained / ...).
--   status = 'failed' → every retry was exhausted; error_message holds the
--                       final Resend error.
--   no row at all     → the pipeline never reached this send (function died
--                       first: timeout, crash, missed webhook).
--
-- The app code treats this table as optional: if this migration hasn't run,
-- sends still work and a warning is logged. Run it in the Supabase SQL editor.
-- Safe to run multiple times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS email_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  booking_id         TEXT,
  master_booking_id  TEXT,
  email_kind         TEXT NOT NULL,   -- 'booking-confirmation' | 'client-onboarding' | 'public-event-marketing' | 'manager-notification' | 'recurring-setup-client' | 'recurring-setup-manager' | 'monthly-billing-client' | 'monthly-billing-rollup'
  recipient          TEXT,            -- comma-joined `to` addresses
  status             TEXT NOT NULL,   -- 'sent' (accepted by Resend) | 'failed' (all retries exhausted)
  resend_id          TEXT,            -- Resend message id when status = 'sent'
  idempotency_key    TEXT,
  attempts           INTEGER,         -- how many attempts the send took
  error_message      TEXT             -- final error when status = 'failed'
);

CREATE INDEX IF NOT EXISTS idx_email_events_booking
  ON email_events (booking_id);

CREATE INDEX IF NOT EXISTS idx_email_events_master
  ON email_events (master_booking_id);

CREATE INDEX IF NOT EXISTS idx_email_events_created_at
  ON email_events (created_at DESC);

COMMENT ON TABLE email_events IS
  'One row per transactional email send attempt outcome. Written best-effort by app/lib/email-log.js; queried by /api/admin/email-status.';
