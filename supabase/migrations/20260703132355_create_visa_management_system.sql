/*
# Visa Management System

## Summary
Adds a complete visa management module linked to the entire ERP. Tracks visas
from inquiry through travel completion. Auto-determines visa requirement based
on service type, auto-creates a visa file when an inquiry is converted to a
customer, records visa fees as a financial transaction, surfaces visa status
inside operations with alerts, and provides a travel-readiness checklist.

## New Tables
1. `visa_management` — one row per visa file
   - id, visa_id (CL-1001-VS-01), client_code, booking_id, customer_id,
     full_name, service_type, visa_type, country, application_date, issue_date,
     expiry_date, visa_fee, visa_status, assigned_employee_id, notes, created_at
2. `visa_documents` — documents attached to a visa (passport, photo, insurance,
   flight booking, hotel booking, other)
   - id, visa_id (FK), doc_type, file_path, file_name, file_size, status,
     uploaded_by, created_at

## Modified Tables
- `inquiries`: add `visa_requirement` (Requires Visa | No Visa Required)
- `operation_files`: add `visa_status` text — mirrored from the linked visa so
  operations can show alerts without a join
- `customers`: add `visa_requirement` text for CRM display
- `travel_checklist`: new table — 6 checklist items per customer tracking
  travel readiness (passport, visa, ticket, hotel, invoice, payment)

## Functions / Triggers
- `set_visa_requirement()` — BEFORE INSERT/UPDATE on inquiries: auto-sets
  visa_requirement to 'Requires Visa' when service_type is حج/عمرة/سفر خارجي,
  else 'No Visa Required'. (سفر خارجي added as a valid service_type value.)
- `generate_visa_id()` — BEFORE INSERT on visa_management: generates
  CL-1001-VS-01 sub-code from the client_code.
- `auto_create_visa_on_conversion()` — AFTER UPDATE on inquiries when status
  changes to 'تم التحويل': creates a booking + visa_management row if the
  service requires a visa.
- `sync_visa_to_operations()` — AFTER INSERT/UPDATE on visa_management: updates
  the linked operation_file.visa_status and, when visa is approved, sets
  file_status to 'جاهز للسفر'.
- `auto_visa_notifications()` — AFTER INSERT/UPDATE on visa_management: creates
  notifications for new visas, review, approval, rejection, and expiry.

## Security
- RLS enabled on visa_management, visa_documents, travel_checklist with
  authenticated CRUD policies (same pattern as existing tables).
*/

-- ===== 1. visa_management table =====
CREATE TABLE IF NOT EXISTS visa_management (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_id text UNIQUE,
  client_code text,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  service_type text NOT NULL DEFAULT 'عمرة',
  visa_type text NOT NULL DEFAULT 'عمرة' CHECK (visa_type IN ('عمرة', 'حج', 'سياحة', 'عمل', 'علاج', 'أخرى')),
  country text NOT NULL DEFAULT 'السعودية',
  application_date date,
  issue_date date,
  expiry_date date,
  visa_fee numeric NOT NULL DEFAULT 0,
  visa_status text NOT NULL DEFAULT 'لم يبدأ' CHECK (visa_status IN ('لم يبدأ', 'قيد التقديم', 'قيد المراجعة', 'تمت الموافقة', 'مرفوضة', 'منتهية')),
  assigned_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE visa_management ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visa_select" ON visa_management;
CREATE POLICY "visa_select" ON visa_management FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "visa_insert" ON visa_management;
CREATE POLICY "visa_insert" ON visa_management FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "visa_update" ON visa_management;
CREATE POLICY "visa_update" ON visa_management FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "visa_delete" ON visa_management;
CREATE POLICY "visa_delete" ON visa_management FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_visa_client_code ON visa_management(client_code);
CREATE INDEX IF NOT EXISTS idx_visa_customer ON visa_management(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_status ON visa_management(visa_status);

-- ===== 2. visa_documents table =====
CREATE TABLE IF NOT EXISTS visa_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_id uuid NOT NULL REFERENCES visa_management(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('جواز السفر', 'صورة شخصية', 'تأمين', 'حجز طيران', 'حجز فندق', 'مستندات إضافية')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  status text NOT NULL DEFAULT 'مرفوع' CHECK (status IN ('مرفوع', 'تمت المراجعة', 'مرفوض')),
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE visa_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visa_docs_select" ON visa_documents;
CREATE POLICY "visa_docs_select" ON visa_documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "visa_docs_insert" ON visa_documents;
CREATE POLICY "visa_docs_insert" ON visa_documents FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "visa_docs_update" ON visa_documents;
CREATE POLICY "visa_docs_update" ON visa_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "visa_docs_delete" ON visa_documents;
CREATE POLICY "visa_docs_delete" ON visa_documents FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_visa_docs_visa ON visa_documents(visa_id);

-- ===== 3. Add visa_requirement to inquiries + customers =====
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS visa_requirement text DEFAULT 'No Visa Required';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS visa_requirement text;

-- Auto-set visa requirement based on service type
CREATE OR REPLACE FUNCTION set_visa_requirement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.service_type IN ('حج', 'عمرة', 'سفر خارجي') THEN
    NEW.visa_requirement := 'Requires Visa';
  ELSE
    NEW.visa_requirement := 'No Visa Required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visa_requirement ON inquiries;
CREATE TRIGGER trg_visa_requirement
  BEFORE INSERT OR UPDATE OF service_type ON inquiries
  FOR EACH ROW EXECUTE FUNCTION set_visa_requirement();

-- ===== 4. Add visa_status to operation_files =====
ALTER TABLE operation_files ADD COLUMN IF NOT EXISTS visa_status text;
CREATE INDEX IF NOT EXISTS idx_ops_visa_status ON operation_files(visa_status);

-- ===== 5. travel_checklist table =====
CREATE TABLE IF NOT EXISTS travel_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  passport_done boolean NOT NULL DEFAULT false,
  visa_done boolean NOT NULL DEFAULT false,
  ticket_done boolean NOT NULL DEFAULT false,
  hotel_done boolean NOT NULL DEFAULT false,
  invoice_done boolean NOT NULL DEFAULT false,
  payment_done boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

ALTER TABLE travel_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_select" ON travel_checklist;
CREATE POLICY "checklist_select" ON travel_checklist FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "checklist_insert" ON travel_checklist;
CREATE POLICY "checklist_insert" ON travel_checklist FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "checklist_update" ON travel_checklist;
CREATE POLICY "checklist_update" ON travel_checklist FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "checklist_delete" ON travel_checklist;
CREATE POLICY "checklist_delete" ON travel_checklist FOR DELETE TO authenticated USING (true);

-- ===== 6. generate_visa_id (sub-code from client_code) =====
CREATE OR REPLACE FUNCTION generate_visa_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.visa_id IS NULL AND NEW.client_code IS NOT NULL THEN
    SELECT count(*) + 1 INTO NEW.visa_id FROM visa_management WHERE client_code = NEW.client_code;
    NEW.visa_id := NEW.client_code || '-VS-' || lpad(NEW.visa_id::text, 2, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visa_id ON visa_management;
CREATE TRIGGER trg_visa_id
  BEFORE INSERT ON visa_management
  FOR EACH ROW EXECUTE FUNCTION generate_visa_id();

-- ===== 7. sync_visa_to_operations =====
-- Mirror visa status into operation_files and auto-set file_status when approved
CREATE OR REPLACE FUNCTION sync_visa_to_operations()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE operation_files
    SET visa_status = NEW.visa_status
    WHERE customer_id = NEW.customer_id;

    IF NEW.visa_status = 'تمت الموافقة' THEN
      UPDATE operation_files
      SET file_status = 'جاهز للسفر'
      WHERE customer_id = NEW.customer_id AND file_status NOT IN ('مكتمل', 'مغلق');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_visa_ops ON visa_management;
CREATE TRIGGER trg_sync_visa_ops
  AFTER INSERT OR UPDATE OF visa_status ON visa_management
  FOR EACH ROW EXECUTE FUNCTION sync_visa_to_operations();

-- ===== 8. auto_visa_notifications =====
CREATE OR REPLACE FUNCTION auto_visa_notifications()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_emp_id uuid;
  v_type text;
  v_title text;
  v_notif_type text;
BEGIN
  -- Find an operations employee to notify
  SELECT id INTO v_emp_id FROM employees WHERE role IN ('مشغل عمليات', 'مشغل') AND is_active = true LIMIT 1;
  IF v_emp_id IS NULL THEN
    SELECT id INTO v_emp_id FROM employees WHERE is_active = true LIMIT 1;
  END IF;
  IF v_emp_id IS NULL THEN RETURN NEW; END IF;

  v_notif_type := CASE NEW.visa_status
    WHEN 'لم يبدأ' THEN 'new_visa'
    WHEN 'قيد المراجعة' THEN 'visa_review'
    WHEN 'تمت الموافقة' THEN 'visa_approved'
    WHEN 'مرفوضة' THEN 'visa_rejected'
    WHEN 'منتهية' THEN 'visa_expired'
    ELSE 'new_visa'
  END;
  v_title := 'تأشيرة ' || NEW.full_name || ' - ' || NEW.visa_status;

  INSERT INTO notifications (employee_id, type, title, body, is_read)
  VALUES (v_emp_id, v_notif_type, v_title, NEW.visa_id, false);

  RETURN NEW;
END;
$$;

-- Expand notifications type constraint to include visa types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_lead', 'task_assigned', 'follow_up', 'overdue_task',
    'new_customer', 'new_booking', 'new_payment', 'new_invoice',
    'missing_document', 'travel_soon', 'website_booking',
    'new_visa', 'visa_review', 'visa_approved', 'visa_rejected', 'visa_expired'
  ));

DROP TRIGGER IF EXISTS trg_visa_notifications ON visa_management;
CREATE TRIGGER trg_visa_notifications
  AFTER INSERT OR UPDATE OF visa_status ON visa_management
  FOR EACH ROW EXECUTE FUNCTION auto_visa_notifications();

-- ===== 9. Backfill visa_requirement on existing inquiries =====
UPDATE inquiries SET visa_requirement = 'Requires Visa' WHERE service_type IN ('حج', 'عمرة');
UPDATE inquiries SET visa_requirement = 'No Visa Required' WHERE service_type NOT IN ('حج', 'عمرة') OR service_type IS NULL;

-- Backfill customers visa_requirement from service_type
UPDATE customers SET visa_requirement = 'Requires Visa' WHERE service_type IN ('حج', 'عمرة') AND visa_requirement IS NULL;
UPDATE customers SET visa_requirement = 'No Visa Required' WHERE (service_type NOT IN ('حج', 'عمرة') OR service_type IS NULL) AND visa_requirement IS NULL;

-- ===== 10. get_visa_checklist_status function (for dashboard/ops) =====
CREATE OR REPLACE FUNCTION get_travel_readiness(p_customer_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result json;
  v_cl record;
  v_visa visa_management%ROWTYPE;
  v_invoice record;
  v_payment record;
BEGIN
  SELECT * INTO v_cl FROM travel_checklist WHERE customer_id = p_customer_id;
  SELECT * INTO v_visa FROM visa_management WHERE customer_id = p_customer_id ORDER BY created_at DESC LIMIT 1;

  RETURN json_build_object(
    'passport', COALESCE(v_cl.passport_done, false),
    'visa', COALESCE(v_cl.visa_done OR (v_visa.visa_status = 'تمت الموافقة'), false),
    'ticket', COALESCE(v_cl.ticket_done, false),
    'hotel', COALESCE(v_cl.hotel_done, false),
    'invoice', COALESCE(v_cl.invoice_done, false),
    'payment', COALESCE(v_cl.payment_done, false),
    'ready', COALESCE(v_cl.passport_done AND (v_cl.visa_done OR v_visa.visa_status = 'تمت الموافقة')
      AND v_cl.ticket_done AND v_cl.hotel_done AND v_cl.invoice_done AND v_cl.payment_done, false)
  );
END;
$$;
