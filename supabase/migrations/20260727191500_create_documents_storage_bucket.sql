-- Create 'documents' bucket if it doesn't exist and define storage policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated users upload documents" ON storage.objects;
CREATE POLICY "Authenticated users upload documents" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Public select documents" ON storage.objects;
CREATE POLICY "Public select documents" ON storage.objects 
  FOR SELECT TO authenticated, anon USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated delete documents" ON storage.objects;
CREATE POLICY "Authenticated delete documents" ON storage.objects 
  FOR DELETE TO authenticated USING (bucket_id = 'documents');
