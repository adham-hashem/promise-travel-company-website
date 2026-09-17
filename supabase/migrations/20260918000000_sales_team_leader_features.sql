-- Migration: Sales Team Leader Features
-- 1. Create sales_teams table
CREATE TABLE IF NOT EXISTS public.sales_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leader_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(leader_id, member_id)
);

-- Enable RLS
ALTER TABLE public.sales_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.sales_teams FOR ALL USING (auth.role() = 'authenticated');

-- 2. Add columns to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS travel_interest_month VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_transferred_to_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transferred_to_admin_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transferred_to_admin_at TIMESTAMPTZ;

-- 3. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
