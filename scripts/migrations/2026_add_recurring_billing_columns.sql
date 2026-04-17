-- Migration: Add recurring-billing columns to `bookings` table.
--
-- What this enables:
--   Recurring series applications go through a two-step flow. First the
--   `/api/booking-request` endpoint creates a master row with
--   status='pending_recurring_setup'. The renter is then redirected to the
--   payment page where they complete a Stripe SetupIntent (ACH via Financial
--   Connections by default, card as a fallback). Once the SetupIntent
--   succeeds, a Stripe Customer + Subscription is created, the subscription
--   id is written back, and `pending_recurring_setup` flips to false.
--
--   Columns added:
--     recurring_details          JSONB — computed monthly billing context
--                                 (base hourly rate, monthly hour range, slots,
--                                 prorated first-month amount, first billing
--                                 date). Hydrated by the monthly invoicer in
--                                 the next PR.
--     stripe_subscription_id     TEXT  — populated once the Stripe Subscription
--                                 is created. Indexed so the monthly cron job
--                                 can look up bookings by subscription id.
--     stripe_customer_id         TEXT  — Stripe Customer created at setup time
--                                 and reused by the monthly invoicer.
--     pending_recurring_setup    BOOLEAN DEFAULT TRUE — flips to false after
--                                 SetupIntent confirms and Subscription is
--                                 created. Lets us distinguish "paperwork in,
--                                 bank not yet linked" from "active series".
--
-- Safe to run multiple times (uses IF NOT EXISTS).
--
-- The API has a staged fallback that omits these columns when they are
-- missing, so deploying the app code before this migration won't break
-- recurring applications — it will just skip persisting the new fields.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS recurring_details JSONB,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS pending_recurring_setup BOOLEAN DEFAULT TRUE;

-- The monthly invoicer cron job (next PR) looks up bookings by subscription
-- id when Stripe webhooks fire. Partial index skips the overwhelming majority
-- of rows that are single-event bookings and will never have a subscription.
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_subscription_id
  ON bookings(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN bookings.recurring_details IS
  'JSONB blob storing the computed monthly billing context for recurring-series bookings: hourly rate, slots (day/time/duration/frequency), monthly hour range, prorated first-month amount, and first billing date. Rehydrated by the monthly cron job to generate invoice items.';

COMMENT ON COLUMN bookings.stripe_subscription_id IS
  'Stripe Subscription id for this recurring booking. Populated once the renter completes the SetupIntent and the subscription is created. Used by the monthly cron job to attach invoice items to the right subscription.';

COMMENT ON COLUMN bookings.stripe_customer_id IS
  'Stripe Customer id for this recurring booking. Created at SetupIntent time and reused across months.';

COMMENT ON COLUMN bookings.pending_recurring_setup IS
  'True while the recurring application is awaiting ACH/card setup. Flips to false once the SetupIntent confirms and the Stripe Subscription exists.';
