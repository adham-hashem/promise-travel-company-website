-- Link website-uploaded documents to converted customers by stable client code.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS client_code text,
  ADD COLUMN IF NOT EXISTS file_url text;

UPDATE documents d
SET client_code = c.client_code
FROM customers c
WHERE d.customer_id = c.id
  AND d.client_code IS NULL
  AND c.client_code IS NOT NULL;

UPDATE documents d
SET
  customer_id = i.converted_customer_id,
  client_code = c.client_code
FROM inquiries i
JOIN customers c ON c.id = i.converted_customer_id
WHERE d.inquiry_id = i.id
  AND i.converted_customer_id IS NOT NULL
  AND (d.customer_id IS NULL OR d.customer_id = i.converted_customer_id)
  AND (d.client_code IS NULL OR d.client_code = c.client_code);

CREATE INDEX IF NOT EXISTS idx_documents_client_code ON documents(client_code);

CREATE OR REPLACE FUNCTION sync_document_client_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.client_code IS NULL THEN
    SELECT client_code INTO NEW.client_code
    FROM customers
    WHERE id = NEW.customer_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_document_client_code ON documents;
CREATE TRIGGER set_document_client_code
BEFORE INSERT OR UPDATE OF customer_id, client_code ON documents
FOR EACH ROW
EXECUTE FUNCTION sync_document_client_code();
