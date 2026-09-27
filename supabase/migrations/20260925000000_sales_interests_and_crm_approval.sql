-- Sales interests, auditable follow-ups and approval-gated CRM conversion.
CREATE TABLE IF NOT EXISTS public.interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  interest_start_date date NOT NULL,
  interest_end_date date,
  program_start_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  color varchar(7) NOT NULL DEFAULT '#D4A017',
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inquiry_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  assigned_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','follow_up','interested','not_interested','closed')),
  last_follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(inquiry_id, interest_id)
);

CREATE TABLE IF NOT EXISTS public.inquiry_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  interest_id uuid REFERENCES public.interests(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  result text NOT NULL CHECK (result IN ('تم الاتصال','لم يرد','سيتم التواصل لاحقًا','مهتم','غير مهتم','طلب معلومات إضافية','تم إرسال العرض','تم تحديد موعد متابعة جديد')),
  notes text,
  next_follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS crm_conversion_status text NOT NULL DEFAULT 'not_requested'
    CHECK (crm_conversion_status IN ('not_requested','pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS crm_conversion_requested_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crm_conversion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS crm_conversion_reviewed_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crm_conversion_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS crm_conversion_rejection_reason text;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS crm_stage text NOT NULL DEFAULT 'new'
    CHECK (crm_stage IN ('new','documents_pending','program_details_pending','ready','confirmed','booked')),
  ADD COLUMN IF NOT EXISTS profile_photo_path text,
  ADD COLUMN IF NOT EXISTS program_name text,
  ADD COLUMN IF NOT EXISTS program_group text,
  ADD COLUMN IF NOT EXISTS travel_date date,
  ADD COLUMN IF NOT EXISTS return_date date,
  ADD COLUMN IF NOT EXISTS airline text,
  ADD COLUMN IF NOT EXISTS transportation text,
  ADD COLUMN IF NOT EXISTS travelers_count integer,
  ADD COLUMN IF NOT EXISTS total_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2) DEFAULT 0;

ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interests_authenticated_all" ON public.interests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inquiry_interests_authenticated_all" ON public.inquiry_interests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inquiry_follow_ups_authenticated_all" ON public.inquiry_follow_ups FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_interest_program_date ON public.interests(program_start_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inquiry_interests_interest ON public.inquiry_interests(interest_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_followups_inquiry_date ON public.inquiry_follow_ups(inquiry_id, created_at DESC);

-- One query powers both the 15-day sales reminder and the 5-day management escalation.
CREATE OR REPLACE VIEW public.interest_follow_up_alerts AS
SELECT i.id AS interest_id, i.name, i.program_start_date, i.color,
       (i.program_start_date - current_date) AS days_remaining,
       count(ii.id)::int AS total_customers,
       count(ii.id) FILTER (WHERE ii.last_follow_up_at IS NOT NULL)::int AS contacted_customers,
       count(ii.id) FILTER (WHERE ii.last_follow_up_at IS NULL)::int AS uncontacted_customers,
       array_remove(array_agg(DISTINCT ii.assigned_employee_id) FILTER (WHERE ii.last_follow_up_at IS NULL), NULL) AS responsible_employee_ids
FROM public.interests i
JOIN public.inquiry_interests ii ON ii.interest_id = i.id
WHERE i.status = 'active' AND current_date >= i.program_start_date - 15
  AND ii.last_follow_up_at IS NULL
GROUP BY i.id, i.name, i.program_start_date, i.color;

CREATE OR REPLACE FUNCTION public.sync_inquiry_interest_follow_up() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.interest_id IS NOT NULL THEN
    UPDATE inquiry_interests
       SET last_follow_up_at = NEW.created_at,
           status = CASE NEW.result WHEN 'مهتم' THEN 'interested' WHEN 'غير مهتم' THEN 'not_interested' ELSE 'contacted' END
     WHERE inquiry_id = NEW.inquiry_id AND interest_id = NEW.interest_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_inquiry_interest_follow_up ON public.inquiry_follow_ups;
CREATE TRIGGER trg_sync_inquiry_interest_follow_up AFTER INSERT ON public.inquiry_follow_ups
FOR EACH ROW EXECUTE FUNCTION public.sync_inquiry_interest_follow_up();
