/*
# Internal Tourism Module — trips, bookings, customers

1. New Tables
- `internal_trips`
  - id (uuid PK)
  - name (text) — Trip Name
  - destination (text) — Destination
  - hotel (text) — Hotel
  - duration (text) — Duration description (e.g. "5 أيام / 4 ليالي")
  - start_date (date) — Trip Start Date
  - end_date (date) — Trip End Date
  - price (numeric) — Price per seat
  - total_seats (int) — Total Seats
  - available_seats (int) — Available Seats
  - status (text) — Available | Full | Closed | Cancelled (Arabic: متاحة | ممتلئة | مغلقة | ملغاة)
  - created_at (timestamp)
- `internal_trip_bookings`
  - id (uuid PK)
  - customer_name (text)
  - phone (text)
  - trip_id (uuid FK -> internal_trips.id)
  - travelers_count (int)
  - booking_status (text) — New | Confirmed | Cancelled | Completed (Arabic: جديدة | مؤكدة | ملغاة | مكتملة)
  - payment_status (text) — Unpaid | Partially Paid | Fully Paid (Arabic: غير مدفوع | مدفوع جزئياً | مدفوع بالكامل)
  - employee_id (uuid, optional FK -> employees.id)
  - total_amount (numeric)
  - paid_amount (numeric)
  - created_at (timestamp)
- `internal_customers`
  - id (uuid PK)
  - name (text)
  - phone (text)
  - interested_destination (text)
  - last_follow_up (date, optional)
  - employee_id (uuid, optional FK -> employees.id)
  - created_at (timestamp)

2. Security
- RLS enabled on all three tables.
- 4 CRUD policies each, restricted to `authenticated`.
- Ownership/membership is not single-user — these are company-wide records visible to all authenticated staff (mirrors the existing `customers`/`bookings`/`employees` pattern in this project). USING (true) with TO authenticated is the intentional shared-data model, documented here.
*/

-- internal_trips
CREATE TABLE IF NOT EXISTS internal_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  destination text NOT NULL,
  hotel text,
  duration text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  price numeric DEFAULT 0,
  total_seats int NOT NULL DEFAULT 0,
  available_seats int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'متاحة',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE internal_trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "it_select" ON internal_trips;
CREATE POLICY "it_select" ON internal_trips FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "it_insert" ON internal_trips;
CREATE POLICY "it_insert" ON internal_trips FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "it_update" ON internal_trips;
CREATE POLICY "it_update" ON internal_trips FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "it_delete" ON internal_trips;
CREATE POLICY "it_delete" ON internal_trips FOR DELETE TO authenticated USING (true);

-- internal_trip_bookings
CREATE TABLE IF NOT EXISTS internal_trip_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text,
  trip_id uuid REFERENCES internal_trips(id) ON DELETE SET NULL,
  travelers_count int NOT NULL DEFAULT 1,
  booking_status text NOT NULL DEFAULT 'جديدة',
  payment_status text NOT NULL DEFAULT 'غير مدفوع',
  employee_id uuid,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE internal_trip_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "itb_select" ON internal_trip_bookings;
CREATE POLICY "itb_select" ON internal_trip_bookings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "itb_insert" ON internal_trip_bookings;
CREATE POLICY "itb_insert" ON internal_trip_bookings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "itb_update" ON internal_trip_bookings;
CREATE POLICY "itb_update" ON internal_trip_bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "itb_delete" ON internal_trip_bookings;
CREATE POLICY "itb_delete" ON internal_trip_bookings FOR DELETE TO authenticated USING (true);

-- internal_customers
CREATE TABLE IF NOT EXISTS internal_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  interested_destination text,
  last_follow_up date,
  employee_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE internal_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ic_select" ON internal_customers;
CREATE POLICY "ic_select" ON internal_customers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ic_insert" ON internal_customers;
CREATE POLICY "ic_insert" ON internal_customers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ic_update" ON internal_customers;
CREATE POLICY "ic_update" ON internal_customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ic_delete" ON internal_customers;
CREATE POLICY "ic_delete" ON internal_customers FOR DELETE TO authenticated USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_internal_trips_status ON internal_trips(status);
CREATE INDEX IF NOT EXISTS idx_internal_trip_bookings_trip ON internal_trip_bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_internal_trip_bookings_status ON internal_trip_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_internal_customers_employee ON internal_customers(employee_id);
