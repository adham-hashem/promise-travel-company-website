-- Add a notes column to the bookings table so detail views can show it
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS notes text;
