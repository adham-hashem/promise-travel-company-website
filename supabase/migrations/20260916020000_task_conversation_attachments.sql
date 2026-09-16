-- Task conversations, attachments, read tracking, and audit log.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by_id uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('جديدة', 'قيد التنفيذ', 'مؤجلة', 'مكتملة', 'متأخرة', 'Pending', 'In Progress', 'Completed'));

CREATE TABLE IF NOT EXISTS task_update_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_update_id uuid NOT NULL REFERENCES task_updates(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_update_reads (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, employee_id)
);

CREATE TABLE IF NOT EXISTS task_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_update_attachments_update ON task_update_attachments(task_update_id);
CREATE INDEX IF NOT EXISTS idx_task_update_attachments_task ON task_update_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_task ON task_activity_logs(task_id, created_at);

ALTER TABLE task_update_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_update_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_update_attachments_select" ON task_update_attachments;
CREATE POLICY "task_update_attachments_select" ON task_update_attachments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "task_update_attachments_insert" ON task_update_attachments;
CREATE POLICY "task_update_attachments_insert" ON task_update_attachments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "task_update_reads_select" ON task_update_reads;
CREATE POLICY "task_update_reads_select" ON task_update_reads FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "task_update_reads_upsert" ON task_update_reads;
CREATE POLICY "task_update_reads_upsert" ON task_update_reads FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "task_activity_logs_select" ON task_activity_logs;
CREATE POLICY "task_activity_logs_select" ON task_activity_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "task_activity_logs_insert" ON task_activity_logs;
CREATE POLICY "task_activity_logs_insert" ON task_activity_logs FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_lead', 'task_assigned', 'task_reply', 'follow_up', 'overdue_task',
    'new_customer', 'new_booking', 'new_payment', 'new_invoice',
    'missing_document', 'document_required', 'travel_soon', 'urgent_travel_issue',
    'website_booking', 'new_visa', 'visa_review', 'visa_approved', 'visa_rejected',
    'visa_expired', 'visa_incomplete', 'accounts_approved', 'operations_ready',
    'flight_ready', 'ticket_issued', 'installment_overdue', 'installment_due_soon',
    'installment_due_today', 'booking_pending', 'approval_request'
  ));
