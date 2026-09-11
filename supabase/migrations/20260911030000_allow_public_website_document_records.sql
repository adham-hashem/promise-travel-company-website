-- Allow public website booking requests to create document records for the
-- inquiry they just created. Admin users can then see the real uploaded files
-- from the inquiry details and after conversion to a customer.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS inquiry_id uuid REFERENCES inquiries(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS file_url text;

CREATE INDEX IF NOT EXISTS idx_documents_inquiry ON documents(inquiry_id);

DROP POLICY IF EXISTS "public_insert_website_document_records" ON documents;
CREATE POLICY "public_insert_website_document_records"
  ON documents FOR INSERT
  TO anon
  WITH CHECK (
    inquiry_id IS NOT NULL
    AND customer_id IS NULL
    AND booking_id IS NULL
    AND file_path LIKE 'website-inquiries/%'
  );

DROP POLICY IF EXISTS "public_insert_website_documents" ON storage.objects;
CREATE POLICY "public_insert_website_documents"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'website-inquiries'
  );
