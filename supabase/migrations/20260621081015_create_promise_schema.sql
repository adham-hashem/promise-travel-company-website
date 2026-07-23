
-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'مندوب مبيعات',
  email TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  clients_count INTEGER DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  target_percentage NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_employees" ON employees FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_employees" ON employees FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_employees" ON employees FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_employees" ON employees FOR DELETE TO anon, authenticated USING (true);

-- Packages table
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('حج', 'عمرة')),
  hotel TEXT,
  airline TEXT,
  duration_days INTEGER,
  price NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_packages" ON packages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_packages" ON packages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_packages" ON packages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_packages" ON packages FOR DELETE TO anon, authenticated USING (true);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  discount_percentage NUMERIC(5,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_offers" ON offers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_offers" ON offers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_offers" ON offers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_offers" ON offers FOR DELETE TO anon, authenticated USING (true);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  governorate TEXT,
  national_id TEXT,
  service_type TEXT CHECK (service_type IN ('حج', 'عمرة')),
  requested_package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  source TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'جديد' CHECK (status IN ('جديد', 'مهتم', 'متابعة', 'تم الحجز', 'مكتمل', 'ملغي')),
  assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  last_follow_up TIMESTAMPTZ,
  next_follow_up TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_customers" ON customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_customers" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_customers" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_customers" ON customers FOR DELETE TO anon, authenticated USING (true);

-- Communication logs table
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('مكالمة', 'واتساب', 'زيارة', 'بريد إلكتروني')),
  result TEXT,
  notes TEXT,
  agreed_on TEXT,
  next_follow_up TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_comm_logs" ON communication_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_comm_logs" ON communication_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_comm_logs" ON communication_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_comm_logs" ON communication_logs FOR DELETE TO anon, authenticated USING (true);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'معلق' CHECK (status IN ('معلق', 'مؤكد', 'ملغي')),
  payment_status TEXT NOT NULL DEFAULT 'غير مدفوع' CHECK (payment_status IN ('غير مدفوع', 'مدفوع جزئياً', 'مدفوع بالكامل')),
  total_amount NUMERIC(10,2),
  paid_amount NUMERIC(10,2) DEFAULT 0,
  booking_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_bookings" ON bookings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_bookings" ON bookings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_bookings" ON bookings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_bookings" ON bookings FOR DELETE TO anon, authenticated USING (true);

-- Seed some data
INSERT INTO employees (name, role, phone, clients_count, bookings_count, target_percentage) VALUES
  ('أحمد محمد السيد', 'مدير المبيعات', '01012345678', 45, 32, 87.5),
  ('فاطمة علي حسن', 'مندوب مبيعات', '01123456789', 38, 27, 75.0),
  ('محمود إبراهيم', 'مندوب مبيعات', '01234567890', 29, 19, 62.3),
  ('نور الدين عمر', 'مندوب مبيعات', '01345678901', 52, 41, 92.1);

INSERT INTO packages (name, type, hotel, airline, duration_days, price) VALUES
  ('باقة العمرة الاقتصادية', 'عمرة', 'فندق قريش', 'مصر للطيران', 10, 8500.00),
  ('باقة العمرة الفاخرة', 'عمرة', 'فندق الشيراتون مكة', 'مصر للطيران', 14, 15000.00),
  ('باقة الحج الاقتصادية', 'حج', 'فندق النور', 'طيران العربية', 40, 25000.00),
  ('باقة الحج الفاخرة', 'حج', 'فندق هيلتون مكة', 'مصر للطيران', 45, 45000.00),
  ('باقة عمرة رمضان', 'عمرة', 'فندق موفنبيك', 'مصر للطيران', 15, 18000.00);

INSERT INTO offers (name, discount_percentage, start_date, end_date) VALUES
  ('خصم الحجز المبكر', 10.00, '2026-01-01', '2026-06-30'),
  ('عرض رمضان المبارك', 15.00, '2026-02-01', '2026-03-31'),
  ('خصم العائلات', 8.00, '2026-01-01', '2026-12-31');
