-- Migration: Add renter government-issued ID photo storage to `bookings` table.
--
-- What this enables:
--   Every booking captures a photo of the primary renter's government-issued
--   ID during the application. The base64 data URL is stored on the booking
--   row and attached to the manager notification email sent by the Stripe
--   webhook after payment is confirmed.
--
-- Safe to run multiple times (uses IF NOT EXISTS).
--
-- The API has a staged fallback that omits these columns when they are
-- missing, so deploying the app code before this migration won't break
-- bookings — it will just skip persisting the ID photo.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS id_photo_data TEXT,
  ADD COLUMN IF NOT EXISTS id_photo_name TEXT,
  ADD COLUMN IF NOT EXISTS id_photo_type TEXT;

COMMENT ON COLUMN bookings.id_photo_data IS
  'Base64-encoded data URL (data:image/...;base64,...) of the renter''s government-issued ID photo. Attached to the manager notification email after payment.';

COMMENT ON COLUMN bookings.id_photo_name IS
  'Original filename of the uploaded ID photo, used as the attachment filename in manager emails.';

COMMENT ON COLUMN bookings.id_photo_type IS
  'MIME type of the uploaded ID photo (e.g., image/jpeg, image/png, image/heic).';
