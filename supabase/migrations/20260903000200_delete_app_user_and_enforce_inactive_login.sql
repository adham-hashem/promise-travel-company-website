CREATE OR REPLACE FUNCTION public.delete_app_user(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_email text;
  v_auth_user_id uuid;
BEGIN
  IF current_setting('request.jwt.claims', true) IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'مالك النظام', 'مدير النظام')
      AND status = 'نشط'
  ) THEN
    RAISE EXCEPTION 'غير مصرح: حذف المستخدمين متاح فقط للإدارة النشطة';
  END IF;

  SELECT COALESCE(
    (SELECT email FROM public.employees WHERE id = p_user_id LIMIT 1),
    (SELECT email FROM public.user_profiles WHERE id = p_user_id LIMIT 1),
    (SELECT email FROM auth.users WHERE id = p_user_id LIMIT 1)
  )
  INTO v_email
  ;

  SELECT COALESCE(
    (SELECT id FROM auth.users WHERE id = p_user_id LIMIT 1),
    (SELECT id FROM auth.users WHERE v_email IS NOT NULL AND lower(email) = lower(v_email) LIMIT 1)
  )
  INTO v_auth_user_id;

  UPDATE auth.users
  SET banned_until = 'infinity',
      updated_at = now()
  WHERE id = v_auth_user_id;

  UPDATE public.user_profiles
  SET status = 'غير نشط'
  WHERE id = p_user_id
     OR id = v_auth_user_id
     OR (v_email IS NOT NULL AND lower(email) = lower(v_email));

  UPDATE public.employees
  SET is_active = false
  WHERE id = p_user_id
     OR (v_email IS NOT NULL AND lower(email) = lower(v_email));

  DELETE FROM public.employees
  WHERE id = p_user_id
     OR (v_email IS NOT NULL AND lower(email) = lower(v_email));

  DELETE FROM auth.users
  WHERE id = v_auth_user_id;

  DELETE FROM public.user_profiles
  WHERE id = p_user_id
     OR id = v_auth_user_id
     OR (v_email IS NOT NULL AND lower(email) = lower(v_email));

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_app_user(uuid) TO authenticated;
