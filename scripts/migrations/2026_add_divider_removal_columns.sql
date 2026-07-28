-- Migration: Add cafe/lounge divider-removal tracking to the `bookings` table.
--
-- What this enables:
--   Large glass-and-wood dividers separate the cafe/lounge from the main hall.
--   Renters can have them removed for their event, opening both areas into one
--   continuous space. A flat $1,000 per booking covers our staff removing the
--   dividers before the event and reinstalling them afterward. Unlike the mat
--   and tables/chairs fees, this fee is NEVER waived — it is heavy specialty
--   work with a real cost every time (sponsored promo codes still comp it
--   along with the rest of the subtotal, like every other line item).
--
--   `needs_divider_removal` — true when the renter requested divider removal
--                             for this booking.
--   `divider_removal_fee`   — the group-wide divider-removal charge ($1,000
--                             per booking in the group that requested it),
--                             stored on every row like the other fee columns.
--
-- Single-event bookings only — the recurring path bills hours × rate monthly
-- and has no per-add-on billing, so recurring applications don't use these.
--
-- Safe to run multiple times (uses IF NOT EXISTS).
--
-- Run this against the Supabase `bookings` table before deploying the code
-- changes in app/booking/page.tsx and app/api/booking-request/route.js.
-- The API has a fallback that skips these columns if they don't exist yet,
-- so deploying the app code before the migration won't break bookings —
-- it will just omit the divider-removal metadata from stored rows.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS needs_divider_removal BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS divider_removal_fee NUMERIC(10, 2) DEFAULT 0;

COMMENT ON COLUMN bookings.needs_divider_removal IS
  'True when the renter requested removal of the cafe/lounge glass & wood dividers for this booking.';

COMMENT ON COLUMN bookings.divider_removal_fee IS
  'Cafe/lounge divider-removal fee: flat $1,000 per booking that requested it (staff removes and reinstalls the dividers). Never waived.';
