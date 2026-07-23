/*
# Unified Client Code System — Sub-codes derived from Client Code

## Summary
Makes the Client Code (CL-1001) the master reference across the entire system.
Adds sub-code generation so every section's records get a code derived from the
client code (CL-1001-BK-01, CL-1001-INV-01, CL-1001-TXN-01, CL-1001-OP-01,
CL-1001-TSK-01, CL-1001-DOC-01). Adds a customer_full_data RPC that returns all
data linked to a client code in one call.

## Modified Tables
- `payments`: add `transaction_number text` (CL-1001-TXN-01)
- `documents`: add `doc_number text` (CL-1001-DOC-01)
- `bookings`: add `booking_number text` (CL-1001-BK-01) — booking_id remains the FK
- `tasks`: sub-code is generated from client_code (CL-1001-TSK-01)
- `operation_files`: `op_number` now generated as CL-1001-OP-01 when a customer is linked

## New Functions
- `generate_sub_code(p_client_code text, p_prefix text)` — returns the next sub-code
  for a client, e.g. CL-1001-BK-02. Counts existing rows for that client+prefix.
- `get_customer_full_data(p_client_code text)` — RPC that returns a JSON object with
  the customer + all related bookings, invoices, payments, documents, operation files,
  tasks, inquiries, and internal-trip bookings in one call.

## Security
- No new tables; existing RLS policies remain.
- The RPC is SECURITY DEFINER so it can read across tables for the calling user.
*/

-- ===== 1. Add sub-code columns =====
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_number text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_number text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_number text;

CREATE INDEX IF NOT EXISTS idx_payments_txn_number ON payments(transaction_number);
CREATE INDEX IF NOT EXISTS idx_documents_doc_number ON documents(doc_number);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON bookings(booking_number);

-- ===== 2. generate_sub_code function =====
-- Returns the next sub-code for a given client code and prefix.
-- e.g. generate_sub_code('CL-1001', 'BK') → 'CL-1001-BK-01'
CREATE OR REPLACE FUNCTION generate_sub_code(p_client_code text, p_prefix text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
  v_customer_id uuid;
BEGIN
  -- Find the customer by client_code
  SELECT id INTO v_customer_id FROM customers WHERE client_code = p_client_code LIMIT 1;
  IF v_customer_id IS NULL THEN
    RETURN p_client_code || '-' || p_prefix || '-01';
  END IF;

  -- Count existing rows for this customer + prefix
  CASE p_prefix
    WHEN 'BK' THEN
      SELECT COUNT(*) + 1 INTO v_count FROM bookings WHERE customer_id = v_customer_id;
    WHEN 'INV' THEN
      SELECT COUNT(*) + 1 INTO v_count FROM invoices WHERE customer_id = v_customer_id;
    WHEN 'TXN' THEN
      SELECT COUNT(*) + 1 INTO v_count FROM payments WHERE customer_id = v_customer_id;
    WHEN 'OP' THEN
      SELECT COUNT(*) + 1 INTO v_count FROM operation_files WHERE customer_id = v_customer_id;
    WHEN 'TSK' THEN
      SELECT COUNT(*) + 1 INTO v_count FROM tasks WHERE client_code = p_client_code;
    WHEN 'DOC' THEN
      SELECT COUNT(*) + 1 INTO v_count FROM documents WHERE customer_id = v_customer_id;
    ELSE
      v_count := 1;
  END CASE;

  RETURN p_client_code || '-' || p_prefix || '-' || lpad(v_count::text, 2, '0');
END;
$$;

-- ===== 3. get_customer_full_data RPC =====
-- Returns all data linked to a client code in a single JSON object.
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
    'internal_bookings', v_internal
  );
END;
$$;

-- ===== 4. Backfill existing sub-codes =====
-- Generate sub-codes for existing rows where the customer has a client_code
UPDATE bookings
SET booking_number = sub
FROM (
  SELECT b.id, generate_sub_code(c.client_code, 'BK') AS sub
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.booking_number IS NULL AND c.client_code IS NOT NULL
) s
WHERE bookings.id = s.id;

UPDATE invoices
SET invoice_number = sub
FROM (
  SELECT i.id, generate_sub_code(c.client_code, 'INV') AS sub
  FROM invoices i
  JOIN customers c ON c.id = i.customer_id
  WHERE (i.invoice_number IS NULL OR i.invoice_number LIKE 'INV-%') AND c.client_code IS NOT NULL
) s
WHERE invoices.id = s.id;

UPDATE payments
SET transaction_number = sub
FROM (
  SELECT p.id, generate_sub_code(c.client_code, 'TXN') AS sub
  FROM payments p
  JOIN customers c ON c.id = p.customer_id
  WHERE p.transaction_number IS NULL AND c.client_code IS NOT NULL
) s
WHERE payments.id = s.id;

UPDATE documents
SET doc_number = sub
FROM (
  SELECT d.id, generate_sub_code(c.client_code, 'DOC') AS sub
  FROM documents d
  JOIN customers c ON c.id = d.customer_id
  WHERE d.doc_number IS NULL AND c.client_code IS NOT NULL
) s
WHERE documents.id = s.id;

UPDATE operation_files
SET op_number = sub
FROM (
  SELECT o.id, generate_sub_code(c.client_code, 'OP') AS sub
  FROM operation_files o
  JOIN customers c ON c.id = o.customer_id
  WHERE c.client_code IS NOT NULL
    AND (o.op_number IS NULL OR o.op_number LIKE 'OP-%')
) s
WHERE operation_files.id = s.id;
