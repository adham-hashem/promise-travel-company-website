-- Keep immutable snapshots before saved quotations are edited.
CREATE TABLE IF NOT EXISTS quotation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  version_number bigint NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_quotation ON quotation_versions(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_versions_created_at ON quotation_versions(created_at);

ALTER TABLE quotation_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotation_versions_select_auth" ON quotation_versions;
CREATE POLICY "quotation_versions_select_auth" ON quotation_versions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "quotation_versions_insert_auth" ON quotation_versions;
CREATE POLICY "quotation_versions_insert_auth" ON quotation_versions FOR INSERT TO authenticated WITH CHECK (true);
