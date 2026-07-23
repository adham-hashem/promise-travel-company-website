/*
# Complete Operations Department

## Summary
Adds operational document tracking, assignment, priority, pax count, and
special requests to operation files. Creates a dedicated operation file
documents table for uploading operational documents (confirmed tickets,
hotel vouchers, transport vouchers, insurance, visa copies, etc.) directly
within the operations department.

## New Tables
- `operation_file_documents` — operational documents per operation file
  (id, operation_file_id, doc_type, file_path, file_name, uploaded_by, created_at)

## Modified Tables
- `operation_files`: add assigned_to (FK user_profiles), priority, pax_count,
  special_requests, passport_data, visa_data

## Functions
- `auto_update_workflow_stage()` — BEFORE UPDATE trigger that auto-advances
  workflow_stage based on file_status changes (جاهز للسفر → 'ready',
  مكتمل → 'completed', جديد → 'new', قيد التجهيز → 'operations')
*/
;

-- ===== 1. operation_file_documents table =====
CREATE TABLE IF NOT EXISTS operation_file_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_file_id uuid NOT NULL REFERENCES operation_files(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE operation_file_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "opdocs_select" ON operation_file_documents;
CREATE POLICY "opdocs_select" ON operation_file_documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "opdocs_insert" ON operation_file_documents;
CREATE POLICY "opdocs_insert" ON operation_file_documents FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "opdocs_update" ON operation_file_documents;
CREATE POLICY "opdocs_update" ON operation_file_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "opdocs_delete" ON operation_file_documents;
CREATE POLICY "opdocs_delete" ON operation_file_documents FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_opdocs_file ON operation_file_documents(operation_file_id);

-- ===== 2. Add columns to operation_files =====
ALTER TABLE operation_files ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
ALTER TABLE operation_files ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'عادية'
  CHECK (priority IN ('عاجلة', 'عادية', 'منخفضة'));
ALTER TABLE operation_files ADD COLUMN IF NOT EXISTS pax_count integer NOT NULL DEFAULT 1;
ALTER TABLE operation_files ADD COLUMN IF NOT EXISTS special_requests text;
ALTER TABLE operation_files ADD COLUMN IF NOT EXISTS passport_data jsonb;
ALTER TABLE operation_files ADD COLUMN IF NOT EXISTS visa_data jsonb;

-- ===== 3. Auto-update workflow_stage based on file_status =====
CREATE OR REPLACE FUNCTION auto_update_workflow_stage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.file_status IS DISTINCT FROM OLD.file_status THEN
    IF NEW.file_status = 'جاهز للسفر' AND COALESCE(NEW.workflow_stage, 'new') NOT IN ('ready', 'completed') THEN
      NEW.workflow_stage := 'ready';
    ELSIF NEW.file_status = 'مكتمل' THEN
      NEW.workflow_stage := 'completed';
    ELSIF NEW.file_status = 'جديد' AND COALESCE(NEW.workflow_stage, 'new') = 'new' THEN
      NEW.workflow_stage := 'new';
    ELSIF NEW.file_status = 'قيد التجهيز' AND COALESCE(NEW.workflow_stage, 'new') IN ('new', 'operations') THEN
      NEW.workflow_stage := 'operations';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_workflow_stage ON operation_files;
CREATE TRIGGER trg_auto_workflow_stage
  BEFORE UPDATE OF file_status ON operation_files
  FOR EACH ROW EXECUTE FUNCTION auto_update_workflow_stage();
