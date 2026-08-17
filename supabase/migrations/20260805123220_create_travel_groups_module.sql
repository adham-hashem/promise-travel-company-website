/*
# Travel Groups Management Module

## Summary
Creates a complete travel groups management system for organizing Hajj,
Umrah, and Internal Tourism groups. Operations managers can create groups,
assign supervisors, add/remove customers, track capacity, generate passenger
manifests, and keep all departments synchronized through the unified Client Code.

## New Tables
1. `travel_groups` — main group entity
   - id, group_code (auto-generated TG-XXXX), group_name, service_type
     (Hajj/Umrah/Internal Tourism), package_id (FK packages), supervisor_id
     (FK employees), departure_date, return_date, departure_time, return_time,
     airline, flight_number, departure_airport, arrival_airport,
     hotel_makkah, hotel_madinah, internal_hotel, bus_number, max_capacity,
     current_count (auto-updated), status, notes, created_by, created_at, updated_at

2. `travel_group_members` — junction table linking customers to groups
   - id, group_id (FK travel_groups), customer_id (FK customers),
     room_number, accommodation_status, added_by, added_at
   - UNIQUE constraint on (group_id, customer_id) to prevent duplicates

## Triggers
- `generate_travel_group_code()` — BEFORE INSERT: auto-generates TG-XXXX code
- `sync_group_member_count()` — AFTER INSERT/DELETE on travel_group_members:
  updates travel_groups.current_count to reflect actual member count, and
  auto-updates group status to 'Full' when capacity reached.
- `sync_customer_group_info()` — AFTER INSERT on travel_group_members:
  updates the customer record with group_name, group_code, supervisor,
  travel dates, and flight info so all departments see the assignment.
- `clear_customer_group_info()` — AFTER DELETE on travel_group_members:
  clears the group info from the customer record.

## Customer Fields Added
- `travel_group_id` (FK travel_groups) — direct link for cross-department sync
- `travel_group_name`, `travel_group_code` — denormalized for quick display
- `travel_group_supervisor` — supervisor name
- `travel_dates` — text field with formatted date range

## Security
- RLS enabled on both new tables with authenticated CRUD policies.
- All operations scoped to authenticated users (staff app with sign-in).
*/
;

-- ===== 1. travel_groups table =====
CREATE TABLE IF NOT EXISTS travel_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code text UNIQUE,
  group_name text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('حج', 'عمرة', 'رحلة داخلية')),
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  supervisor_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  departure_date date,
  return_date date,
  departure_time text,
  return_time text,
  airline text,
  flight_number text,
  departure_airport text,
  arrival_airport text,
  hotel_makkah text,
  hotel_madinah text,
  internal_hotel text,
  bus_number text,
  max_capacity integer NOT NULL DEFAULT 50,
  current_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'مفتوحة' CHECK (status IN ('مفتوحة', 'مكتملة', 'جاهز للسفر', 'في السفر', 'مكتملة بنجاح', 'ملغاة')),
  notes text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tg_select" ON travel_groups;
CREATE POLICY "tg_select" ON travel_groups FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tg_insert" ON travel_groups;
CREATE POLICY "tg_insert" ON travel_groups FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "tg_update" ON travel_groups;
CREATE POLICY "tg_update" ON travel_groups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tg_delete" ON travel_groups;
CREATE POLICY "tg_delete" ON travel_groups FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tg_status ON travel_groups(status);
CREATE INDEX IF NOT EXISTS idx_tg_supervisor ON travel_groups(supervisor_id);

-- ===== 2. travel_group_members table =====
CREATE TABLE IF NOT EXISTS travel_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES travel_groups(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  room_number text,
  accommodation_status text NOT NULL DEFAULT 'غير محدد' CHECK (accommodation_status IN ('غير محدد', 'مؤكد', 'قيد التأكيد', 'مشكلة')),
  added_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, customer_id)
);

ALTER TABLE travel_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tgm_select" ON travel_group_members;
CREATE POLICY "tgm_select" ON travel_group_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tgm_insert" ON travel_group_members;
CREATE POLICY "tgm_insert" ON travel_group_members FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "tgm_update" ON travel_group_members;
CREATE POLICY "tgm_update" ON travel_group_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tgm_delete" ON travel_group_members;
CREATE POLICY "tgm_delete" ON travel_group_members FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tgm_group ON travel_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_tgm_customer ON travel_group_members(customer_id);

-- ===== 3. Add group fields to customers =====
ALTER TABLE customers ADD COLUMN IF NOT EXISTS travel_group_id uuid REFERENCES travel_groups(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS travel_group_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS travel_group_code text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS travel_group_supervisor text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS travel_dates text;

-- ===== 4. Trigger: auto-generate group code =====
CREATE SEQUENCE IF NOT EXISTS travel_group_code_seq START 1001;

CREATE OR REPLACE FUNCTION generate_travel_group_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.group_code IS NULL THEN
    NEW.group_code := 'TG-' || nextval('travel_group_code_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_tg_code ON travel_groups;
CREATE TRIGGER trg_generate_tg_code
  BEFORE INSERT ON travel_groups
  FOR EACH ROW EXECUTE FUNCTION generate_travel_group_code();

-- ===== 5. Trigger: sync member count on insert =====
CREATE OR REPLACE FUNCTION sync_group_member_count_add()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_max int;
  v_count int;
BEGIN
  SELECT max_capacity, current_count INTO v_max, v_count
  FROM travel_groups WHERE id = NEW.group_id;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'المجموعة ممتلئة - لا يمكن إضافة المزيد من العملاء';
  END IF;

  UPDATE travel_groups
  SET current_count = current_count + 1,
      status = CASE WHEN current_count + 1 >= max_capacity THEN 'مكتملة' ELSE status END,
      updated_at = now()
  WHERE id = NEW.group_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_member_add ON travel_group_members;
CREATE TRIGGER trg_sync_member_add
  AFTER INSERT ON travel_group_members
  FOR EACH ROW EXECUTE FUNCTION sync_group_member_count_add();

-- ===== 6. Trigger: sync member count on delete =====
CREATE OR REPLACE FUNCTION sync_group_member_count_remove()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE travel_groups
  SET current_count = GREATEST(current_count - 1, 0),
      status = CASE WHEN status = 'مكتملة' THEN 'مفتوحة' ELSE status END,
      updated_at = now()
  WHERE id = OLD.group_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_member_remove ON travel_group_members;
CREATE TRIGGER trg_sync_member_remove
  AFTER DELETE ON travel_group_members
  FOR EACH ROW EXECUTE FUNCTION sync_group_member_count_remove();

-- ===== 7. Trigger: sync customer profile on member add =====
CREATE OR REPLACE FUNCTION sync_customer_group_info()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_group travel_groups%ROWTYPE;
  v_supervisor_name text;
  v_dates text;
BEGIN
  SELECT * INTO v_group FROM travel_groups WHERE id = NEW.group_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT name INTO v_supervisor_name FROM employees WHERE id = v_group.supervisor_id;

  v_dates := COALESCE(v_group.departure_date::text, '') || ' → ' || COALESCE(v_group.return_date::text, '');

  UPDATE customers
  SET travel_group_id = v_group.id,
      travel_group_name = v_group.group_name,
      travel_group_code = v_group.group_code,
      travel_group_supervisor = v_supervisor_name,
      travel_dates = CASE WHEN v_group.departure_date IS NOT NULL THEN v_dates ELSE NULL END
  WHERE id = NEW.customer_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_group ON travel_group_members;
CREATE TRIGGER trg_sync_customer_group
  AFTER INSERT ON travel_group_members
  FOR EACH ROW EXECUTE FUNCTION sync_customer_group_info();

-- ===== 8. Trigger: clear customer profile on member remove =====
CREATE OR REPLACE FUNCTION clear_customer_group_info()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE customers
  SET travel_group_id = NULL,
      travel_group_name = NULL,
      travel_group_code = NULL,
      travel_group_supervisor = NULL,
      travel_dates = NULL
  WHERE id = OLD.customer_id
    AND travel_group_id = OLD.group_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_customer_group ON travel_group_members;
CREATE TRIGGER trg_clear_customer_group
  AFTER DELETE ON travel_group_members
  FOR EACH ROW EXECUTE FUNCTION clear_customer_group_info();

-- ===== 9. Update updated_at on travel_groups =====
CREATE OR REPLACE FUNCTION update_travel_groups_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_tg_ts ON travel_groups;
CREATE TRIGGER trg_update_tg_ts
  BEFORE UPDATE ON travel_groups
  FOR EACH ROW EXECUTE FUNCTION update_travel_groups_ts();
