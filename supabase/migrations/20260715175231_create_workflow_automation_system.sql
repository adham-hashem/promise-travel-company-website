/*
# Workflow Automation System

## Summary
Creates a fully automated workflow pipeline that moves transactions
electronically between departments (Accounts → Operations → Visa → Flight →
Travel Ready) based on state, with no manual transfer needed. Adds payment
proof upload + accountant approval, flight ticket management, and a workflow
timeline that logs every stage transition with employee, date, department, and
status.

## New Tables
1. `flight_tickets` — issued flight tickets per booking/customer
   - id, booking_id, customer_id, pnr, airline, flight_number,
     departure_airport, arrival_airport, departure_datetime, return_datetime,
     e_ticket_number, ticket_file_path, ticket_file_name, status, issued_by,
     created_at
2. `workflow_timeline` — ordered log of every workflow stage per customer
   - id, customer_id, booking_id, stage, stage_label, department, employee_id,
     employee_name, status, notes, created_at
3. `payment_proofs` — proof documents attached to payments
   - id, payment_id (FK), file_path, file_name, file_size, status, uploaded_by,
     approved_by, approved_at, rejection_reason, created_at

## Modified Tables
- `payments`: add payment_type, proof_file_path, proof_file_name, approved_by,
  approved_at, approval_status, rejection_reason, approved_amount
- `operation_files`: add workflow_stage (tracks current stage in the pipeline)

## Functions / Triggers
- `notify_accounts_on_payment()` — AFTER INSERT on payments: creates
  notification for the accounts department with full transaction details.
- `auto_transfer_to_operations()` — AFTER UPDATE on payments when
  approval_status = 'approved': updates linked operation_file
  financially_approved = true, file_status = 'قيد التجهيز', workflow_stage =
  'operations', and creates notification + workflow_timeline entry.
- `auto_transfer_to_flight()` — AFTER UPDATE on visa_management when
  visa_status = 'تمت الموافقة' AND visa_upload_status = 'Uploaded': updates
  operation_file workflow_stage = 'flight', creates notification + timeline.
- `auto_complete_on_ticket()` — AFTER INSERT on flight_tickets: updates
  operation_file file_status = 'جاهز للسفر', workflow_stage = 'ready', and
  creates timeline entry marking travel readiness.
- `log_workflow_stage()` — utility function to insert a workflow_timeline row.

## Security
- RLS enabled on all new tables with authenticated CRUD policies.
*/
;

-- ===== 1. flight_tickets table =====
CREATE TABLE IF NOT EXISTS flight_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  pnr text,
  airline text,
  flight_number text,
  departure_airport text,
  arrival_airport text,
  departure_datetime timestamptz,
  return_datetime timestamptz,
  e_ticket_number text,
  ticket_file_path text,
  ticket_file_name text,
  status text NOT NULL DEFAULT 'صادر' CHECK (status IN ('صادر', 'ملغي', 'مؤكد')),
  issued_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE flight_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flight_select" ON flight_tickets;
CREATE POLICY "flight_select" ON flight_tickets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "flight_insert" ON flight_tickets;
CREATE POLICY "flight_insert" ON flight_tickets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "flight_update" ON flight_tickets;
CREATE POLICY "flight_update" ON flight_tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "flight_delete" ON flight_tickets;
CREATE POLICY "flight_delete" ON flight_tickets FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_flight_customer ON flight_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_flight_booking ON flight_tickets(booking_id);

-- ===== 2. workflow_timeline table =====
CREATE TABLE IF NOT EXISTS workflow_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  stage text NOT NULL,
  stage_label text NOT NULL,
  department text,
  employee_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  employee_name text,
  status text NOT NULL DEFAULT 'مكتمل',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timeline_select" ON workflow_timeline;
CREATE POLICY "timeline_select" ON workflow_timeline FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "timeline_insert" ON workflow_timeline;
CREATE POLICY "timeline_insert" ON workflow_timeline FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "timeline_update" ON workflow_timeline;
CREATE POLICY "timeline_update" ON workflow_timeline FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "timeline_delete" ON workflow_timeline;
CREATE POLICY "timeline_delete" ON workflow_timeline FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_timeline_customer ON workflow_timeline(customer_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created ON workflow_timeline(created_at);

-- ===== 3. payment_proofs table =====
CREATE TABLE IF NOT EXISTS payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  status text NOT NULL DEFAULT 'مرفوع' CHECK (status IN ('مرفوع', 'معتمد', 'مرفوض')),
  uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "proofs_select" ON payment_proofs;
CREATE POLICY "proofs_select" ON payment_proofs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "proofs_insert" ON payment_proofs;
CREATE POLICY "proofs_insert" ON payment_proofs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "proofs_update" ON payment_proofs;
CREATE POLICY "proofs_update" ON payment_proofs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "proofs_delete" ON payment_proofs;
CREATE POLICY "proofs_delete" ON payment_proofs FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_proofs_payment ON payment_proofs(payment_id);

-- ===== 4. Add columns to payments =====
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'دفعة عادية';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_file_path text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_file_name text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'بانتظار الاعتماد'
  CHECK (approval_status IN ('بانتظار الاعتماد', 'معتمد', 'مرفوض'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_amount numeric;

-- ===== 5. Add workflow_stage to operation_files =====
ALTER TABLE operation_files ADD COLUMN IF NOT EXISTS workflow_stage text DEFAULT 'new'
  CHECK (workflow_stage IN ('new', 'accounts', 'operations', 'visa', 'flight', 'ready', 'completed'));
CREATE INDEX IF NOT EXISTS idx_ops_workflow_stage ON operation_files(workflow_stage);

-- ===== 6. Utility: log workflow stage =====
CREATE OR REPLACE FUNCTION log_workflow_stage(
  p_customer_id uuid,
  p_stage text,
  p_stage_label text,
  p_department text DEFAULT NULL,
  p_employee_id uuid DEFAULT NULL,
  p_employee_name text DEFAULT NULL,
  p_status text DEFAULT 'مكتمل',
  p_notes text DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO workflow_timeline (customer_id, booking_id, stage, stage_label, department, employee_id, employee_name, status, notes)
  VALUES (p_customer_id, p_booking_id, p_stage, p_stage_label, p_department, p_employee_id, p_employee_name, p_status, p_notes);
END;
$$;

-- ===== 7. notify_accounts_on_payment =====
CREATE OR REPLACE FUNCTION notify_accounts_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_emp_id uuid;
  v_cust_name text;
  v_booking_id text;
BEGIN
  SELECT name INTO v_cust_name FROM customers WHERE id = NEW.customer_id;
  SELECT id::text INTO v_booking_id FROM bookings WHERE id = NEW.booking_id;

  -- Notify accountants
  SELECT up.id INTO v_emp_id
  FROM user_profiles up
  JOIN employees e ON e.id = up.id
  WHERE e.role IN ('محاسب', 'مدير حسابات') AND e.is_active = true
  LIMIT 1;

  IF v_emp_id IS NULL THEN
    SELECT id INTO v_emp_id FROM user_profiles LIMIT 1;
  END IF;

  IF v_emp_id IS NOT NULL THEN
    INSERT INTO notifications (employee_id, type, title, body, is_read)
    VALUES (
      v_emp_id,
      'new_payment',
      'عملية دفع جديدة: ' || COALESCE(v_cust_name, 'عميل'),
      'Client Code: ' || COALESCE((SELECT client_code FROM customers WHERE id = NEW.customer_id), '—') ||
      ' | المبلغ: ' || NEW.amount::text ||
      ' | الطريقة: ' || NEW.payment_method ||
      ' | النوع: ' || COALESCE(NEW.payment_type, 'دفعة عادية'),
      false
    );
  END IF;

  -- Log workflow timeline
  PERFORM log_workflow_stage(
    NEW.customer_id,
    'payment',
    'تسجيل دفعة',
    'الحسابات',
    NEW.employee_id,
    (SELECT name FROM user_profiles WHERE id = NEW.employee_id),
    'مكتمل',
    'مبلغ: ' || NEW.amount::text || ' - ' || COALESCE(NEW.payment_type, 'دفعة عادية'),
    NEW.booking_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_accounts ON payments;
CREATE TRIGGER trg_notify_accounts
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION notify_accounts_on_payment();

-- ===== 8. auto_transfer_to_operations =====
-- When payment is approved, auto-transfer to operations
CREATE OR REPLACE FUNCTION auto_transfer_to_operations()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_op operation_files%ROWTYPE;
  v_emp_name text;
BEGIN
  IF (OLD.approval_status IS DISTINCT FROM NEW.approval_status) AND NEW.approval_status = 'معتمد' THEN
    -- Get approver name
    SELECT name INTO v_emp_name FROM user_profiles WHERE id = NEW.approved_by;

    -- Find linked operation file
    SELECT * INTO v_op FROM operation_files
    WHERE customer_id = NEW.customer_id
    ORDER BY created_at DESC LIMIT 1;

    IF FOUND THEN
      UPDATE operation_files
      SET financially_approved = true,
          file_status = 'قيد التجهيز',
          workflow_stage = 'operations'
      WHERE id = v_op.id;

      -- Notify operations manager
      INSERT INTO notifications (employee_id, type, title, body, is_read)
      SELECT e.id, 'new_payment',
        'ملف جاهز للتشغيل: ' || COALESCE((SELECT name FROM customers WHERE id = NEW.customer_id), ''),
        'Client Code: ' || COALESCE((SELECT client_code FROM customers WHERE id = NEW.customer_id), '—') ||
        ' | تم اعتماد الدفع',
        false
      FROM employees e
      WHERE e.role IN ('مشغل عمليات', 'مشغل', 'مدير تشغيل') AND e.is_active = true;

      -- Log timeline
      PERFORM log_workflow_stage(
        NEW.customer_id,
        'accounts_approval',
        'اعتماد الحسابات',
        'الحسابات',
        NEW.approved_by,
        v_emp_name,
        'مكتمل',
        'تم اعتماد الدفع - المبلغ: ' || NEW.amount::text,
        NEW.booking_id
      );

      PERFORM log_workflow_stage(
        NEW.customer_id,
        'operations_transfer',
        'التحويل إلى التشغيل',
        'التشغيل',
        NULL,
        NULL,
        'مكتمل',
        'تم التحويل التلقائي إلى قسم التشغيل',
        NEW.booking_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_transfer_ops ON payments;
CREATE TRIGGER trg_auto_transfer_ops
  AFTER UPDATE OF approval_status ON payments
  FOR EACH ROW EXECUTE FUNCTION auto_transfer_to_operations();

-- ===== 9. auto_transfer_to_flight =====
-- When visa approved AND uploaded, auto-transfer to flight department
CREATE OR REPLACE FUNCTION auto_transfer_to_flight()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_op operation_files%ROWTYPE;
  v_found boolean := false;
BEGIN
  IF NEW.visa_status = 'تمت الموافقة' AND NEW.visa_upload_status = 'Uploaded' THEN
    -- Check if we already transferred (avoid duplicate)
    SELECT * INTO v_op FROM operation_files
    WHERE customer_id = NEW.customer_id
    ORDER BY created_at DESC LIMIT 1;

    IF FOUND AND v_op.workflow_stage = 'operations' THEN
      UPDATE operation_files
      SET workflow_stage = 'flight'
      WHERE id = v_op.id;

      v_found := true;
    END IF;

    IF v_found THEN
      -- Notify flight department
      INSERT INTO notifications (employee_id, type, title, body, is_read)
      SELECT e.id, 'visa_approved',
        'ملف جاهز للطيران: ' || NEW.full_name,
        'Client Code: ' || COALESCE(NEW.client_code, '—') ||
        ' | Visa ID: ' || COALESCE(NEW.visa_id, '—') ||
        ' | تم اعتماد التأشيرة ورفع الملف',
        false
      FROM employees e
      WHERE e.role IN ('موظف طيران', 'مسؤول طيران', 'مدير تشغيل') AND e.is_active = true;

      -- Log timeline
      PERFORM log_workflow_stage(
        NEW.customer_id,
        'visa_approved',
        'اعتماد التأشيرة',
        'التأشيرات',
        NEW.assigned_employee_id,
        (SELECT name FROM employees WHERE id = NEW.assigned_employee_id),
        'مكتمل',
        'تمت الموافقة على التأشيرة ورفع الملف'
      );

      PERFORM log_workflow_stage(
        NEW.customer_id,
        'flight_transfer',
        'التحويل إلى قسم الطيران',
        'الطيران',
        NULL,
        NULL,
        'مكتمل',
        'تم التحويل التلقائي إلى قسم الطيران'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_transfer_flight ON visa_management;
CREATE TRIGGER trg_auto_transfer_flight
  AFTER UPDATE OF visa_status, visa_upload_status ON visa_management
  FOR EACH ROW EXECUTE FUNCTION auto_transfer_to_flight();

-- ===== 10. auto_complete_on_ticket =====
-- When flight ticket is issued, mark as ready to travel
CREATE OR REPLACE FUNCTION auto_complete_on_ticket()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_op operation_files%ROWTYPE;
  v_cust_name text;
  v_emp_name text;
BEGIN
  SELECT name INTO v_cust_name FROM customers WHERE id = NEW.customer_id;
  SELECT name INTO v_emp_name FROM user_profiles WHERE id = NEW.issued_by;

  -- Update operation file
  SELECT * INTO v_op FROM operation_files
  WHERE customer_id = NEW.customer_id
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    UPDATE operation_files
    SET file_status = 'جاهز للسفر',
        workflow_stage = 'ready'
    WHERE id = v_op.id;
  END IF;

  -- Log timeline
  PERFORM log_workflow_stage(
    NEW.customer_id,
    'ticket_issued',
    'إصدار تذكرة الطيران',
    'الطيران',
    NEW.issued_by,
    v_emp_name,
    'مكتمل',
    'PNR: ' || COALESCE(NEW.pnr, '—') || ' | شركة الطيران: ' || COALESCE(NEW.airline, '—')
  );

  PERFORM log_workflow_stage(
    NEW.customer_id,
    'travel_ready',
    'جاهز للسفر',
    'النظام',
    NULL,
    NULL,
    'مكتمل',
    'جميع المتطلبات مكتملة - العميل جاهز للسفر'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_complete_ticket ON flight_tickets;
CREATE TRIGGER trg_auto_complete_ticket
  AFTER INSERT ON flight_tickets
  FOR EACH ROW EXECUTE FUNCTION auto_complete_on_ticket();

-- ===== 11. Expand notifications type constraint =====
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_lead', 'task_assigned', 'follow_up', 'overdue_task',
    'new_customer', 'new_booking', 'new_payment', 'new_invoice',
    'missing_document', 'travel_soon', 'website_booking',
    'new_visa', 'visa_review', 'visa_approved', 'visa_rejected', 'visa_expired',
    'accounts_approved', 'operations_ready', 'flight_ready', 'ticket_issued'
  ));

-- ===== 12. Backfill workflow_stage on existing operation_files =====
UPDATE operation_files SET workflow_stage = 'new' WHERE workflow_stage IS NULL;
