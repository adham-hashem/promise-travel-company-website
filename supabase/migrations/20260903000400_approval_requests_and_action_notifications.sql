-- Visitor bookings must be accepted from the public website and reviewed in inquiries first.
DROP POLICY IF EXISTS "inquiries_insert_website_public" ON inquiries;
CREATE POLICY "inquiries_insert_website_public" ON inquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (source = 'الموقع الإلكتروني');

DROP POLICY IF EXISTS "documents_insert_website_inquiry_public" ON documents;
CREATE POLICY "documents_insert_website_inquiry_public" ON documents
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    inquiry_id IS NOT NULL
    AND customer_id IS NULL
    AND (file_path LIKE 'website-inquiries/%')
  );

-- Approval requests need enough metadata to audit approvals and rejections.
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

-- Central actionable notifications.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_page text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_record_id uuid;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS requires_action boolean NOT NULL DEFAULT true;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS unique_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_key
  ON notifications(unique_key);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_lead', 'task_assigned', 'follow_up', 'overdue_task',
    'new_customer', 'new_booking', 'new_payment', 'new_invoice',
    'missing_document', 'document_required', 'travel_soon', 'urgent_travel_issue',
    'website_booking', 'new_visa', 'visa_review', 'visa_approved', 'visa_rejected',
    'visa_expired', 'visa_incomplete', 'accounts_approved', 'operations_ready',
    'flight_ready', 'ticket_issued', 'installment_overdue', 'installment_due_soon',
    'installment_due_today', 'booking_pending', 'approval_request'
  ));

CREATE OR REPLACE FUNCTION notify_managers_for_approval_request()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (
      employee_id, type, title, body, is_read, target_page, target_record_id,
      requires_action, unique_key
    )
    SELECT
      e.id,
      'approval_request',
      'طلب موافقة جديد',
      COALESCE(NEW.reason, 'عملية حساسة بانتظار موافقة المدير'),
      false,
      'approval-requests',
      NEW.id,
      true,
      'approval-request:' || NEW.id || ':' || e.id
    FROM employees e
    JOIN user_profiles up ON up.email = e.email
    WHERE e.is_active = true
      AND up.status = 'نشط'
      AND up.role IN ('super_admin', 'مالك النظام', 'مدير النظام', 'مدير المبيعات')
    ON CONFLICT (unique_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_managers_for_approval_request ON approval_requests;
CREATE TRIGGER trg_notify_managers_for_approval_request
  AFTER INSERT ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION notify_managers_for_approval_request();

CREATE OR REPLACE FUNCTION notify_staff_for_website_inquiry()
RETURNS trigger AS $$
BEGIN
  IF NEW.source = 'الموقع الإلكتروني' THEN
    INSERT INTO notifications (
      employee_id, type, title, body, is_read, target_page, target_record_id,
      requires_action, unique_key
    )
    SELECT
      e.id,
      'website_booking',
      'حجز جديد من الموقع',
      NEW.customer_name || ' - يحتاج متابعة في الاستعلامات',
      false,
      'inquiries',
      NEW.id,
      true,
      'website-inquiry:' || NEW.id || ':' || e.id
    FROM employees e
    LEFT JOIN user_profiles up ON up.email = e.email
    WHERE e.is_active = true
      AND (
        e.role IN ('إضافة عملاء', 'مدير المبيعات', 'مندوب مبيعات')
        OR up.role IN ('super_admin', 'مالك النظام', 'مدير النظام', 'مدير المبيعات')
      )
    ON CONFLICT (unique_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_staff_for_website_inquiry ON inquiries;
CREATE TRIGGER trg_notify_staff_for_website_inquiry
  AFTER INSERT ON inquiries
  FOR EACH ROW EXECUTE FUNCTION notify_staff_for_website_inquiry();

CREATE OR REPLACE FUNCTION refresh_action_notifications()
RETURNS void AS $$
BEGIN
  -- Installments: overdue, due today, and due soon.
  INSERT INTO notifications (employee_id, type, title, body, is_read, target_page, target_record_id, requires_action, unique_key)
  SELECT e.id, 'installment_overdue', 'قسط متأخر',
         c.name || ' - مطلوب متابعة السداد: ' || fi.amount::text || ' ج.م',
         false, 'installments', fi.id, true, 'installment-overdue:' || fi.id || ':' || e.id
  FROM financial_installments fi
  JOIN customers c ON c.id = fi.customer_id
  JOIN employees e ON e.role = 'محاسب' AND e.is_active = true
  WHERE fi.status = 'مستحق' AND fi.due_date < CURRENT_DATE
  ON CONFLICT (unique_key) DO NOTHING;

  INSERT INTO notifications (employee_id, type, title, body, is_read, target_page, target_record_id, requires_action, unique_key)
  SELECT e.id, 'installment_due_today', 'قسط مستحق اليوم',
         c.name || ' - مطلوب تحصيل قسط اليوم: ' || fi.amount::text || ' ج.م',
         false, 'installments', fi.id, true, 'installment-today:' || fi.id || ':' || e.id
  FROM financial_installments fi
  JOIN customers c ON c.id = fi.customer_id
  JOIN employees e ON e.role = 'محاسب' AND e.is_active = true
  WHERE fi.status = 'مستحق' AND fi.due_date = CURRENT_DATE
  ON CONFLICT (unique_key) DO NOTHING;

  INSERT INTO notifications (employee_id, type, title, body, is_read, target_page, target_record_id, requires_action, unique_key)
  SELECT e.id, 'installment_due_soon', 'قسط اقترب موعده',
         c.name || ' - قسط مستحق خلال 3 أيام: ' || fi.amount::text || ' ج.م',
         false, 'installments', fi.id, true, 'installment-soon:' || fi.id || ':' || e.id
  FROM financial_installments fi
  JOIN customers c ON c.id = fi.customer_id
  JOIN employees e ON e.role = 'محاسب' AND e.is_active = true
  WHERE fi.status = 'مستحق' AND fi.due_date > CURRENT_DATE AND fi.due_date <= CURRENT_DATE + 3
  ON CONFLICT (unique_key) DO NOTHING;

  -- Documents: passport is required for Hajj/Umrah customers before operation/travel.
  INSERT INTO notifications (employee_id, type, title, body, is_read, target_page, target_record_id, requires_action, unique_key)
  SELECT COALESCE(c.assigned_employee_id, b.employee_id), 'missing_document', 'مستند ناقص',
         c.name || ' - جواز السفر مطلوب ولم يتم رفعه',
         false, 'customer-details', c.id, true, 'missing-passport:' || c.id || ':' || COALESCE(c.assigned_employee_id, b.employee_id)
  FROM customers c
  LEFT JOIN bookings b ON b.customer_id = c.id AND b.status <> 'ملغي'
  WHERE c.service_type IN ('حج', 'عمرة')
    AND COALESCE(c.assigned_employee_id, b.employee_id) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM documents d
      WHERE d.customer_id = c.id AND d.doc_type IN ('جواز سفر', 'جواز السفر') AND d.status <> 'مرفوض'
    )
  ON CONFLICT (unique_key) DO NOTHING;

  -- Travel: upcoming trips need attention.
  INSERT INTO notifications (employee_id, type, title, body, is_read, target_page, target_record_id, requires_action, unique_key)
  SELECT COALESCE(b.employee_id, c.assigned_employee_id), 'travel_soon', 'موعد سفر قريب',
         c.name || ' - السفر خلال 7 أيام',
         false, 'customer-details', c.id, true, 'travel-soon:' || b.id || ':' || COALESCE(b.employee_id, c.assigned_employee_id)
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.status <> 'ملغي'
    AND b.travel_date IS NOT NULL
    AND b.travel_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
    AND COALESCE(b.employee_id, c.assigned_employee_id) IS NOT NULL
  ON CONFLICT (unique_key) DO NOTHING;

  -- Visas: incomplete visa close to travel.
  INSERT INTO notifications (employee_id, type, title, body, is_read, target_page, target_record_id, requires_action, unique_key)
  SELECT COALESCE(assigned_emp.id, c.assigned_employee_id), 'visa_incomplete', 'تأشيرة غير مكتملة',
         COALESCE(c.name, v.full_name) || ' - مطلوب استكمال التأشيرة',
         false, 'visa', v.id, true, 'visa-incomplete:' || v.id || ':' || COALESCE(assigned_emp.id, c.assigned_employee_id)
  FROM visa_management v
  LEFT JOIN customers c ON c.id = v.customer_id
  LEFT JOIN bookings b ON b.id = v.booking_id
  LEFT JOIN user_profiles assigned_profile ON assigned_profile.id = v.assigned_employee_id
  LEFT JOIN employees assigned_emp ON assigned_emp.email = assigned_profile.email AND assigned_emp.is_active = true
  WHERE v.visa_status <> 'تمت الموافقة'
    AND (b.travel_date IS NULL OR b.travel_date <= CURRENT_DATE + 14)
    AND COALESCE(assigned_emp.id, c.assigned_employee_id) IS NOT NULL
  ON CONFLICT (unique_key) DO NOTHING;

  -- Bookings: pending bookings need follow-up by responsible employee.
  INSERT INTO notifications (employee_id, type, title, body, is_read, target_page, target_record_id, requires_action, unique_key)
  SELECT COALESCE(b.employee_id, c.assigned_employee_id), 'booking_pending', 'حجز معلق يحتاج متابعة',
         c.name || ' - مطلوب تأكيد أو إجراء على الحجز',
         false, 'bookings', b.id, true, 'booking-pending:' || b.id || ':' || COALESCE(b.employee_id, c.assigned_employee_id)
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.status = 'معلق'
    AND COALESCE(b.employee_id, c.assigned_employee_id) IS NOT NULL
  ON CONFLICT (unique_key) DO NOTHING;

  -- Hide actionable notifications whose source is already resolved.
  UPDATE notifications n SET resolved_at = now(), requires_action = false
  WHERE n.requires_action = true
    AND (
      (n.type IN ('installment_overdue', 'installment_due_today', 'installment_due_soon')
        AND NOT EXISTS (SELECT 1 FROM financial_installments fi WHERE fi.id = n.target_record_id AND fi.status = 'مستحق'))
      OR (n.type = 'booking_pending'
        AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = n.target_record_id AND b.status = 'معلق'))
      OR (n.type = 'approval_request'
        AND NOT EXISTS (SELECT 1 FROM approval_requests ar WHERE ar.id = n.target_record_id AND ar.status = 'pending'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION refresh_action_notifications() TO authenticated;
