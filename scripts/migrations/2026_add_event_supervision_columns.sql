-- Migration: Add on-site Event Supervision fee tracking to `bookings` table.
--
-- What this enables:
--   Renters with 40+ expected attendees are automatically charged $30/hr for an
--   on-site Event Supervisor for the ENTIRE duration of the event (no hour cap).
--   Recurring partners are exempt on repeat events, but every renter pays on
--   their first event.
--
-- Safe to run multiple times (uses IF NOT EXISTS).
--
-- Run this against the Supabase `bookings` table before deploying the code
-- changes in app/booking/page.tsx and app/api/booking-request/route.js.
-- The API has a fallback that skips these columns if they don't exist yet,
-- so deploying the app code before the migration won't break bookings —
-- it will just omit the supervision metadata from stored rows.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS expected_attendees INTEGER,
  ADD COLUMN IF NOT EXISTS event_supervision_fee NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_supervision_hours NUMERIC(4, 2) DEFAULT 0;

COMMENT ON COLUMN bookings.expected_attendees IS
  'Number of expected attendees for the event. Used to determine if on-site Event Supervision is required.';

COMMENT ON COLUMN bookings.event_supervision_fee IS
  'On-site Event Supervision fee for bookings with 40+ attendees ($30/hr for the entire event). Recurring partners exempt except on their first event.';

COMMENT ON COLUMN bookings.event_supervision_hours IS
  'Number of hours of on-site Event Supervision billed (full event duration).';
