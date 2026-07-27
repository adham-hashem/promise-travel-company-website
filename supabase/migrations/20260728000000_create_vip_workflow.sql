-- ===== 1. Add is_vip column to customers =====
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_customers_is_vip ON customers(is_vip);

-- ===== 2. Create vip_requests table =====
CREATE TABLE IF NOT EXISTS vip_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id             UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  travel_city             TEXT,
  departure_date          DATE,
  return_date             DATE,
  airline_preference      TEXT,
  flight_class            TEXT, -- e.g., 'Economy', 'Business', 'First Class'
  hotel_preference        TEXT,
  hotel_stars             TEXT,
  room_type               TEXT,
  meal_plan               TEXT,
  view_preference         TEXT,
  transportation_method   TEXT,
  train_preference        TEXT,
  mazarat                 TEXT, -- Sightseeing
  additional_services     TEXT,
  travelers_count         INT NOT NULL DEFAULT 1,
  special_notes           TEXT,
  assigned_vip_manager    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  current_stage           TEXT NOT NULL DEFAULT 'accounts'
                          CHECK (current_stage IN ('accounts', 'operations', 'bookings', 'flights', 'hotels', 'housing', 'visas', 'ready')),
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vip_requests_customer ON vip_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_vip_requests_stage ON vip_requests(current_stage);

-- ===== 3. Create vip_workflow_steps table =====
CREATE TABLE IF NOT EXISTS vip_workflow_steps (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_request_id          UUID NOT NULL REFERENCES vip_requests(id) ON DELETE CASCADE,
  step_key                TEXT NOT NULL, -- e.g. 'pricing', 'payment_approval', etc.
  step_label              TEXT NOT NULL, -- Arabic name
  status                  TEXT NOT NULL DEFAULT 'لم يبدأ', -- 'لم يبدأ', 'قيد التنفيذ', 'تم التأكيد', 'مكتمل', 'ملغي'
  assigned_employee_id    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  execution_date          DATE,
  department_notes        TEXT,
  updated_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vip_request_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_vws_request ON vip_workflow_steps(vip_request_id);

-- ===== 4. Enable RLS and add policies =====
ALTER TABLE vip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_workflow_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vip_requests_select" ON vip_requests;
CREATE POLICY "vip_requests_select" ON vip_requests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "vip_requests_insert" ON vip_requests;
CREATE POLICY "vip_requests_insert" ON vip_requests FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vip_requests_update" ON vip_requests;
CREATE POLICY "vip_requests_update" ON vip_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vip_requests_delete" ON vip_requests;
CREATE POLICY "vip_requests_delete" ON vip_requests FOR DELETE TO authenticated USING (true);


DROP POLICY IF EXISTS "vws_select" ON vip_workflow_steps;
CREATE POLICY "vws_select" ON vip_workflow_steps FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "vws_insert" ON vip_workflow_steps;
CREATE POLICY "vws_insert" ON vip_workflow_steps FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vws_update" ON vip_workflow_steps;
CREATE POLICY "vws_update" ON vip_workflow_steps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vws_delete" ON vip_workflow_steps;
CREATE POLICY "vws_delete" ON vip_workflow_steps FOR DELETE TO authenticated USING (true);

-- ===== 5. Trigger to auto-create workflow steps on VIP request insertion =====
CREATE OR REPLACE FUNCTION initialize_vip_workflow_steps()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO vip_workflow_steps (vip_request_id, step_key, step_label, status) VALUES
    (NEW.id, 'pricing', 'حالة تسعير العرض', 'لم يبدأ'),
    (NEW.id, 'payment_approval', 'حالة اعتماد الدفعة', 'لم يبدأ'),
    (NEW.id, 'hotel_booking', 'حالة حجز الفندق', 'لم يبدأ'),
    (NEW.id, 'hotel_confirmation', 'تأكيد الفندق', 'لم يبدأ'),
    (NEW.id, 'flight_booking', 'حجز الطيران', 'لم يبدأ'),
    (NEW.id, 'flight_issuance', 'إصدار التذكرة', 'لم يبدأ'),
    (NEW.id, 'train_booking', 'حجز القطار', 'لم يبدأ'),
    (NEW.id, 'train_confirmation', 'تأكيد حجز القطار', 'لم يبدأ'),
    (NEW.id, 'visa_processing', 'استخراج التأشيرة', 'لم يبدأ'),
    (NEW.id, 'visa_issuance', 'إصدار التأشيرة', 'لم يبدأ'),
    (NEW.id, 'itinerary_prep', 'تجهيز برنامج الرحلة', 'لم يبدأ'),
    (NEW.id, 'travel_ready', 'جاهز للسفر', 'لم يبدأ');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_init_vip_steps ON vip_requests;
CREATE TRIGGER trg_init_vip_steps
  AFTER INSERT ON vip_requests
  FOR EACH ROW EXECUTE FUNCTION initialize_vip_workflow_steps();

-- ===== 6. Update get_customer_full_data RPC function to return VIP data =====
CREATE OR REPLACE FUNCTION get_customer_full_data(p_client_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_customer json;
  v_bookings json;
  v_invoices json;
  v_payments json;
  v_documents json;
  v_ops json;
  v_tasks json;
  v_inquiries json;
  v_internal json;
  v_visas json;
  v_tickets json;
  v_timeline json;
  v_op_docs json;
  v_vip_request json;
  v_vip_steps json;
BEGIN
  SELECT row_to_json(c) INTO v_customer
  FROM (SELECT * FROM customers WHERE client_code = p_client_code LIMIT 1) c;

  IF v_customer IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT COALESCE(json_agg(row_to_json(b)), '[]'::json) INTO v_bookings
  FROM (
    SELECT bk.*, pk.name AS package_name, pk.type AS package_type, e.name AS employee_name
    FROM bookings bk
    LEFT JOIN packages pk ON pk.id = bk.package_id
    LEFT JOIN employees e ON e.id = bk.employee_id
    WHERE bk.customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY bk.created_at DESC
  ) b;

  SELECT COALESCE(json_agg(row_to_json(i)), '[]'::json) INTO v_invoices
  FROM (
    SELECT inv.*, h.name AS hotel_name
    FROM invoices inv
    LEFT JOIN hotels h ON h.id = inv.hotel_id
    WHERE inv.customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY inv.created_at DESC
  ) i;

  SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json) INTO v_payments
  FROM (
    SELECT * FROM payments
    WHERE customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY payment_date DESC
  ) p;

  SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json) INTO v_documents
  FROM (
    SELECT * FROM documents
    WHERE customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY created_at DESC
  ) d;

  SELECT COALESCE(json_agg(row_to_json(o)), '[]'::json) INTO v_ops
  FROM (
    SELECT * FROM operation_files
    WHERE customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY created_at DESC
  ) o;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_tasks
  FROM (
    SELECT * FROM tasks
    WHERE client_code = p_client_code
    ORDER BY created_at DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json) INTO v_inquiries
  FROM (
    SELECT * FROM inquiries
    WHERE converted_customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY created_at DESC
  ) q;

  SELECT COALESCE(json_agg(row_to_json(it)), '[]'::json) INTO v_internal
  FROM (
    SELECT itb.*, it.name AS trip_name
    FROM internal_trip_bookings itb
    LEFT JOIN internal_trips it ON it.id = itb.trip_id
    WHERE itb.phone = (SELECT phone FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY itb.created_at DESC
  ) it;

  SELECT COALESCE(json_agg(row_to_json(v)), '[]'::json) INTO v_visas
  FROM (
    SELECT * FROM visa_management
    WHERE customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY created_at DESC
  ) v;

  SELECT COALESCE(json_agg(row_to_json(tk)), '[]'::json) INTO v_tickets
  FROM (
    SELECT * FROM flight_tickets
    WHERE customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY created_at DESC
  ) tk;

  SELECT COALESCE(json_agg(row_to_json(tl)), '[]'::json) INTO v_timeline
  FROM (
    SELECT wt.*, up.name AS employee_real_name
    FROM workflow_timeline wt
    LEFT JOIN user_profiles up ON up.id = wt.employee_id
    WHERE wt.customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY wt.created_at ASC
  ) tl;

  -- Fetch operational documents
  SELECT COALESCE(json_agg(row_to_json(od)), '[]'::json) INTO v_op_docs
  FROM (
    SELECT od.*, op.op_number
    FROM operation_file_documents od
    JOIN operation_files op ON op.id = od.operation_file_id
    WHERE op.customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY od.created_at DESC
  ) od;

  -- Fetch VIP request details if they exist
  SELECT row_to_json(vr) INTO v_vip_request
  FROM (
    SELECT * FROM vip_requests
    WHERE customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    LIMIT 1
  ) vr;

  -- Fetch VIP workflow steps if VIP request exists
  IF v_vip_request IS NOT NULL THEN
    SELECT COALESCE(json_agg(row_to_json(vs)), '[]'::json) INTO v_vip_steps
    FROM (
      SELECT vws.*, up.name AS assigned_employee_name
      FROM vip_workflow_steps vws
      LEFT JOIN user_profiles up ON up.id = vws.assigned_employee_id
      WHERE vws.vip_request_id = (v_vip_request->>'id')::uuid
      ORDER BY 
        CASE vws.step_key
          WHEN 'pricing' THEN 1
          WHEN 'payment_approval' THEN 2
          WHEN 'hotel_booking' THEN 3
          WHEN 'hotel_confirmation' THEN 4
          WHEN 'flight_booking' THEN 5
          WHEN 'flight_issuance' THEN 6
          WHEN 'train_booking' THEN 7
          WHEN 'train_confirmation' THEN 8
          WHEN 'visa_processing' THEN 9
          WHEN 'visa_issuance' THEN 10
          WHEN 'itinerary_prep' THEN 11
          WHEN 'travel_ready' THEN 12
          ELSE 13
        END
    ) vs;
  ELSE
    v_vip_steps := '[]'::json;
  END IF;

  RETURN json_build_object(
    'found', true,
    'customer', v_customer,
    'bookings', v_bookings,
    'invoices', v_invoices,
    'payments', v_payments,
    'documents', v_documents,
    'operation_files', v_ops,
    'tasks', v_tasks,
    'inquiries', v_inquiries,
    'internal_bookings', v_internal,
    'visas', v_visas,
    'tickets', v_tickets,
    'timeline', v_timeline,
    'op_documents', v_op_docs,
    'vip_request', v_vip_request,
    'vip_steps', v_vip_steps
  );
END;
$$;
