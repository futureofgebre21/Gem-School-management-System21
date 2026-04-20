-- Fix missing RPC function for staff invite generation and grant execute to public roles
CREATE OR REPLACE FUNCTION public.generate_staff_invite_with_data(
  p_school_id uuid,
  p_role_name text,
  p_created_by uuid DEFAULT auth.uid(),
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_code text;
  role_prefix text;
  staff_id text;
BEGIN
  -- Permission guard for invite generation
  IF NOT has_role(auth.uid(), 'school_admin'::app_role)
     AND NOT has_role(auth.uid(), 'vice_admin'::app_role)
     AND NOT has_role(auth.uid(), 'director'::app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate staff invites';
  END IF;

  -- Generate a unique invite code
  LOOP
    invite_code := upper(substring(md5(random()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.staff_invites WHERE invite_code = invite_code
    );
  END LOOP;

  -- Generate a custom staff ID for supported roles
  role_prefix := get_role_prefix(p_role_name);
  IF role_prefix IS NOT NULL THEN
    staff_id := generate_staff_id(role_prefix, p_school_id);
  END IF;

  INSERT INTO public.staff_invites (
    school_id,
    role_name,
    invite_code,
    created_by,
    expires_at
  ) VALUES (
    p_school_id,
    p_role_name,
    invite_code,
    p_created_by,
    p_expires_at
  );

  RETURN jsonb_build_object(
    'invite_code', invite_code,
    'staff_id', staff_id,
    'role_name', p_role_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_staff_invite_with_data(uuid, text, uuid, timestamptz) TO authenticated, anon;
