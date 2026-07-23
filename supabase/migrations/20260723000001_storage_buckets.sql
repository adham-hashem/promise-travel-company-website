/*
# Supabase Storage Buckets Setup
Creates storage buckets and RLS policies for:
1. customer-documents (passports, photos, IDs)
2. payment-proofs (bank transfers, receipts)
3. visa-files (visas)
4. flight-tickets (tickets)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('customer-documents', 'customer-documents', true),
  ('payment-proofs', 'payment-proofs', true),
  ('visa-files', 'visa-files', true),
  ('flight-tickets', 'flight-tickets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for customer-documents
DROP POLICY IF EXISTS "Authenticated users upload customer-documents" ON storage.objects;
CREATE POLICY "Authenticated users upload customer-documents" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'customer-documents');

DROP POLICY IF EXISTS "Public select customer-documents" ON storage.objects;
CREATE POLICY "Public select customer-documents" ON storage.objects 
  FOR SELECT TO authenticated, anon USING (bucket_id = 'customer-documents');

DROP POLICY IF EXISTS "Authenticated delete customer-documents" ON storage.objects;
CREATE POLICY "Authenticated delete customer-documents" ON storage.objects 
  FOR DELETE TO authenticated USING (bucket_id = 'customer-documents');

-- Storage policies for payment-proofs
DROP POLICY IF EXISTS "Authenticated users upload payment-proofs" ON storage.objects;
CREATE POLICY "Authenticated users upload payment-proofs" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Public select payment-proofs" ON storage.objects;
CREATE POLICY "Public select payment-proofs" ON storage.objects 
  FOR SELECT TO authenticated, anon USING (bucket_id = 'payment-proofs');

-- Storage policies for visa-files
DROP POLICY IF EXISTS "Authenticated users upload visa-files" ON storage.objects;
CREATE POLICY "Authenticated users upload visa-files" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'visa-files');

DROP POLICY IF EXISTS "Public select visa-files" ON storage.objects;
CREATE POLICY "Public select visa-files" ON storage.objects 
  FOR SELECT TO authenticated, anon USING (bucket_id = 'visa-files');

-- Storage policies for flight-tickets
DROP POLICY IF EXISTS "Authenticated users upload flight-tickets" ON storage.objects;
CREATE POLICY "Authenticated users upload flight-tickets" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'flight-tickets');

DROP POLICY IF EXISTS "Public select flight-tickets" ON storage.objects;
CREATE POLICY "Public select flight-tickets" ON storage.objects 
  FOR SELECT TO authenticated, anon USING (bucket_id = 'flight-tickets');
