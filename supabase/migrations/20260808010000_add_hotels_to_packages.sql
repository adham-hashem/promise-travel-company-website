-- Add hotel_makkah and hotel_madinah columns to packages table
ALTER TABLE packages ADD COLUMN IF NOT EXISTS hotel_makkah TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS hotel_madinah TEXT;
