/*
# Accommodation (Rooming) Management Module

## Summary
Creates a complete rooming management system integrated with Travel Groups.
Manages automatic room creation, individual traveler placement by gender,
family room assignment, room capacity validation, color-coded rooming lists,
travel-ready status checks, group return workflow, and customer archiving.

## New Tables
1. `rooms` — room entity per travel group
   - id, group_id (FK travel_groups), room_number, room_type (double/triple/quad/connected),
     capacity (2/3/4/auto for connected), current_occupancy, gender (male/female/mixed for families),
     family_id (FK families, null for individual rooms), hotel, hotel_branch, city, floor,
     status (waiting/complete/checked_in/checked_out), color_tag, is_locked, created_at

2. `room_assignments` — links customers to rooms within a group
   - id, room_id (FK rooms), group_id (FK travel_groups), customer_id (FK customers),
     family_id (FK families, null for individuals), assigned_at, assigned_by

3. `families` — family/group entity for family accommodation
   - id, group_id (FK travel_groups), family_name, family_head_customer_id (FK customers),
     room_id (FK rooms, assigned after creation), member_count, created_at

## Customer Fields Added
- `rooming_type` — 'individual' | 'family' (set during group assignment)
- `room_type_preference` — 'double' | 'triple' | 'quad' (for individual travelers)
- `family_id` — FK families (for family members)
- `is_archived` — boolean, true after group return/completion
- `archived_at` — timestamp
- `travel_ready` — boolean, auto-calculated from checklist
- `hotel_confirmed` — boolean
- `transportation_confirmed` — boolean
- `supervisor_assigned` — boolean
- `room_assigned` — boolean

## Travel Group Fields Added
- `returned_at` — timestamp, set when group return is triggered

## Triggers
- `auto_assign_individual_room()` — AFTER INSERT on room_assignments: updates room occupancy,
  locks room when full, assigns final room number, updates customer.room_assigned.
- `sync_room_occupancy()` — AFTER DELETE on room_assignments: decrements occupancy, unlocks room.
- `update_travel_ready_status()` — AFTER UPDATE on customers: auto-sets travel_ready when all
  checklist items are complete (payment, visa, flight, hotel, room, transport, supervisor).

## Security
- RLS enabled on all new tables with authenticated CRUD policies.
*/
;

-- ===== 1. families table =====
CREATE TABLE IF NOT EXISTS families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES travel_groups(id) ON DELETE CASCADE,
  family_name text NOT NULL,
  family_head_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  room_id uuid, -- assigned after room creation, set via UPDATE
  member_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fam_select" ON families;
CREATE POLICY "fam_select" ON families FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "fam_insert" ON families;
CREATE POLICY "fam_insert" ON families FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "fam_update" ON families;
CREATE POLICY "fam_update" ON families FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "fam_delete" ON families;
CREATE POLICY "fam_delete" ON families FOR DELETE TO authenticated USING (true);

-- ===== 2. rooms table =====
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES travel_groups(id) ON DELETE CASCADE,
  room_number text,
  room_type text NOT NULL CHECK (room_type IN ('double', 'triple', 'quad', 'connected')),
  capacity integer NOT NULL,
  current_occupancy integer NOT NULL DEFAULT 0,
  gender text NOT NULL DEFAULT 'mixed' CHECK (gender IN ('male', 'female', 'mixed')),
  family_id uuid REFERENCES families(id) ON DELETE SET NULL,
  hotel text,
  hotel_branch text,
  city text,
  floor text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'complete', 'checked_in', 'checked_out')),
  color_tag integer NOT NULL DEFAULT 0,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rm_select" ON rooms;
CREATE POLICY "rm_select" ON rooms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rm_insert" ON rooms;
CREATE POLICY "rm_insert" ON rooms FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "rm_update" ON rooms;
CREATE POLICY "rm_update" ON rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "rm_delete" ON rooms;
CREATE POLICY "rm_delete" ON rooms FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_rooms_group ON rooms(group_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- ===== 3. room_assignments table =====
CREATE TABLE IF NOT EXISTS room_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES travel_groups(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  family_id uuid REFERENCES families(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  UNIQUE(room_id, customer_id)
);

ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ra_select" ON room_assignments;
CREATE POLICY "ra_select" ON room_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ra_insert" ON room_assignments;
CREATE POLICY "ra_insert" ON room_assignments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ra_update" ON room_assignments;
CREATE POLICY "ra_update" ON room_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ra_delete" ON room_assignments;
CREATE POLICY "ra_delete" ON room_assignments FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ra_room ON room_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_ra_group ON room_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_ra_customer ON room_assignments(customer_id);

-- ===== 4. Add fields to families.room_id FK =====
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'families_room_id_fkey' AND table_name = 'families'
  ) THEN
    ALTER TABLE families ADD CONSTRAINT families_room_id_fkey
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===== 5. Add customer fields =====
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rooming_type text DEFAULT 'individual' CHECK (rooming_type IN ('individual', 'family'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS room_type_preference text CHECK (room_type_preference IN ('double', 'triple', 'quad'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS travel_ready boolean NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS hotel_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS transportation_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS supervisor_assigned boolean NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS room_assigned boolean NOT NULL DEFAULT false;

-- ===== 6. Add returned_at to travel_groups =====
ALTER TABLE travel_groups ADD COLUMN IF NOT EXISTS returned_at timestamptz;

-- ===== 7. Trigger: auto-assign room number + update occupancy on insert =====
CREATE OR REPLACE FUNCTION auto_assign_individual_room()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_room rooms%ROWTYPE;
  v_group_id uuid;
BEGIN
  SELECT group_id INTO v_group_id FROM rooms WHERE id = NEW.room_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Increment occupancy
  UPDATE rooms
  SET current_occupancy = current_occupancy + 1,
      status = CASE WHEN current_occupancy + 1 >= capacity THEN 'complete' ELSE status END,
      is_locked = CASE WHEN current_occupancy + 1 >= capacity THEN true ELSE is_locked END,
      room_number = COALESCE(room_number, 'R-' || (
        SELECT count(*) + 100 FROM rooms WHERE group_id = v_group_id
      )::text)
  WHERE id = NEW.room_id;

  -- Mark customer room_assigned
  UPDATE customers SET room_assigned = true WHERE id = NEW.customer_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_room ON room_assignments;
CREATE TRIGGER trg_auto_assign_room
  AFTER INSERT ON room_assignments
  FOR EACH ROW EXECUTE FUNCTION auto_assign_individual_room();

-- ===== 8. Trigger: decrement occupancy on delete =====
CREATE OR REPLACE FUNCTION sync_room_occupancy()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE rooms
  SET current_occupancy = GREATEST(current_occupancy - 1, 0),
      status = CASE WHEN current_occupancy - 1 <= 0 THEN 'waiting' ELSE 'waiting' END,
      is_locked = CASE WHEN current_occupancy - 1 < capacity THEN false ELSE is_locked END
  WHERE id = OLD.room_id;

  -- Clear customer room_assigned if no other assignment
  UPDATE customers SET room_assigned = false
  WHERE id = OLD.customer_id
    AND NOT EXISTS (SELECT 1 FROM room_assignments WHERE customer_id = OLD.customer_id);

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_room_occupancy ON room_assignments;
CREATE TRIGGER trg_sync_room_occupancy
  AFTER DELETE ON room_assignments
  FOR EACH ROW EXECUTE FUNCTION sync_room_occupancy();

-- ===== 9. Trigger: auto-calculate travel_ready on customer update =====
CREATE OR REPLACE FUNCTION update_travel_ready_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_payment_ok boolean := false;
  v_visa_ok boolean := false;
  v_flight_ok boolean := false;
  v_payment_status text;
  v_visa_status text;
  v_has_ticket boolean;
BEGIN
  -- Check payment
  SELECT payment_status INTO v_payment_status FROM bookings WHERE customer_id = NEW.id ORDER BY created_at DESC LIMIT 1;
  v_payment_ok := (v_payment_status = 'مدفوع بالكامل');

  -- Check visa
  SELECT visa_status INTO v_visa_status FROM visa_management WHERE customer_id = NEW.id ORDER BY created_at DESC LIMIT 1;
  v_visa_ok := (v_visa_status = 'تمت الموافقة' OR v_visa_status = 'تم الاعتماد');

  -- Check flight ticket
  SELECT EXISTS(SELECT 1 FROM flight_tickets WHERE customer_id = NEW.id) INTO v_has_ticket;
  v_flight_ok := v_has_ticket;

  -- Calculate travel_ready
  NEW.travel_ready := (
    v_payment_ok AND
    v_visa_ok AND
    v_flight_ok AND
    COALESCE(NEW.hotel_confirmed, false) AND
    COALESCE(NEW.room_assigned, false) AND
    COALESCE(NEW.transportation_confirmed, false) AND
    COALESCE(NEW.supervisor_assigned, false)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_travel_ready ON customers;
CREATE TRIGGER trg_update_travel_ready
  BEFORE UPDATE ON customers
  FOR EACH ROW
  WHEN (OLD.hotel_confirmed IS DISTINCT FROM NEW.hotel_confirmed
     OR OLD.room_assigned IS DISTINCT FROM NEW.room_assigned
     OR OLD.transportation_confirmed IS DISTINCT FROM NEW.transportation_confirmed
     OR OLD.supervisor_assigned IS DISTINCT FROM NEW.supervisor_assigned)
  EXECUTE FUNCTION update_travel_ready_status();
