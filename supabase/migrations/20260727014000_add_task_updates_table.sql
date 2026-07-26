-- Create task_updates table for multi-update employee responses
CREATE TABLE IF NOT EXISTS task_updates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_updates_task    ON task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_created ON task_updates(task_id, created_at);

ALTER TABLE task_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_updates_select" ON task_updates;
CREATE POLICY "task_updates_select" ON task_updates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "task_updates_insert" ON task_updates;
CREATE POLICY "task_updates_insert" ON task_updates
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "task_updates_delete" ON task_updates;
CREATE POLICY "task_updates_delete" ON task_updates
  FOR DELETE TO authenticated USING (true);
