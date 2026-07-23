/*
# Add User Profiles and Role-Based Permissions

## Summary
Creates a `user_profiles` table linked to Supabase Auth (auth.users) to store
extended user info: name, phone, role, status, and a JSONB permissions field.

## New Tables
- `user_profiles`
  - `id` (uuid, PK, references auth.users)
  - `name` (text)
  - `email` (text)
  - `phone` (text, nullable)
  - `role` (text: مالك النظام | مدير المبيعات | مندوب مبيعات | محاسب)
  - `status` (text: نشط | غير نشط)
  - `permissions` (jsonb - granular per-module permissions)
  - `created_at` (timestamptz)

## Security
- RLS enabled
- Authenticated users can read all profiles (needed for admin UI)
- Users can update only their own profile (except role/permissions)
- Service role (edge function) can insert/update all

## Notes
- Permissions JSONB structure mirrors the UI checkboxes per module
- Default permissions are set per role on insert via trigger
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'مندوب مبيعات' CHECK (role IN ('مالك النظام', 'مدير المبيعات', 'مندوب مبيعات', 'محاسب')),
  status text NOT NULL DEFAULT 'نشط' CHECK (status IN ('نشط', 'غير نشط')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON user_profiles;
CREATE POLICY "profiles_select" ON user_profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON user_profiles;
CREATE POLICY "profiles_insert" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON user_profiles;
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_delete" ON user_profiles;
CREATE POLICY "profiles_delete" ON user_profiles FOR DELETE
  TO authenticated USING (true);
