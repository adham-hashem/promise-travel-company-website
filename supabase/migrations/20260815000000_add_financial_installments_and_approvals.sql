-- 20260815000000_add_financial_installments_and_approvals.sql

CREATE TABLE IF NOT EXISTS financial_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'مستحق', -- مستحق, مدفوع, متأخر, ملغي
  notes text,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL, -- link to payment if paid
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE financial_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_installments_select" ON financial_installments FOR SELECT TO authenticated USING (true);
CREATE POLICY "financial_installments_insert" ON financial_installments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "financial_installments_update" ON financial_installments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "financial_installments_delete" ON financial_installments FOR DELETE TO authenticated USING (true);


CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- e.g., 'delete_payment', 'cancel_installment'
  record_id uuid NOT NULL,
  record_type text NOT NULL, -- e.g., 'payments', 'financial_installments'
  requested_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  record_details jsonb -- to store a snapshot of what is being deleted for context
);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_requests_select" ON approval_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_requests_insert" ON approval_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "approval_requests_update" ON approval_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "approval_requests_delete" ON approval_requests FOR DELETE TO authenticated USING (true);
