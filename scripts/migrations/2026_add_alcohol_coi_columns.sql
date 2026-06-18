-- Migration: Add alcohol flag + Certificate of Insurance (COI) storage to the
-- `bookings` table.
--
-- What this enables:
--   During booking, every renter answers whether alcohol will be present at
--   their event. When they answer "yes", they must upload a Certificate of
--   Insurance (general liability that includes liquor liability) before they
--   can submit/pay. The COI base64 data URL is stored on the booking row and
--   attached to the manager notification email.
--
-- Safe to run multiple times (uses IF NOT EXISTS).
--
-- The API has a staged fallback that omits these columns when they are missing,
-- so deploying the app code before this migration won't break bookings — it
-- will just skip persisting the alcohol flag and COI document.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS serving_alcohol BOOLEAN,
  ADD COLUMN IF NOT EXISTS coi_document_data TEXT,
  ADD COLUMN IF NOT EXISTS coi_document_name TEXT,
  ADD COLUMN IF NOT EXISTS coi_document_type TEXT;

COMMENT ON COLUMN bookings.serving_alcohol IS
  'Whether the renter indicated alcohol will be present at the event. NULL for legacy rows created before this question existed.';

COMMENT ON COLUMN bookings.coi_document_data IS
  'Base64-encoded data URL (data:application/pdf;base64,... or data:image/...;base64,...) of the renter''s Certificate of Insurance (general liability incl. liquor). Required when serving_alcohol is true. Attached to the manager notification email.';

COMMENT ON COLUMN bookings.coi_document_name IS
  'Original filename of the uploaded COI, used as the attachment filename in manager emails.';

COMMENT ON COLUMN bookings.coi_document_type IS
  'MIME type of the uploaded COI (e.g., application/pdf, image/jpeg).';
