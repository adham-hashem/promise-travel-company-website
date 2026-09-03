-- Store public package day-by-day itinerary from the admin dashboard.
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS itinerary jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Public visitor bookings enter the inquiries workflow first, so uploaded
-- documents need to be attached to the inquiry before a customer is created.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS inquiry_id uuid REFERENCES inquiries(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_inquiry ON documents(inquiry_id);

DROP POLICY IF EXISTS "public_insert_website_documents" ON storage.objects;
CREATE POLICY "public_insert_website_documents"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'website-inquiries'
  );
