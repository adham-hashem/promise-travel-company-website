/*
# Super Admin and Page Permissions Schema Upgrade

1. Update user_profiles check constraint for role to include 'super_admin' & 'مدير النظام'
2. Add page_permissions JSONB column to user_profiles to support fine-grained page access control
3. Add admin_page_access table to track which pages/permissions an admin is allowed to delegate to employees
*/

-- 1. Update role constraint on user_profiles
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('super_admin', 'مالك النظام', 'مدير النظام', 'مدير المبيعات', 'مندوب مبيعات', 'محاسب', 'موظف التشغيل', 'مسؤول طيران'));

-- 2. Add page_permissions column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS page_permissions jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Create admin_page_access table for tracking delegation rights
CREATE TABLE IF NOT EXISTS admin_delegation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  allowed_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  allowed_permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_delegation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delegation_select" ON admin_delegation_rules;
CREATE POLICY "delegation_select" ON admin_delegation_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "delegation_all" ON admin_delegation_rules;
CREATE POLICY "delegation_all" ON admin_delegation_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
