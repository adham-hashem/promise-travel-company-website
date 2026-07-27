-- ===== travel_groups table =====
CREATE TABLE IF NOT EXISTS travel_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  code            TEXT UNIQUE NOT NULL,
  package_id      UUID REFERENCES packages(id) ON DELETE SET NULL,
  travel_date     DATE,
  return_date     DATE,
  airline         TEXT,
  flight_number   TEXT,
  hotel_mecca     TEXT,
  hotel_medina    TEXT,
  supervisor      TEXT,
  max_capacity    INT NOT NULL DEFAULT 45,
  status          TEXT NOT NULL DEFAULT 'تجميع'
                  CHECK (status IN ('تجميع', 'مؤكد', 'سافر', 'عاد', 'ملغي')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_groups_status      ON travel_groups(status);
CREATE INDEX IF NOT EXISTS idx_travel_groups_travel_date ON travel_groups(travel_date);
CREATE INDEX IF NOT EXISTS idx_travel_groups_package     ON travel_groups(package_id);

ALTER TABLE travel_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_groups_select" ON travel_groups;
CREATE POLICY "travel_groups_select" ON travel_groups
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "travel_groups_insert" ON travel_groups;
CREATE POLICY "travel_groups_insert" ON travel_groups
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "travel_groups_update" ON travel_groups;
CREATE POLICY "travel_groups_update" ON travel_groups
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "travel_groups_delete" ON travel_groups;
CREATE POLICY "travel_groups_delete" ON travel_groups
  FOR DELETE TO authenticated USING (true);

-- ===== travel_group_members table =====
CREATE TABLE IF NOT EXISTS travel_group_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES travel_groups(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id)     ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT now(),
  notes       TEXT,
  UNIQUE(group_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_tgm_group    ON travel_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_tgm_customer ON travel_group_members(customer_id);

ALTER TABLE travel_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tgm_select" ON travel_group_members;
CREATE POLICY "tgm_select" ON travel_group_members
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tgm_insert" ON travel_group_members;
CREATE POLICY "tgm_insert" ON travel_group_members
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tgm_delete" ON travel_group_members;
CREATE POLICY "tgm_delete" ON travel_group_members
  FOR DELETE TO authenticated USING (true);
