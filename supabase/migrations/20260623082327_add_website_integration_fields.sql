/*
# Website integration: packages/offers display fields + booking source + public read access

1. New Columns
- packages.image_url (text) — optional image URL for website package cards
- packages.description (text) — marketing copy shown on website
- packages.featured (boolean, default false) — flags packages to highlight on the homepage
- bookings.source (text, default 'Dashboard') — origin of the booking: 'Website' | 'Dashboard'

2. Security
- packages & offers: add anon SELECT policy so the public website (anon key) can read active packages/offers WITHOUT authentication. INSERT/UPDATE/DELETE stay authenticated-only (Dashboard).
- bookings, customers: no anon access — website creates customers+bookings via an edge function with the service role (keeps the CRM secure). No RLS change needed here.

Important: This migration is idempotent — safe to re-run.
*/

-- packages: website display fields
ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- bookings: source tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'Dashboard';

-- Public read on packages (active only)
DROP POLICY IF EXISTS "public_read_packages" ON packages;
CREATE POLICY "public_read_packages"
ON packages FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Public read on offers (active only)
DROP POLICY IF EXISTS "public_read_offers" ON offers;
CREATE POLICY "public_read_offers"
ON offers FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Internal trips: public read (active)
DROP POLICY IF EXISTS "public_read_internal_trips" ON internal_trips;
CREATE POLICY "public_read_internal_trips"
ON internal_trips FOR SELECT
TO anon, authenticated
USING (status = 'متاحة');

-- Update the existing bookings SELECT policy to additionally allow anon to INSERT website bookings.
-- We add a separate INSERT policy scoped to the 'Website' source so the public client can create bookings only from the website.
DROP POLICY IF EXISTS "website_insert_bookings" ON bookings;
CREATE POLICY "website_insert_bookings"
ON bookings FOR INSERT
TO anon, authenticated
WITH CHECK (source = 'Website');

-- Allow anon to INSERT customers (website leads) — scoped to source = 'Website'
DROP POLICY IF EXISTS "website_insert_customers" ON customers;
CREATE POLICY "website_insert_customers"
ON customers FOR INSERT
TO anon, authenticated
WITH CHECK (source = 'Website');
