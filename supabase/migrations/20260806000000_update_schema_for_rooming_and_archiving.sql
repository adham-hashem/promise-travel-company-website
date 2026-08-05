-- ===== 1. Update Customers Table =====
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS hotel_makkah TEXT,
ADD COLUMN IF NOT EXISTS hotel_madinah TEXT,
ADD COLUMN IF NOT EXISTS room_type_makkah TEXT,
ADD COLUMN IF NOT EXISTS room_type_madinah TEXT,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- ===== 2. Update VIP Customers Table =====
ALTER TABLE vip_requests
ADD COLUMN IF NOT EXISTS hotel_makkah TEXT,
ADD COLUMN IF NOT EXISTS hotel_madinah TEXT,
ADD COLUMN IF NOT EXISTS room_type_makkah TEXT,
ADD COLUMN IF NOT EXISTS room_type_madinah TEXT,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- ===== 3. Update Operation Files Table for Archiving =====
ALTER TABLE operation_files
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- ===== 4. Create Group Families Table =====
CREATE TABLE IF NOT EXISTS group_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES travel_groups(id) ON DELETE CASCADE,
  family_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_families_group_id ON group_families(group_id);

ALTER TABLE group_families ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_families_select" ON group_families;
CREATE POLICY "group_families_select" ON group_families FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "group_families_insert" ON group_families;
CREATE POLICY "group_families_insert" ON group_families FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "group_families_update" ON group_families;
CREATE POLICY "group_families_update" ON group_families FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "group_families_delete" ON group_families;
CREATE POLICY "group_families_delete" ON group_families FOR DELETE TO authenticated USING (true);

-- ===== 5. Create Group Rooms Table =====
CREATE TABLE IF NOT EXISTS group_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES travel_groups(id) ON DELETE CASCADE,
  room_number TEXT,
  room_type TEXT NOT NULL, -- ثنائي, ثلاثي, رباعي
  is_family BOOLEAN DEFAULT false,
  family_id UUID REFERENCES group_families(id) ON DELETE CASCADE,
  gender TEXT CHECK (gender IN ('رجال', 'نساء', 'عائلة')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_rooms_group_id ON group_rooms(group_id);
CREATE INDEX IF NOT EXISTS idx_group_rooms_family_id ON group_rooms(family_id);

ALTER TABLE group_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_rooms_select" ON group_rooms;
CREATE POLICY "group_rooms_select" ON group_rooms FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "group_rooms_insert" ON group_rooms;
CREATE POLICY "group_rooms_insert" ON group_rooms FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "group_rooms_update" ON group_rooms;
CREATE POLICY "group_rooms_update" ON group_rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "group_rooms_delete" ON group_rooms;
CREATE POLICY "group_rooms_delete" ON group_rooms FOR DELETE TO authenticated USING (true);

-- ===== 6. Update Travel Group Members Table =====
ALTER TABLE travel_group_members
ADD COLUMN IF NOT EXISTS rooming_type TEXT DEFAULT 'منفرد',
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES group_families(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES group_rooms(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('ذكر', 'أنثى'));
