-- Add client_code to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE;

-- Create a sequence for client codes starting at 1001
CREATE SEQUENCE IF NOT EXISTS client_code_seq START 1001;

-- Auto-generate client_code on insert based on service_type
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
      ELSE 'CL'
    END;
    NEW.client_code := prefix || '-' || seq_val::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_client_code
BEFORE INSERT ON customers
FOR EACH ROW EXECUTE FUNCTION generate_client_code();

-- Backfill existing rows that have no client_code
UPDATE customers
SET client_code = 'CL-' || nextval('client_code_seq')::TEXT
WHERE client_code IS NULL;
