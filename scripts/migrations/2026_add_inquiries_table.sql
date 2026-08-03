-- Adds the `inquiries` table backing POST /api/inquiry: event inquiries,
-- tour requests, and studio-waitlist submissions from the marketing pages
-- (/weddings, /private-events, /concerts, /art-shows, /class-partnerships,
-- /congregations, /studio).
--
-- The route treats this insert as best effort: if the table is missing or the
-- insert fails, the inquiry still reaches staff via the manager notification
-- email, so this migration can be applied before or after the code deploys.
-- Apply in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL,
  page TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  event_type TEXT,
  event_date TEXT,
  guest_count TEXT,
  start_window TEXT,
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_kind ON inquiries (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries (email);

COMMENT ON TABLE inquiries IS 'Marketing-page inquiry and waitlist submissions (POST /api/inquiry). Not bookings.';
COMMENT ON COLUMN inquiries.kind IS 'event | tour | waitlist | congregation | class-partnership';
COMMENT ON COLUMN inquiries.page IS 'Site path the form was submitted from, e.g. /weddings';
COMMENT ON COLUMN inquiries.event_type IS 'Free-text event type chosen by the inquirer';
COMMENT ON COLUMN inquiries.event_date IS 'Preferred date as entered; free text, not validated';
COMMENT ON COLUMN inquiries.guest_count IS 'Approximate guest count as entered';
COMMENT ON COLUMN inquiries.start_window IS 'Waitlist only: desired start window, e.g. "January 2027"';
