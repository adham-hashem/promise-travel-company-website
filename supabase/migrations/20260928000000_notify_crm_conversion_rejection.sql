-- Keep a CRM rejection, its audit entry and the requester's notification in one transaction.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_lead', 'task_assigned', 'task_reply', 'follow_up', 'overdue_task',
    'new_customer', 'new_booking', 'new_payment', 'new_invoice',
    'missing_document', 'document_required', 'travel_soon', 'urgent_travel_issue',
    'website_booking', 'new_visa', 'visa_review', 'visa_approved', 'visa_rejected',
    'visa_expired', 'visa_incomplete', 'accounts_approved', 'operations_ready',
    'flight_ready', 'ticket_issued', 'installment_overdue', 'installment_due_soon',
    'installment_due_today', 'booking_pending', 'approval_request',
    'crm_conversion_rejected'
  ));

-- Employee IDs and authentication profile IDs are distinct; match their emails.
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.employees e ON e.email = up.email
      WHERE up.id = auth.uid() AND e.id = notifications.employee_id
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'مالك النظام', 'مدير النظام', 'مدير المبيعات')
    )
  );

CREATE OR REPLACE FUNCTION public.record_crm_conversion_rejection()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requester_employee_id uuid;
  reviewer_employee_id uuid;
  inquiry_name text;
  rejection_reason text;
BEGIN
  IF NEW.type <> 'crm_conversion' OR NEW.record_type <> 'inquiries'
     OR OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status <> 'rejected' THEN
    RETURN NEW;
  END IF;

  rejection_reason := btrim(COALESCE(NEW.notes, ''));
  IF rejection_reason = '' THEN
    RAISE EXCEPTION 'A CRM conversion rejection requires a reason';
  END IF;

  SELECT e.id INTO requester_employee_id
  FROM public.user_profiles up
  JOIN public.employees e ON lower(e.email) = lower(up.email)
  WHERE up.id = NEW.requested_by
  LIMIT 1;

  SELECT customer_name INTO inquiry_name
  FROM public.inquiries WHERE id = NEW.record_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry for CRM conversion request % was not found', NEW.id;
  END IF;

  IF requester_employee_id IS NULL THEN
    SELECT crm_conversion_requested_by INTO requester_employee_id
    FROM public.inquiries WHERE id = NEW.record_id;
  END IF;
  IF requester_employee_id IS NULL THEN
    RAISE EXCEPTION 'Requester employee for CRM conversion request % was not found', NEW.id;
  END IF;

  SELECT e.id INTO reviewer_employee_id
  FROM public.user_profiles up
  JOIN public.employees e ON lower(e.email) = lower(up.email)
  WHERE up.id = NEW.reviewed_by
  LIMIT 1;

  UPDATE public.inquiries SET
    crm_conversion_status = 'rejected',
    crm_conversion_reviewed_by = reviewer_employee_id,
    crm_conversion_reviewed_at = COALESCE(NEW.reviewed_at, now()),
    crm_conversion_rejection_reason = rejection_reason,
    updated_at = now()
  WHERE id = NEW.record_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
  VALUES (reviewer_employee_id, 'reject_crm_conversion', 'inquiry', NEW.record_id,
          jsonb_build_object('request_id', NEW.id, 'reason', rejection_reason));

  INSERT INTO public.notifications (
    employee_id, type, title, body, is_read, target_page, target_record_id,
    requires_action, unique_key
  ) VALUES (
    requester_employee_id, 'crm_conversion_rejected', 'تم رفض تحويل العميل إلى CRM',
    'العميل: ' || inquiry_name || ' — سبب الرفض: ' || rejection_reason,
    false, 'inquiries', NEW.record_id, true,
    'crm-conversion-rejected:' || NEW.id || ':' || requester_employee_id
  ) ON CONFLICT (unique_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_crm_conversion_rejection ON public.approval_requests;
CREATE TRIGGER trg_record_crm_conversion_rejection
  AFTER UPDATE OF status ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.record_crm_conversion_rejection();
