
-- 1. Create a SECURITY DEFINER function for secure school creation + admin assignment
-- This prevents users from directly inserting into schools or assigning themselves school_admin
CREATE OR REPLACE FUNCTION public.create_school_with_admin(
  _name text,
  _type text DEFAULT 'private',
  _city text DEFAULT NULL,
  _country text DEFAULT 'Nigeria',
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _school_id uuid;
  _user_id uuid := auth.uid();
BEGIN
  -- Ensure user is authenticated
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure user doesn't already have a role (only first-time onboarding)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already has a role assigned';
  END IF;

  -- Create the school
  INSERT INTO public.schools (name, type, city, country, phone, email)
  VALUES (_name, _type, _city, _country, _phone, _email)
  RETURNING id INTO _school_id;

  -- Assign user as school_admin
  INSERT INTO public.user_roles (user_id, role, school_id)
  VALUES (_user_id, 'school_admin', _school_id);

  -- Update profile with school_id
  UPDATE public.profiles SET school_id = _school_id WHERE id = _user_id;

  RETURN _school_id;
END;
$$;

-- 2. Add RLS policy: users can only self-assign non-admin roles during first-time onboarding
CREATE POLICY "Users can self-assign initial non-admin role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role IN ('teacher', 'student', 'parent')
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- 3. Fix profiles update policy to allow school_id to be set only to a school where user has a role
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      -- school_id unchanged
      school_id IS NOT DISTINCT FROM (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
      OR (
        -- First-time setting: only to a school where user has a role
        (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
        AND EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND user_roles.school_id = profiles.school_id
        )
      )
    )
  );
