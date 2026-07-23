-- Offers management: full website-control fields
-- Adds: type (Hajj/Umrah/Internal), image_url, description, package_id, original_price, discounted_price
-- `is_active` already exists and controls hide/show (false = hidden from public).

ALTER TABLE offers ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id) ON DELETE SET NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS original_price numeric;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS discounted_price numeric;

-- Public read on offers already exists from previous migration (anon+authenticated, is_active=true).
-- No RLS change needed.
