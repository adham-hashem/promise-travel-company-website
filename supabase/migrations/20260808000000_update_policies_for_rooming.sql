-- ===== Add UPDATE policy for travel_group_members to allow rooming assignments =====
DROP POLICY IF EXISTS "tgm_update" ON travel_group_members;
CREATE POLICY "tgm_update" ON travel_group_members
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
