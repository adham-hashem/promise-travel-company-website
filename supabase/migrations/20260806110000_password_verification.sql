-- Function to verify the current user's password
CREATE OR REPLACE FUNCTION public.verify_current_password(
  p_password text
) RETURNS boolean AS $$
DECLARE
  v_encrypted_password text;
BEGIN
  -- Get the current authenticated user's password hash
  SELECT encrypted_password INTO v_encrypted_password
  FROM auth.users
  WHERE id = auth.uid();

  IF v_encrypted_password IS NULL THEN
    RETURN false;
  END IF;

  -- Compare the password hash using crypt
  RETURN v_encrypted_password = crypt(p_password, v_encrypted_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_current_password(text) TO authenticated;
