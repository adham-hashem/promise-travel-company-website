-- Ensure financially_approved column exists on operation_files
ALTER TABLE operation_files
  ADD COLUMN IF NOT EXISTS financially_approved boolean NOT NULL DEFAULT false;

-- Ensure workflow_stage has 'operations' as a valid value (no enum constraint, it's text)
-- Just make sure the column exists and the policies allow update
-- Re-apply open RLS policies to guarantee update access
DROP POLICY IF EXISTS "ops_update" ON operation_files;
CREATE POLICY "ops_update" ON operation_files FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
