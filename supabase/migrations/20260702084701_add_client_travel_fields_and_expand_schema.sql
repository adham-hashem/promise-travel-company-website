-- Add travel & document fields to customers, expand service_type & status constraints,
-- and update client_code generation to handle سياحة داخلية (TR- prefix).

-- 1. Expand service_type constraint to include 'سياحة داخلية'
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_service_type_check;
ALTER TABLE customers ADD CONSTRAINT customers_service_type_check
  CHECK (service_type IN ('حج', 'عمرة', 'سياحة داخلية'));

-- 2. Expand status constraint to include new statuses from the spec
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE customers ADD CONSTRAINT customers_status_check
  CHECK (status IN ('جديد', 'مهتم', 'متابعة', 'حجز', 'مغلق', 'تم الحجز', 'مكتمل', 'ملغي'));

-- 3. Add travel & document fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS passport_issue_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS passport_expiry_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('ذكر', 'أنثى'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS documents_status TEXT
  NOT NULL DEFAULT 'ناقص مستندات'
  CHECK (documents_status IN ('مكتمل', 'ناقص مستندات'));

-- 4. Update client_code generation function to handle سياحة داخلية → TR prefix
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
      ELSE 'CL'
    END;
    NEW.client_code := prefix || '-' || seq_val::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Auto-update documents_status based on uploaded documents
-- Trigger fires after INSERT/UPDATE/DELETE on documents table
CREATE OR REPLACE FUNCTION update_customer_documents_status()
RETURNS TRIGGER AS $$
DECLARE
  cust_id UUID;
  has_passport BOOLEAN;
  has_national_id BOOLEAN;
BEGIN
  cust_id := COALESCE(NEW.customer_id, OLD.customer_id);
  IF cust_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT
    EXISTS(SELECT 1 FROM documents WHERE customer_id = cust_id AND doc_type = 'جواز سفر'),
    EXISTS(SELECT 1 FROM documents WHERE customer_id = cust_id AND doc_type = 'بطاقة رقم قومي')
  INTO has_passport, has_national_id;

  IF has_passport AND has_national_id THEN
    UPDATE customers SET documents_status = 'مكتمل' WHERE id = cust_id;
  ELSE
    UPDATE customers SET documents_status = 'ناقص مستندات' WHERE id = cust_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documents_status ON documents;
CREATE TRIGGER trg_documents_status
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_customer_documents_status();

-- Backfill documents_status for existing customers
UPDATE customers SET documents_status = 'مكتمل'
WHERE id IN (
  SELECT DISTINCT d.customer_id FROM documents d
  WHERE d.customer_id IS NOT NULL
  GROUP BY d.customer_id
  HAVING bool_or(d.doc_type = 'جواز سفر') AND bool_or(d.doc_type = 'بطاقة رقم قومي')
);
