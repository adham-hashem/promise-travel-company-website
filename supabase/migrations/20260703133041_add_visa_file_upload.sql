/*
# Visa File Upload System

## Summary
Adds the ability to upload the actual issued visa file (PDF/JPG/PNG) to a visa
record. Tracks visa number, file path, upload date, and uploader. Adds a
visa_uploaded flag to the travel checklist so readiness requires BOTH visa
approval AND the visa file upload.

## Modified Tables
- `visa_management`: add visa_number, visa_file_path, visa_file_name,
  visa_upload_status, visa_file_uploaded_at, visa_file_uploaded_by
- `travel_checklist`: add visa_uploaded boolean

## Modified Functions
- `get_travel_readiness`: now factors in visa_uploaded; ready requires
  visa_done AND visa_uploaded AND visa approved.
*/
;

-- ===== 1. Add visa file columns to visa_management =====
ALTER TABLE visa_management ADD COLUMN IF NOT EXISTS visa_number text;
ALTER TABLE visa_management ADD COLUMN IF NOT EXISTS visa_file_path text;
ALTER TABLE visa_management ADD COLUMN IF NOT EXISTS visa_file_name text;
ALTER TABLE visa_management ADD COLUMN IF NOT EXISTS visa_upload_status text NOT NULL DEFAULT 'Not Uploaded'
  CHECK (visa_upload_status IN ('Not Uploaded', 'Uploaded'));
ALTER TABLE visa_management ADD COLUMN IF NOT EXISTS visa_file_uploaded_at timestamptz;
ALTER TABLE visa_management ADD COLUMN IF NOT EXISTS visa_file_uploaded_by uuid;

-- ===== 2. Add visa_uploaded to travel_checklist =====
ALTER TABLE travel_checklist ADD COLUMN IF NOT EXISTS visa_uploaded boolean NOT NULL DEFAULT false;

-- ===== 3. Update get_travel_readiness to require visa upload =====
CREATE OR REPLACE FUNCTION get_travel_readiness(p_customer_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cl record;
  v_visa visa_management%ROWTYPE;
BEGIN
  SELECT * INTO v_cl FROM travel_checklist WHERE customer_id = p_customer_id;
  SELECT * INTO v_visa FROM visa_management WHERE customer_id = p_customer_id ORDER BY created_at DESC LIMIT 1;

  RETURN json_build_object(
    'passport', COALESCE(v_cl.passport_done, false),
    'visa', COALESCE(v_cl.visa_done AND (v_visa.visa_status = 'تمت الموافقة'), false),
    'visa_uploaded', COALESCE(v_cl.visa_uploaded OR (v_visa.visa_upload_status = 'Uploaded'), false),
    'ticket', COALESCE(v_cl.ticket_done, false),
    'hotel', COALESCE(v_cl.hotel_done, false),
    'invoice', COALESCE(v_cl.invoice_done, false),
    'payment', COALESCE(v_cl.payment_done, false),
    'ready', COALESCE(
      v_cl.passport_done
      AND v_cl.visa_done
      AND (v_visa.visa_status = 'تمت الموافقة')
      AND (v_cl.visa_uploaded OR v_visa.visa_upload_status = 'Uploaded')
      AND v_cl.ticket_done
      AND v_cl.hotel_done
      AND v_cl.invoice_done
      AND v_cl.payment_done,
      false
    )
  );
END;
$$;
