-- Flexible quotations for full travel programs and standalone tourism services.
CREATE TABLE IF NOT EXISTS quotation_program_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO quotation_program_grades (name, sort_order)
VALUES
  ('VIP', 1),
  ('4 نجوم', 2),
  ('اقتصادي مميز', 3),
  ('اقتصادي عادي', 4)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  quotation_type text NOT NULL CHECK (quotation_type IN ('program', 'services')),
  title text NOT NULL,
  quotation_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  program_section text,
  program_grade text,
  departure_date date,
  return_date date,
  days_count integer,
  nights_count integer,
  program_details text,
  hotel_details text,
  flight_details text,
  transport_details text,
  payment_policy text,
  terms_and_conditions text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  total_discount numeric(12,2) NOT NULL DEFAULT 0,
  total_tax numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'converted', 'cancelled')),
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  description text,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);

ALTER TABLE quotation_program_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotation_program_grades_select_auth" ON quotation_program_grades;
CREATE POLICY "quotation_program_grades_select_auth" ON quotation_program_grades FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "quotation_program_grades_manage_auth" ON quotation_program_grades;
CREATE POLICY "quotation_program_grades_manage_auth" ON quotation_program_grades FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "quotations_select_auth" ON quotations;
CREATE POLICY "quotations_select_auth" ON quotations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "quotations_insert_auth" ON quotations;
CREATE POLICY "quotations_insert_auth" ON quotations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "quotations_update_auth" ON quotations;
CREATE POLICY "quotations_update_auth" ON quotations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "quotations_delete_auth" ON quotations;
CREATE POLICY "quotations_delete_auth" ON quotations FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "quotation_items_select_auth" ON quotation_items;
CREATE POLICY "quotation_items_select_auth" ON quotation_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "quotation_items_insert_auth" ON quotation_items;
CREATE POLICY "quotation_items_insert_auth" ON quotation_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "quotation_items_update_auth" ON quotation_items;
CREATE POLICY "quotation_items_update_auth" ON quotation_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "quotation_items_delete_auth" ON quotation_items;
CREATE POLICY "quotation_items_delete_auth" ON quotation_items FOR DELETE TO authenticated USING (true);
