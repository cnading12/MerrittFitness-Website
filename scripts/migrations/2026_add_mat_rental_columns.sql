-- Migration: Add full-floor mat rental tracking to the `bookings` table.
--
-- What this enables:
--   Renters can add the full-floor roll-out mat (one mat that fills the main
--   hall — used for martial arts, yoga, sound baths, etc.) to a booking.
--   A flat $100 per booking covers use of the mat PLUS our staff setting it up
--   and breaking it down (always within the renter's reserved window so
--   bookings can be stacked back-to-back). The fee is waived for recurring
--   partners (renters who book with the MerrittMagic partnership code / use the
--   space 8+ hours/month) — they use the mat for free but are then responsible
--   for their own setup and breakdown.
--
--   `needs_mat`     — true when the renter requested the mat for this booking.
--   `mat_rental_fee`— $0 for partners (waived) or $100 per booking otherwise.
--
-- Recurring applications store the same intent inside recurring_details JSON
-- (always free for partners), so they don't depend on these columns.
--
-- Safe to run multiple times (uses IF NOT EXISTS).
--
-- Run this against the Supabase `bookings` table before deploying the code
-- changes in app/booking/page.tsx and app/api/booking-request/route.js.
-- The API has a fallback that skips these columns if they don't exist yet,
-- so deploying the app code before the migration won't break bookings —
-- it will just omit the mat metadata from stored rows.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS needs_mat BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mat_rental_fee NUMERIC(10, 2) DEFAULT 0;

COMMENT ON COLUMN bookings.needs_mat IS
  'True when the renter requested the full-floor roll-out mat for this booking.';

COMMENT ON COLUMN bookings.mat_rental_fee IS
  'Full-floor mat rental fee: $100 per booking (includes our staff setup/breakdown), or $0 when waived for a recurring partner.';
