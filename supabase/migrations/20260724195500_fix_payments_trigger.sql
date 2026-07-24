CREATE OR REPLACE FUNCTION notify_accounts_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$$
DECLARE
  v_cust_name text;
  v_booking_id text;
  v_emp_id uuid;
BEGIN
  SELECT name INTO v_cust_name FROM customers WHERE id = NEW.customer_id;
  SELECT id::text INTO v_booking_id FROM bookings WHERE id = NEW.booking_id;

  -- Notify accountants
  SELECT e.id INTO v_emp_id
  FROM employees e
  WHERE e.role IN ('محاسب', 'مدير حسابات') AND e.is_active = true
  LIMIT 1;

  IF v_emp_id IS NULL THEN
    SELECT id INTO v_emp_id FROM employees LIMIT 1;
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
$$$;
