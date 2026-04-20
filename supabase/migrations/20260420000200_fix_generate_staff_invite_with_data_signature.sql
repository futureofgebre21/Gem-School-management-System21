-- Fix the function signature for generate_staff_invite_with_data to match frontend RPC call
CREATE OR REPLACE FUNCTION public.generate_staff_invite_with_data(
  p_school_id uuid,
  p_role_name public.app_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_code text;
  staff_id text;
BEGIN
  IF NOT has_role(auth.uid(), 'school_admin'::app_role)
     AND NOT has_role(auth.uid(), 'vice_admin'::app_role)
     AND NOT has_role(auth.uid(), 'director'::app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate staff invites';
  END IF;

  LOOP
    invite_code := upper(substring(md5(random()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.staff_invites WHERE invite_code = invite_code
    );
  END LOOP;

  staff_id := generate_staff_id(get_role_prefix(p_role_name), p_school_id);

  INSERT INTO public.staff_invites (
    school_id,
    role_name,
    invite_code,
    created_by
  ) VALUES (
    p_school_id,
    p_role_name,
    invite_code,
    auth.uid()
  );

  RETURN jsonb_build_object(
    'invite_code', invite_code,
    'staff_id', staff_id,
    'role_name', p_role_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_staff_invite_with_data(uuid, public.app_role) TO authenticated, anon, service_role;
NOTIFY pgrst, 'reload schema';
