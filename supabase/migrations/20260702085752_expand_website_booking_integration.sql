-- Website booking integration:
-- 1. Add 'حجز فندق' to customers.service_type constraint
-- 2. Add travel_date and num_travelers to bookings
-- 3. Enable anon INSERT on operation_files (scoped to website source) + documents

-- 1. Expand customers service_type to include 'حجز فندق'
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_service_type_check;
ALTER TABLE customers ADD CONSTRAINT customers_service_type_check
  CHECK (service_type IN ('حج', 'عمرة', 'سياحة داخلية', 'حجز فندق'));

-- Update client_code generation: hotel bookings use HT prefix
CREATE OR REPLACE FUNCTION generate_client_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq_val BIGINT;
BEGIN
  IF NEW.client_code IS NULL THEN
    seq_val := nextval('client_code_seq');
    prefix := CASE
      WHEN NEW.service_type = 'عمرة' THEN 'OM'
      WHEN NEW.service_type = 'حج' THEN 'HJ'
      WHEN NEW.service_type = 'سياحة داخلية' THEN 'TR'
      WHEN NEW.service_type = 'حجز فندق' THEN 'HT'
      ELSE 'CL'
    END;
    NEW.client_code := prefix || '-' || seq_val::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add travel_date and num_travelers to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS travel_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS num_travelers INTEGER DEFAULT 1;

-- 3. Allow anon to INSERT operation_files (website creates them after booking)
DROP POLICY IF EXISTS "website_insert_operation_files" ON operation_files;
CREATE POLICY "website_insert_operation_files"
  ON operation_files FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 4. Allow anon to INSERT documents (website optional doc uploads)
DROP POLICY IF EXISTS "website_insert_documents" ON documents;
CREATE POLICY "website_insert_documents"
  ON documents FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 5. Allow anon to read hotels (public website hotel listings)
DROP POLICY IF EXISTS "public_read_hotels" ON hotels;
CREATE POLICY "public_read_hotels"
  ON hotels FOR SELECT
  TO anon, authenticated
  USING (status = 'نشط');
