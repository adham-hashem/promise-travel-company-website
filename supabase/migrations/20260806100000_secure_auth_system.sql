-- Enable pgcrypto extension for bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Function to create an app user with password hashing and validation
CREATE OR REPLACE FUNCTION public.create_app_user(
  p_email text,
  p_password text,
  p_name text,
  p_role text,
  p_phone text DEFAULT NULL,
  p_status text DEFAULT 'نشط',
  p_permissions jsonb DEFAULT '{}'::jsonb,
  p_page_permissions jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
  v_instance_id uuid;
BEGIN
  -- Verify caller is authorized (Super Admin, System Owner, or Manager)
  -- Skip this check if run directly via SQL Editor (where request.jwt.claims is null)
  IF current_setting('request.jwt.claims', true) IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'مالك النظام', 'مدير النظام')
  ) AND EXISTS (SELECT 1 FROM public.user_profiles) THEN
    -- If there are no profiles in the system, we allow creating the first one
    RAISE EXCEPTION 'Unauthorized: Only Super Admin or System Owner/Manager can create users';
  END IF;

  -- Validate password strength
  IF length(p_password) < 8 THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
  END IF;
  IF p_password !~ '[A-Z]' THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)';
  END IF;
  IF p_password !~ '[a-z]' THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)';
  END IF;
  IF p_password !~ '[0-9]' THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)';
  END IF;
  IF p_password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (مثل !@#$%%^&*)';
  END IF;

  -- Clean and validate email
  p_email := lower(trim(p_email));
  IF p_email !~ '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'البريد الإلكتروني غير صالح';
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'البريد الإلكتروني مسجل بالفعل في النظام';
  END IF;

  -- Get current instance_id
  SELECT instance_id INTO v_instance_id FROM auth.users LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Hash the password using bcrypt with salt factor 10
  v_encrypted_password := crypt(p_password, gen_salt('bf', 10));
  
  -- Insert into auth.users directly
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_instance_id,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_password,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    json_build_object('name', p_name, 'role', p_role)::jsonb,
    false,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO v_user_id;

  -- Insert/Update public.user_profiles
  -- The existing handle_new_user trigger will insert, so we do an update to set specific properties
  UPDATE public.user_profiles
  SET
    name = p_name,
    phone = p_phone,
    role = p_role,
    status = p_status,
    permissions = p_permissions,
    page_permissions = p_page_permissions
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to change a user password with bcrypt hashing and strength check
CREATE OR REPLACE FUNCTION public.change_user_password(
  p_user_id uuid,
  p_new_password text
) RETURNS boolean AS $$
DECLARE
  v_encrypted_password text;
BEGIN
  -- Verify caller is either the user themselves or an admin
  -- Skip this check if run directly via SQL Editor (where request.jwt.claims is null)
  IF current_setting('request.jwt.claims', true) IS NOT NULL AND (
    auth.uid() IS NULL OR (
      auth.uid() <> p_user_id AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'مالك النظام', 'مدير النظام')
      )
    )
  ) THEN
    RAISE EXCEPTION 'غير مصرح: يمكنك فقط تغيير كلمة مرورك الخاصة، ما لم تكن مديراً للنظام';
  END IF;

  -- Validate password strength
  IF length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
  END IF;
  IF p_new_password !~ '[A-Z]' THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)';
  END IF;
  IF p_new_password !~ '[a-z]' THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)';
  END IF;
  IF p_new_password !~ '[0-9]' THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)';
  END IF;
  IF p_new_password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (مثل !@#$%%^&*)';
  END IF;

  -- Hash the new password using bcrypt
  v_encrypted_password := crypt(p_new_password, gen_salt('bf', 10));
  
  -- Update auth.users
  UPDATE auth.users
  SET 
    encrypted_password = v_encrypted_password,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Stored Procedure for Super Admin password recovery (DB access only)
CREATE OR REPLACE FUNCTION public.reset_super_admin_password(
  p_new_password text
) RETURNS text AS $$
DECLARE
  v_super_admin_id uuid;
  v_encrypted_password text;
BEGIN
  -- Retrieve the ID of the first Super Admin or Owner account
  SELECT id INTO v_super_admin_id 
  FROM public.user_profiles 
  WHERE role IN ('super_admin', 'مالك النظام') 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_super_admin_id IS NULL THEN
    RETURN 'ERROR: No Super Admin or System Owner profile found in user_profiles table';
  END IF;

  -- Validate password strength
  IF length(p_new_password) < 8 THEN
    RETURN 'ERROR: Password must be at least 8 characters long';
  END IF;
  IF p_new_password !~ '[A-Z]' THEN
    RETURN 'ERROR: Password must contain at least one uppercase letter (A-Z)';
  END IF;
  IF p_new_password !~ '[a-z]' THEN
    RETURN 'ERROR: Password must contain at least one lowercase letter (a-z)';
  END IF;
  IF p_new_password !~ '[0-9]' THEN
    RETURN 'ERROR: Password must contain at least one digit (0-9)';
  END IF;
  IF p_new_password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
    RETURN 'ERROR: Password must contain at least one special character (e.g. !@#$%%^&*)';
  END IF;

  -- Hash the password using bcrypt
  v_encrypted_password := crypt(p_new_password, gen_salt('bf', 10));

  -- Update auth.users directly
  UPDATE auth.users
  SET 
    encrypted_password = v_encrypted_password,
    updated_at = now()
  WHERE id = v_super_admin_id;

  RETURN 'SUCCESS: Password for Super Admin/Owner (' || v_super_admin_id || ') has been successfully updated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure the recovery function to prevent execution from frontend/anonymous clients
REVOKE ALL ON FUNCTION public.reset_super_admin_password(text) FROM public, authenticated, anon;
