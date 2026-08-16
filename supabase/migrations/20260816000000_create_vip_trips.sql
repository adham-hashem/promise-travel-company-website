-- Create VIP Trips table
CREATE TABLE IF NOT EXISTS public.vip_trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_number SERIAL,
    name TEXT NOT NULL,
    assigned_employee_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    departure_date DATE,
    return_date DATE,
    destination TEXT,
    total_price NUMERIC(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'نشطة', -- نشطة, مكتملة, ملغاة
    progress_percentage NUMERIC(5, 2) DEFAULT 0,
    execution_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vip_trips ENABLE ROW LEVEL SECURITY;

-- Create Policies for vip_trips
CREATE POLICY "Enable read access for all users on vip_trips" 
    ON public.vip_trips FOR SELECT USING (true);
    
CREATE POLICY "Enable insert access for authenticated users on vip_trips" 
    ON public.vip_trips FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
CREATE POLICY "Enable update access for authenticated users on vip_trips" 
    ON public.vip_trips FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users on vip_trips" 
    ON public.vip_trips FOR DELETE USING (auth.role() = 'authenticated');

-- Create VIP Trip Logs table
CREATE TABLE IF NOT EXISTS public.vip_trip_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES public.vip_trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vip_trip_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies for vip_trip_logs
CREATE POLICY "Enable read access for all users on vip_trip_logs" 
    ON public.vip_trip_logs FOR SELECT USING (true);
    
CREATE POLICY "Enable insert access for authenticated users on vip_trip_logs" 
    ON public.vip_trip_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add vip_trip_id to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS vip_trip_id UUID REFERENCES public.vip_trips(id) ON DELETE SET NULL;

-- Create trigger for updated_at on vip_trips
CREATE OR REPLACE FUNCTION update_vip_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vip_trips_updated_at
    BEFORE UPDATE ON public.vip_trips
    FOR EACH ROW
    EXECUTE FUNCTION update_vip_trips_updated_at();
