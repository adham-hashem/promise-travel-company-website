-- Accounting Module: payments, installments, expenses, employee_commissions
-- All tables RLS-enabled with authenticated CRUD policies (ownership via auth.uid not applicable
-- here since these are company financial records managed by staff — we use authenticated role).

-- 1. PAYMENTS — individual payment transactions linked to bookings
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'كاش', -- كاش | تحويل بنكي | فودافون كاش | أقساط
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'غير مدفوع', -- غير مدفوع | مدفوع جزئياً | مدفوع بالكامل
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select_auth" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "payments_insert_auth" ON payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "payments_update_auth" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "payments_delete_auth" ON payments FOR DELETE TO authenticated USING (true);

-- 2. INSTALLMENTS — installment plans linked to bookings
CREATE TABLE IF NOT EXISTS installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  number_of_installments integer NOT NULL DEFAULT 1,
  paid_installments integer NOT NULL DEFAULT 0,
  next_due_date date,
  status text NOT NULL DEFAULT 'نشط', -- نشط | متأخر | مكتمل
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installments_select_auth" ON installments FOR SELECT TO authenticated USING (true);
CREATE POLICY "installments_insert_auth" ON installments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "installments_update_auth" ON installments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "installments_delete_auth" ON installments FOR DELETE TO authenticated USING (true);

-- 3. EXPENSES — company expense tracking
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'أخرى', -- رواتب | تسويق | إيجار | إعلانات | تشغيل | أخرى
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_select_auth" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert_auth" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "expenses_update_auth" ON expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "expenses_delete_auth" ON expenses FOR DELETE TO authenticated USING (true);

-- 4. EMPLOYEE_COMMISSIONS — sales commissions per employee
CREATE TABLE IF NOT EXISTS employee_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  bookings_count integer NOT NULL DEFAULT 0,
  total_sales numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0, -- percentage
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'معلق', -- معلق | مدفوع
  period text, -- e.g. "2026-06"
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE employee_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commissions_select_auth" ON employee_commissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "commissions_insert_auth" ON employee_commissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "commissions_update_auth" ON employee_commissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "commissions_delete_auth" ON employee_commissions FOR DELETE TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_installments_booking ON installments(booking_id);
CREATE INDEX IF NOT EXISTS idx_installments_next_due ON installments(next_due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_commissions_employee ON employee_commissions(employee_id);
