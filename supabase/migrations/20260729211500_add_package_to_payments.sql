-- Add package_id to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES packages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_package ON payments(package_id);
