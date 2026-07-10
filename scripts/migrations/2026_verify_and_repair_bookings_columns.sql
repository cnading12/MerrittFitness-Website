-- Verify-and-repair: ensure the `bookings` table has EVERY column the booking
-- API writes, in one idempotent script.
--
-- Why this exists: the booking API tolerates missing columns by inserting
-- without them, so a partially-migrated database "works" while silently
-- losing data (e.g. tables/chairs/mat selections showing as "not selected"
-- on the calendar and in confirmation emails). Running the individual
-- migration files piecemeal makes it easy to miss one — this script is the
-- union of all of them plus a schema-cache reload and a final audit query.
--
-- ⚠️ RUN THIS IN THE RIGHT PROJECT: open the Supabase dashboard for the
-- project whose URL matches the SUPABASE_URL environment variable in your
-- Vercel PRODUCTION settings (Settings → Environment Variables). The project
-- ref is the subdomain: https://<project-ref>.supabase.co. Running it in a
-- different project (e.g. an old/dev one) fixes nothing.
--
-- Safe to run multiple times (every ADD COLUMN uses IF NOT EXISTS).

-- 1) Union of every bookings-table migration in scripts/migrations/.
ALTER TABLE bookings
  -- 2026_add_event_supervision_columns.sql
  ADD COLUMN IF NOT EXISTS expected_attendees INTEGER,
  ADD COLUMN IF NOT EXISTS event_supervision_fee NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_supervision_hours NUMERIC(4, 2) DEFAULT 0,
  -- 2026_add_id_photo_columns.sql
  ADD COLUMN IF NOT EXISTS id_photo_data TEXT,
  ADD COLUMN IF NOT EXISTS id_photo_name TEXT,
  ADD COLUMN IF NOT EXISTS id_photo_type TEXT,
  -- 2026_add_is_public_column.sql
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
  -- 2026_add_alcohol_coi_columns.sql
  ADD COLUMN IF NOT EXISTS serving_alcohol BOOLEAN,
  ADD COLUMN IF NOT EXISTS coi_document_data TEXT,
  ADD COLUMN IF NOT EXISTS coi_document_name TEXT,
  ADD COLUMN IF NOT EXISTS coi_document_type TEXT,
  -- 2026_add_tables_chairs_columns.sql
  ADD COLUMN IF NOT EXISTS needs_tables BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_chairs BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tables_chairs_fees NUMERIC(10, 2) DEFAULT 0,
  -- 2026_add_mat_rental_columns.sql
  ADD COLUMN IF NOT EXISTS needs_mat BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mat_rental_fee NUMERIC(10, 2) DEFAULT 0,
  -- 2026_add_recurring_billing_columns.sql
  ADD COLUMN IF NOT EXISTS recurring_details JSONB,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS pending_recurring_setup BOOLEAN DEFAULT TRUE;

-- 2) Force PostgREST (the Supabase API layer) to reload its schema cache
--    immediately. Without this, the API can keep returning PGRST204
--    ("column not found in schema cache") for a while even though the
--    column now exists.
NOTIFY pgrst, 'reload schema';

-- 3) Audit: this query lists every column the booking API writes that is
--    STILL missing. An empty result means the table is fully migrated.
SELECT expected.column_name AS still_missing
FROM unnest(ARRAY[
  -- base columns (original table)
  'id', 'master_booking_id', 'event_name', 'event_type', 'event_date',
  'event_time', 'hours_requested', 'contact_name', 'email', 'phone',
  'home_address', 'business_name', 'website_url', 'special_requests',
  'needs_setup_help', 'needs_teardown_help', 'payment_method',
  'total_amount', 'subtotal', 'stripe_fee', 'saturday_charges',
  'setup_teardown_fees', 'onsite_assistance_fee', 'is_first_event',
  'wants_onsite_assistance', 'promo_code', 'promo_discount', 'status',
  'created_at', 'updated_at',
  -- migration-added columns
  'expected_attendees', 'event_supervision_fee', 'event_supervision_hours',
  'id_photo_data', 'id_photo_name', 'id_photo_type',
  'is_public',
  'serving_alcohol', 'coi_document_data', 'coi_document_name', 'coi_document_type',
  'needs_tables', 'needs_chairs', 'tables_chairs_fees',
  'needs_mat', 'mat_rental_fee',
  'recurring_details', 'stripe_subscription_id', 'stripe_customer_id',
  'pending_recurring_setup'
]) AS expected(column_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'bookings'
    AND c.column_name = expected.column_name
);
