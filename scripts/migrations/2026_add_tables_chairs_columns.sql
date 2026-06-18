-- Migration: Add tables/chairs equipment fee tracking to the `bookings` table.
--
-- What this enables:
--   Renters who use tables and/or chairs are charged a per-item equipment fee
--   that scales with group size: $25 per item type for events under 40
--   attendees, $50 per item type for 40+ attendees. Tables and chairs stack
--   (a 60-person event using both pays $50 + $50 = $100). Renters on the
--   MerrittMagic partnership code are waived these fees entirely.
--
-- Safe to run multiple times (uses IF NOT EXISTS).
--
-- Run this against the Supabase `bookings` table before deploying the code
-- changes in app/booking/page.tsx and app/api/booking-request/route.js.
-- The API has a fallback that skips these columns if they don't exist yet,
-- so deploying the app code before the migration won't break bookings —
-- it will just omit the tables/chairs metadata from stored rows.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS needs_tables BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_chairs BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tables_chairs_fees NUMERIC(10, 2) DEFAULT 0;

COMMENT ON COLUMN bookings.needs_tables IS
  'Whether the renter requested tables. Drives the per-item equipment fee ($25 under 40 attendees, $50 for 40+). Waived on MerrittMagic.';

COMMENT ON COLUMN bookings.needs_chairs IS
  'Whether the renter requested chairs. Drives the per-item equipment fee ($25 under 40 attendees, $50 for 40+). Waived on MerrittMagic.';

COMMENT ON COLUMN bookings.tables_chairs_fees IS
  'Total tables/chairs equipment fee charged for this booking (tables and chairs stack). Waived for MerrittMagic partnership renters.';
