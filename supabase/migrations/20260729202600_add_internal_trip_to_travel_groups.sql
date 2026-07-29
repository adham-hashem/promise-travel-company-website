-- Add internal_trip_id to travel_groups table
ALTER TABLE travel_groups ADD COLUMN IF NOT EXISTS internal_trip_id UUID REFERENCES internal_trips(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_travel_groups_internal_trip ON travel_groups(internal_trip_id);
