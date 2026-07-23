/*
  # Automatic User Profile Sync & First User Super Admin Trigger

  1. Automatic Profile Creation:
     Whenever a new user is added to `auth.users` (via Supabase Auth Dashboard or API),
     this trigger automatically inserts a record into `public.user_profiles`.

  2. Automatic Super Admin Assignment:
     If this is the FIRST user registered in the system, they automatically receive `super_admin` role.
     Subsequent users receive the role specified in user_metadata or default to 'super_admin' if specified.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count integer;
  assigned_role text;
  user_name text;
BEGIN
  -- Count existing profiles
  SELECT count(*) INTO user_count FROM public.user_profiles;
  
  -- Extract role from metadata or set default
  IF user_count = 0 THEN
    assigned_role := 'super_admin';
  ELSE
    assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'super_admin');
  END IF;

  -- Extract name from metadata or use email prefix
  user_name := COALESCE(
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Auto-insert into public.user_profiles
  INSERT INTO public.user_profiles (id, name, email, role, status)
  VALUES (
    new.id,
    user_name,
    new.email,
    assigned_role,
    'نشط'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    email = EXCLUDED.email;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
