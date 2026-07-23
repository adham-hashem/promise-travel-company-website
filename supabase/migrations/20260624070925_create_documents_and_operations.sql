-- Document Management & Operations workflow
-- 1. documents table: customer/booking document uploads with status workflow
-- 2. storage bucket: 'documents' for file uploads (public read for authenticated)

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  doc_type text NOT NULL, -- جواز سفر | بطاقة رقم قومي | صورة شخصية | مستند إضافي | تأشيرة
  file_path text NOT NULL, -- storage path
  file_name text,
  file_size bigint,
  status text NOT NULL DEFAULT 'مرفوع', -- مرفوع | قيد المراجعة | مقبول | مرفوض
  review_notes text,
  reviewed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select_auth" ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents_insert_auth" ON documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "documents_update_auth" ON documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "documents_delete_auth" ON documents FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_booking ON documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Storage bucket for document files (public so uploaded files are readable by authenticated clients)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated can manage documents bucket
CREATE POLICY "documents_bucket_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "documents_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "documents_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "documents_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documents');
