-- ===== Fix auto_transfer_to_operations for Foug clients =====
-- Exclude clients of type 'فوج' from being automatically transferred to operations individual pipeline upon payment approval

CREATE OR REPLACE FUNCTION auto_transfer_to_operations()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_op operation_files%ROWTYPE;
  v_emp_name text;
  v_client_type text;
BEGIN
  IF (OLD.approval_status IS DISTINCT FROM NEW.approval_status) AND NEW.approval_status = 'معتمد' THEN
    
    -- Check client type
    SELECT client_type INTO v_client_type FROM customers WHERE id = NEW.customer_id;
    
    -- Exclude group clients (فوج) from individual operations transfer
    IF v_client_type = 'فوج' THEN
      RETURN NEW;
    END IF;

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
