/*
# Create Operation Files Table

## Overview
Adds a dedicated `operation_files` table to track the operational workflow
for each confirmed booking, from file creation through travel completion.

## New Tables

### operation_files
Each row represents one operational file linked to a booking (and its customer).
- `id` — UUID primary key
- `op_number` — Human-readable operation ID (e.g. OP-1001), auto-generated via sequence
- `booking_id` — FK → bookings(id)
- `customer_id` — FK → customers(id)  
- `employee_id` — FK → user_profiles(id), the responsible operations officer
- `file_status` — Workflow stage: جديد | قيد التجهيز | مستندات ناقصة | جاهز للسفر | مكتمل | مغلق
- `travel_date` — Planned departure date
- `return_date` — Planned return date
- `hotel_id` — FK → hotels(id), optional linked hotel
- `internal_trip_id` — FK → internal_trips(id), optional linked internal trip
- `notes` — Free-text internal notes
- `financially_approved` — Boolean flag; must be true (or payment_status = مدفوع بالكامل) before moving to جاهز للسفر
- `created_at`, `updated_at`

## Sequences
- `op_number_seq` starting at 1001, used for OP-XXXX codes

## Security
- RLS enabled; permissive policies (anon + authenticated) for MVP — same pattern as other tables in this project.

## Notes
1. The trigger `set_op_number` fires BEFORE INSERT to assign `op_number` if not provided.
2. The trigger `update_operation_files_updated_at` fires BEFORE UPDATE to keep `updated_at` fresh.
3. This table is intentionally linked 1-to-1 with bookings — one booking produces one operation file.
   A unique constraint on `booking_id` enforces this.
*/

-- Sequence for OP numbers
CREATE SEQUENCE IF NOT EXISTS op_number_seq START 1001;

-- Main table
CREATE TABLE IF NOT EXISTS operation_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  op_number text UNIQUE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  file_status text NOT NULL DEFAULT 'جديد'
    CHECK (file_status IN ('جديد', 'قيد التجهيز', 'مستندات ناقصة', 'جاهز للسفر', 'مكتمل', 'مغلق')),
  travel_date date,
  return_date date,
  hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL,
  internal_trip_id uuid REFERENCES internal_trips(id) ON DELETE SET NULL,
  notes text,
  financially_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique: one booking → one operation file
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'operation_files_booking_id_unique'
  ) THEN
    ALTER TABLE operation_files ADD CONSTRAINT operation_files_booking_id_unique UNIQUE (booking_id);
  END IF;
END $$;

-- Auto-generate OP number on insert
CREATE OR REPLACE FUNCTION generate_op_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.op_number IS NULL THEN
    NEW.op_number := 'OP-' || nextval('op_number_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_op_number ON operation_files;
CREATE TRIGGER set_op_number
  BEFORE INSERT ON operation_files
  FOR EACH ROW EXECUTE FUNCTION generate_op_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_operation_files_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_operation_files_updated_at ON operation_files;
CREATE TRIGGER update_operation_files_updated_at
  BEFORE UPDATE ON operation_files
  FOR EACH ROW EXECUTE FUNCTION update_operation_files_ts();

-- RLS
ALTER TABLE operation_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ops_select" ON operation_files;
CREATE POLICY "ops_select" ON operation_files FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ops_insert" ON operation_files;
CREATE POLICY "ops_insert" ON operation_files FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ops_update" ON operation_files;
CREATE POLICY "ops_update" ON operation_files FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ops_delete" ON operation_files;
CREATE POLICY "ops_delete" ON operation_files FOR DELETE
  TO anon, authenticated USING (true);

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_operation_files_booking ON operation_files(booking_id);
CREATE INDEX IF NOT EXISTS idx_operation_files_customer ON operation_files(customer_id);
CREATE INDEX IF NOT EXISTS idx_operation_files_status ON operation_files(file_status);
