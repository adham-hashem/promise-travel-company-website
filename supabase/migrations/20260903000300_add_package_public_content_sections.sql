-- Store package public content sections editable from the admin dashboard.
ALTER TABLE packages ADD COLUMN IF NOT EXISTS included_services jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS excluded_services jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS booking_conditions jsonb NOT NULL DEFAULT '[]'::jsonb;
