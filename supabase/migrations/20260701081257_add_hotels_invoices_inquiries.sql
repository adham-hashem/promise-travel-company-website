
-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'السعودية',
  address TEXT,
  stars INTEGER NOT NULL DEFAULT 3 CHECK (stars IN (3, 4, 5)),
  category TEXT NOT NULL DEFAULT '3 نجوم' CHECK (category IN ('3 نجوم', '4 نجوم', '5 نجوم', 'VIP')),
  price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  services TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'نشط' CHECK (status IN ('نشط', 'غير نشط')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotels_select" ON hotels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "hotels_insert" ON hotels FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "hotels_update" ON hotels FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hotels_delete" ON hotels FOR DELETE TO anon, authenticated USING (true);

-- Link hotels to packages (many-to-many)
CREATE TABLE IF NOT EXISTS package_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  nights INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_id, hotel_id)
);

ALTER TABLE package_hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_hotels_select" ON package_hotels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "package_hotels_insert" ON package_hotels FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "package_hotels_update" ON package_hotels FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "package_hotels_delete" ON package_hotels FOR DELETE TO anon, authenticated USING (true);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL DEFAULT 'عمرة' CHECK (service_type IN ('حج', 'عمرة', 'رحلة داخلية', 'أخرى')),
  package_name TEXT,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'غير مدفوع' CHECK (payment_status IN ('غير مدفوع', 'مدفوع جزئياً', 'مدفوع بالكامل')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select" ON invoices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "invoices_delete" ON invoices FOR DELETE TO anon, authenticated USING (true);

-- Inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'عمرة' CHECK (service_type IN ('حج', 'عمرة', 'رحلة داخلية', 'فندق', 'أخرى')),
  source TEXT NOT NULL DEFAULT 'واتساب' CHECK (source IN ('الموقع الإلكتروني', 'واتساب', 'مكالمة', 'زيارة', 'فيسبوك', 'إنستجرام')),
  status TEXT NOT NULL DEFAULT 'جديد' CHECK (status IN ('جديد', 'قيد المتابعة', 'تم التحويل', 'مغلق')),
  assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  notes TEXT,
  converted_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  converted_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inquiries_select" ON inquiries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "inquiries_insert" ON inquiries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "inquiries_update" ON inquiries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inquiries_delete" ON inquiries FOR DELETE TO anon, authenticated USING (true);
