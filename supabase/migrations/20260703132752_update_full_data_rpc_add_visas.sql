/*
# Update get_customer_full_data RPC to include visas
*/
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
    LEFT JOIN internal_trips it ON it.id = itb.internal_trip_id
    WHERE itb.customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY itb.created_at DESC
  ) it;

  SELECT COALESCE(json_agg(row_to_json(v)), '[]'::json) INTO v_visas
  FROM (
    SELECT * FROM visa_management
    WHERE customer_id = (SELECT id FROM customers WHERE client_code = p_client_code LIMIT 1)
    ORDER BY created_at DESC
  ) v;

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
    'visas', v_visas
  );
END;
$$;
