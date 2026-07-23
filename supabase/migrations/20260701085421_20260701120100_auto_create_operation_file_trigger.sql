/*
# Auto-create Operation File on Booking Confirmation

## Overview
Adds a PostgreSQL trigger that automatically creates an operation_files record
whenever a booking is inserted with status 'مؤكد' or updated TO status 'مؤكد'.

## Logic
- INSERT: if new booking.status = 'مؤكد', insert an operation_files row
- UPDATE: if booking status changes from anything → 'مؤكد', insert an operation_files row
  (skip if one already exists for that booking)

## Notes
1. Uses ON CONFLICT DO NOTHING on the unique(booking_id) constraint to be idempotent.
2. employee_id is taken from the booking's own employee_id field.
3. customer_id is taken from the booking's customer_id.
*/

CREATE OR REPLACE FUNCTION auto_create_operation_file()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only act when status is or becomes 'مؤكد'
  IF NEW.status = 'مؤكد' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'مؤكد') THEN
    INSERT INTO operation_files (booking_id, customer_id, employee_id, file_status)
    VALUES (NEW.id, NEW.customer_id, NEW.employee_id, 'جديد')
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_operation_file ON bookings;
CREATE TRIGGER trg_auto_create_operation_file
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION auto_create_operation_file();
