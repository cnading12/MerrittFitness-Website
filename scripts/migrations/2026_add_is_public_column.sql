-- Migration: Add public/private event flag to the `bookings` table.
--
-- What this enables:
--   During booking, the renter chooses whether their event is "public" (open to
--   the community) or "private". Public events qualify for our collaborative
--   marketing effort — a bulletin-board flyer, a feature on the website's
--   "Upcoming Events" tab, and social media support. When a public booking is
--   confirmed, the renter is emailed instructions for the materials we need
--   (flyer PDF, event description, social handles, ticket link, and an image).
--
-- Safe to run multiple times (uses IF NOT EXISTS).
--
-- The API has a staged fallback that omits this column when it is missing, so
-- deploying the app code before this migration won't break bookings — events
-- will simply be treated as private until the column exists.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN bookings.is_public IS
  'TRUE when the renter marked the event as public (open to the community). Public events trigger the collaborative-marketing email requesting flyer/website/social materials.';
