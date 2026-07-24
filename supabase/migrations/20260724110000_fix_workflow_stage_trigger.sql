-- ============================================================
-- Fix: Ensure all required columns exist on operation_files
-- and fix the workflow_stage trigger logic
-- ============================================================

-- 1. Add workflow_stage column if not exists
ALTER TABLE operation_files
  ADD COLUMN IF NOT EXISTS workflow_stage text NOT NULL DEFAULT 'new';

-- 2. Add financially_approved if not exists
ALTER TABLE operation_files
  ADD COLUMN IF NOT EXISTS financially_approved boolean NOT NULL DEFAULT false;

-- 3. Fix the trigger: do NOT override workflow_stage when it was
--    explicitly changed by the application in the same UPDATE statement.
--    Only auto-advance when file_status changes but workflow_stage stays the same.
CREATE OR REPLACE FUNCTION auto_update_workflow_stage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only auto-change workflow_stage when file_status changed
  -- but the app did NOT also explicitly change workflow_stage
  IF NEW.file_status IS DISTINCT FROM OLD.file_status AND
     NEW.workflow_stage IS NOT DISTINCT FROM OLD.workflow_stage THEN
    IF NEW.file_status = 'جاهز للسفر' AND OLD.workflow_stage NOT IN ('flight', 'ready', 'completed') THEN
      NEW.workflow_stage := 'ready';
    ELSIF NEW.file_status = 'مكتمل' THEN
      NEW.workflow_stage := 'completed';
    ELSIF NEW.file_status = 'قيد التجهيز' AND OLD.workflow_stage = 'new' THEN
      NEW.workflow_stage := 'operations';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Replace trigger to fire on ANY update column (not just file_status)
DROP TRIGGER IF EXISTS trg_auto_workflow_stage ON operation_files;
CREATE TRIGGER trg_auto_workflow_stage
  BEFORE UPDATE ON operation_files
  FOR EACH ROW EXECUTE FUNCTION auto_update_workflow_stage();

-- 5. Ensure open RLS policies
DROP POLICY IF EXISTS "ops_update" ON operation_files;
CREATE POLICY "ops_update" ON operation_files FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ops_insert" ON operation_files;
CREATE POLICY "ops_insert" ON operation_files FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ops_select" ON operation_files;
CREATE POLICY "ops_select" ON operation_files FOR SELECT
  TO anon, authenticated USING (true);
