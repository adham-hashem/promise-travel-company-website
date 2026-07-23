/*
# ERP/CRM Expansion: Suppliers, Tasks enhancement, Notifications expansion, Profit cost fields, Timeline

## Summary
Expands the dashboard into a full ERP/CRM. Adds suppliers management, expands
tasks with department/priority/status/link fields, expands notifications types,
adds cost_price to packages for profit analysis, creates a customer_timeline view,
and adds new expense categories.

## New Tables
1. `suppliers` — vendor management (hotels, airlines, transport, guides)
2. `supplier_payments` — payments made to suppliers

## Modified Tables
- `tasks`: add department, client_code, booking_id, related_section, auto_generated
- `notifications`: expand type constraint with ERP notification types
- `packages`: add cost_price for profit analysis
- `expenses`: expand category constraint with فنادق, نقل

## New Views
- `customer_timeline` — aggregates customer events into an ordered timeline

## Security
- RLS enabled on new tables with authenticated CRUD policies
*/

-- ===== 1. suppliers table =====
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code text UNIQUE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'فنادق' CHECK (type IN ('فنادق', 'طيران', 'نقل', 'مرشدين', 'أخرى')),
  phone text,
  email text,
  address text,
  contract_ref text,
  notes text,
  status text NOT NULL DEFAULT 'نشط' CHECK (status IN ('نشط', 'غير نشط')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "suppliers_delete" ON suppliers;
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_suppliers_type ON suppliers(type);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

CREATE SEQUENCE IF NOT EXISTS supplier_code_seq START 1001;
CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.supplier_code IS NULL THEN
    NEW.supplier_code := 'SUP-' || nextval('supplier_code_seq')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_supplier_code ON suppliers;
CREATE TRIGGER trg_supplier_code
  BEFORE INSERT ON suppliers
  FOR EACH ROW EXECUTE FUNCTION generate_supplier_code();

-- ===== 2. supplier_payments table =====
CREATE TABLE IF NOT EXISTS supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'كاش',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_payments_select" ON supplier_payments;
CREATE POLICY "supplier_payments_select" ON supplier_payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "supplier_payments_insert" ON supplier_payments;
CREATE POLICY "supplier_payments_insert" ON supplier_payments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "supplier_payments_update" ON supplier_payments;
CREATE POLICY "supplier_payments_update" ON supplier_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "supplier_payments_delete" ON supplier_payments;
CREATE POLICY "supplier_payments_delete" ON supplier_payments FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);

-- ===== 3. Expand tasks table =====
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_code text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS related_section text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('منخفضة', 'متوسطة', 'عالية', 'عاجل'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('جديدة', 'قيد التنفيذ', 'مكتملة', 'متأخرة', 'Pending', 'In Progress', 'Completed'));

ALTER TABLE tasks ALTER COLUMN employee_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department);
CREATE INDEX IF NOT EXISTS idx_tasks_client_code ON tasks(client_code);

-- ===== 4. Expand notifications type constraint =====
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_lead', 'task_assigned', 'follow_up', 'overdue_task',
    'new_customer', 'new_booking', 'new_payment', 'new_invoice',
    'missing_document', 'travel_soon', 'website_booking'
  ));

-- ===== 5. Add cost_price to packages =====
ALTER TABLE packages ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- ===== 6. Expand expenses category constraint =====
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check
  CHECK (category IN ('تسويق', 'رواتب', 'تشغيل', 'فنادق', 'نقل', 'إعلانات', 'إيجار', 'أخرى'));

-- ===== 7. customer_timeline view =====
CREATE OR REPLACE VIEW customer_timeline AS
SELECT
  c.id AS customer_id,
  c.client_code,
  c.name AS customer_name,
  'تم إنشاء العميل' AS event,
  'customer' AS source,
  c.created_at
FROM customers c
UNION ALL
SELECT
  i.converted_customer_id, c2.client_code, c2.name,
  'تم إنشاء الاستعلام: ' || i.inquiry_number,
  'inquiry', i.created_at
FROM inquiries i
JOIN customers c2 ON c2.id = i.converted_customer_id
WHERE i.converted_customer_id IS NOT NULL
UNION ALL
SELECT
  cl.customer_id, c3.client_code, c3.name,
  'تواصل: ' || cl.type || COALESCE(' - ' || cl.notes, ''),
  'communication', cl.created_at
FROM communication_logs cl
JOIN customers c3 ON c3.id = cl.customer_id
WHERE cl.customer_id IS NOT NULL
UNION ALL
SELECT
  b.customer_id, c4.client_code, c4.name,
  'تم إنشاء الحجز' || COALESCE(' - ' || pk.name, ''),
  'booking', b.created_at
FROM bookings b
JOIN customers c4 ON c4.id = b.customer_id
LEFT JOIN packages pk ON pk.id = b.package_id
WHERE b.customer_id IS NOT NULL
UNION ALL
SELECT
  inv.customer_id, c5.client_code, c5.name,
  'تم إنشاء الفاتورة: ' || inv.invoice_number,
  'invoice', inv.created_at
FROM invoices inv
JOIN customers c5 ON c5.id = inv.customer_id
WHERE inv.customer_id IS NOT NULL
UNION ALL
SELECT
  p.customer_id, c6.client_code, c6.name,
  'تم دفع دفعة: ' || p.amount::text || ' ج.م',
  'payment', p.created_at
FROM payments p
JOIN customers c6 ON c6.id = p.customer_id
WHERE p.customer_id IS NOT NULL
UNION ALL
SELECT
  d.customer_id, c7.client_code, c7.name,
  'تم رفع مستند: ' || d.doc_type,
  'document', d.created_at
FROM documents d
JOIN customers c7 ON c7.id = d.customer_id
WHERE d.customer_id IS NOT NULL
UNION ALL
SELECT
  op.customer_id, c8.client_code, c8.name,
  'تم إنشاء ملف تشغيل: ' || COALESCE(op.op_number, ''),
  'operation', op.created_at
FROM operation_files op
JOIN customers c8 ON c8.id = op.customer_id
WHERE op.customer_id IS NOT NULL;

GRANT SELECT ON customer_timeline TO authenticated;
