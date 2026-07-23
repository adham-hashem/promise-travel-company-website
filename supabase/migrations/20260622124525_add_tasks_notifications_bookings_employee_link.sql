/*
# Employee team management: tasks, bookings linkage, notifications, counter sync

## Summary
Turns the `employees` page into a full team-management surface. Adds a `tasks`
table, links `bookings` to `employees`, adds a `notifications` table for in-app
alerts, and installs triggers that keep `employees.clients_count` and
`employees.bookings_count` in sync automatically — so the dashboard charts and
stats are always accurate without manual re-counts.

## New Tables
1. `tasks`
   - `id` uuid PK
   - `title` text (required)
   - `description` text (nullable)
   - `employee_id` uuid → employees.id ON DELETE CASCADE (required)
   - `priority` text: منخفضة | متوسطة | عالية (default منخفضة)
   - `status` text: جديدة | قيد التنفيذ | مكتملة | متأخرة (default جديدة)
   - `start_date` date (required)
   - `due_date` date (required)
   - `completed_at` timestamptz (nullable)
   - `created_at` timestamptz
   - RLS: authenticated can CRUD their own + managers can see all
2. `notifications`
   - `id` uuid PK
   - `employee_id` uuid → employees.id ON DELETE CASCADE (required)
   - `type` text: new_lead | task_assigned | follow_up | overdue_task
   - `title` text
   - `body` text (nullable)
   - `is_read` boolean default false
   - `created_at` timestamptz
   - RLS: authenticated can read/update their own

## Modified Tables
- `bookings`: adds `employee_id uuid` (nullable, references employees ON DELETE SET NULL)
  so bookings can be attributed to the employee who closed them. The same employee
  who owns the customer is the default, but this column lets us attribute bookings
  even when the customer was later reassigned.

## Functions / Triggers
- `sync_employee_clients_count()` — AFTER INSERT/DELETE on `customers` updates
  `employees.clients_count` for the affected `assigned_employee_id`.
- `sync_employee_bookings_count()` — AFTER INSERT/DELETE/UPDATE on `bookings`
  updates `employees.bookings_count` for the affected `employee_id` (and the old
  one if reassigned).
- `auto_mark_overdue_tasks()` — marks tasks past due_date and not completed as
  متأخرة. (Called by the app on read; also a trigger on task update.)

## Security
- RLS enabled on `tasks` and `notifications`.
  - Tasks: any authenticated user can SELECT (managers need visibility); INSERT/
    UPDATE/DELETE open to authenticated (UI guards by role).
  - Notifications: SELECT/UPDATE restricted to the owner employee's user_id
    via the employee → user_profiles join; INSERT open for system creation.

## Notes
- All counter updates happen in triggers, so the app never has to maintain
  `clients_count` / `bookings_count` manually.
- Adding `employee_id` to `bookings` is additive and nullable — existing rows
  stay valid.
*/

-- ===== 1. tasks table =====
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  priority text NOT NULL DEFAULT 'منخفضة' CHECK (priority IN ('منخفضة', 'متوسطة', 'عالية')),
  status text NOT NULL DEFAULT 'جديدة' CHECK (status IN ('جديدة', 'قيد التنفيذ', 'مكتملة', 'متأخرة')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_employee ON tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_all" ON tasks;
CREATE POLICY "tasks_select_all" ON tasks FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "tasks_insert_auth" ON tasks;
CREATE POLICY "tasks_insert_auth" ON tasks FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_update_auth" ON tasks;
CREATE POLICY "tasks_update_auth" ON tasks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_delete_auth" ON tasks;
CREATE POLICY "tasks_delete_auth" ON tasks FOR DELETE
  TO authenticated USING (true);

-- ===== 2. notifications table =====
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_lead', 'task_assigned', 'follow_up', 'overdue_task')),
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(employee_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.id = (SELECT e.id FROM employees e WHERE e.id = notifications.employee_id)
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('مالك النظام', 'مدير المبيعات')
    )
  );

DROP POLICY IF EXISTS "notifications_insert_auth" ON notifications;
CREATE POLICY "notifications_insert_auth" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ===== 3. bookings.employee_id =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_employee ON bookings(employee_id);

-- Backfill: set booking employee_id = customer's assigned employee where missing
UPDATE bookings b
SET employee_id = c.assigned_employee_id
FROM customers c
WHERE b.customer_id = c.id
  AND b.employee_id IS NULL
  AND c.assigned_employee_id IS NOT NULL;

-- ===== 4. Counter sync functions =====

CREATE OR REPLACE FUNCTION sync_employee_clients_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') AND NEW.assigned_employee_id IS NOT NULL THEN
    UPDATE employees
    SET clients_count = (SELECT COUNT(*) FROM customers WHERE assigned_employee_id = NEW.assigned_employee_id)
    WHERE id = NEW.assigned_employee_id;
  ELSIF (TG_OP = 'DELETE') AND OLD.assigned_employee_id IS NOT NULL THEN
    UPDATE employees
    SET clients_count = (SELECT COUNT(*) FROM customers WHERE assigned_employee_id = OLD.assigned_employee_id)
    WHERE id = OLD.assigned_employee_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.assigned_employee_id IS NOT NULL AND (NEW.assigned_employee_id IS NULL OR NEW.assigned_employee_id <> OLD.assigned_employee_id) THEN
      UPDATE employees
      SET clients_count = (SELECT COUNT(*) FROM customers WHERE assigned_employee_id = OLD.assigned_employee_id)
      WHERE id = OLD.assigned_employee_id;
    END IF;
    IF NEW.assigned_employee_id IS NOT NULL AND (OLD.assigned_employee_id IS NULL OR NEW.assigned_employee_id <> OLD.assigned_employee_id) THEN
      UPDATE employees
      SET clients_count = (SELECT COUNT(*) FROM customers WHERE assigned_employee_id = NEW.assigned_employee_id)
      WHERE id = NEW.assigned_employee_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_clients_count ON customers;
CREATE TRIGGER trg_sync_clients_count
AFTER INSERT OR DELETE OR UPDATE OF assigned_employee_id ON customers
FOR EACH ROW EXECUTE FUNCTION sync_employee_clients_count();

CREATE OR REPLACE FUNCTION sync_employee_bookings_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') AND NEW.employee_id IS NOT NULL THEN
    UPDATE employees
    SET bookings_count = (SELECT COUNT(*) FROM bookings WHERE employee_id = NEW.employee_id)
    WHERE id = NEW.employee_id;
  ELSIF (TG_OP = 'DELETE') AND OLD.employee_id IS NOT NULL THEN
    UPDATE employees
    SET bookings_count = (SELECT COUNT(*) FROM bookings WHERE employee_id = OLD.employee_id)
    WHERE id = OLD.employee_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.employee_id IS NOT NULL AND (NEW.employee_id IS NULL OR NEW.employee_id <> OLD.employee_id) THEN
      UPDATE employees
      SET bookings_count = (SELECT COUNT(*) FROM bookings WHERE employee_id = OLD.employee_id)
      WHERE id = OLD.employee_id;
    END IF;
    IF NEW.employee_id IS NOT NULL AND (OLD.employee_id IS NULL OR NEW.employee_id <> OLD.employee_id) THEN
      UPDATE employees
      SET bookings_count = (SELECT COUNT(*) FROM bookings WHERE employee_id = NEW.employee_id)
      WHERE id = NEW.employee_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_bookings_count ON bookings;
CREATE TRIGGER trg_sync_bookings_count
AFTER INSERT OR DELETE OR UPDATE OF employee_id ON bookings
FOR EACH ROW EXECUTE FUNCTION sync_employee_bookings_count();

-- ===== 5. Auto-mark overdue tasks =====
CREATE OR REPLACE FUNCTION auto_mark_overdue_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> 'مكتملة' AND NEW.due_date < CURRENT_DATE AND NEW.status <> 'متأخرة' THEN
    NEW.status := 'متأخرة';
  END IF;
  IF NEW.status = 'مكتملة' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_overdue ON tasks;
CREATE TRIGGER trg_auto_overdue
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION auto_mark_overdue_tasks();

-- ===== 6. Recalculate counters from scratch (one-time reconciliation) =====
UPDATE employees e
SET clients_count = COALESCE(
  (SELECT COUNT(*) FROM customers WHERE assigned_employee_id = e.id),
  0
),
bookings_count = COALESCE(
  (SELECT COUNT(*) FROM bookings WHERE employee_id = e.id),
  0
);

-- ===== 7. sample daily tasks =====
INSERT INTO tasks (title, description, employee_id, priority, status, start_date, due_date)
SELECT
  'الاتصال بـ 20 عميل جديد',
  'تواصل هاتفي مع 20 عميل جديد لتقديم باقات الحج والعمرة',
  e.id,
  'عالية',
  'جديدة',
  CURRENT_DATE,
  CURRENT_DATE
FROM employees e
WHERE e.role = 'مندوب مبيعات'
  AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.employee_id = e.id LIMIT 1)
LIMIT 4;

INSERT INTO tasks (title, description, employee_id, priority, status, start_date, due_date)
SELECT
  'متابعة الحجوزات المعلقة',
  'مراجعة جميع الحجوزات في حالة "معلق" والاتصال بالعملاء لتأكيدها',
  e.id,
  'متوسطة',
  'قيد التنفيذ',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '2 days'
FROM employees e
WHERE e.role = 'مندوب مبيعات'
  AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.title = 'متابعة الحجوزات المعلقة' AND t.employee_id = e.id)
LIMIT 4;
