/*
# Auto-generate sub-codes via triggers (bookings, operation_files, tasks)

## Summary
Ensures sub-codes are always generated from the Client Code, even when records
are created outside the frontend (website bookings, API inserts, etc.). The
frontend already generates sub-codes for invoices/payments/documents via RPC;
these triggers cover the remaining tables and update the operation_files
trigger to use the CL-1001-OP-XX format instead of OP-XXXX.

## Modified Functions
- `generate_op_number()` — now generates CL-1001-OP-01 from the customer's
  client_code; falls back to OP-XXXX if no customer is linked.
- New `generate_booking_number()` — generates CL-1001-BK-01 on insert.
- New `generate_task_subcode()` — sets client_code from customer if a booking_id
  is linked but client_code is empty.
*/
;

-- ===== bookings: auto-generate booking_number =====
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_client_code text;
BEGIN
  IF NEW.booking_number IS NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT client_code INTO v_client_code FROM customers WHERE id = NEW.customer_id;
    IF v_client_code IS NOT NULL THEN
      NEW.booking_number := generate_sub_code(v_client_code, 'BK');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_number ON bookings;
CREATE TRIGGER trg_booking_number
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_number();

-- ===== operation_files: update op_number to CL-1001-OP-XX =====
CREATE OR REPLACE FUNCTION generate_op_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_client_code text;
BEGIN
  IF NEW.op_number IS NULL OR NEW.op_number LIKE 'OP-%' THEN
    IF NEW.customer_id IS NOT NULL THEN
      SELECT client_code INTO v_client_code FROM customers WHERE id = NEW.customer_id;
      IF v_client_code IS NOT NULL THEN
        NEW.op_number := generate_sub_code(v_client_code, 'OP');
        RETURN NEW;
      END IF;
    END IF;
    IF NEW.op_number IS NULL THEN
      NEW.op_number := 'OP-' || nextval('op_number_seq')::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ===== tasks: auto-fill client_code from booking's customer =====
CREATE OR REPLACE FUNCTION generate_task_subcode()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_client_code text;
BEGIN
  IF NEW.client_code IS NULL AND NEW.booking_id IS NOT NULL THEN
    SELECT c.client_code INTO v_client_code
    FROM customers c
    JOIN bookings b ON b.customer_id = c.id
    WHERE b.id = NEW.booking_id;
    IF v_client_code IS NOT NULL THEN
      NEW.client_code := v_client_code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_subcode ON tasks;
CREATE TRIGGER trg_task_subcode
  BEFORE INSERT OR UPDATE OF booking_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION generate_task_subcode();
