
-- 1. Fix get_user_school_id() to use user_roles instead of profiles
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 2. Fix profiles UPDATE policy to prevent school_id modification
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      school_id IS NOT DISTINCT FROM (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- 3. Fix notifications INSERT policy to validate target user is in same school
DROP POLICY IF EXISTS "Staff can create notifications" ON public.notifications;
CREATE POLICY "Staff can create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      has_role(auth.uid(), 'school_admin'::app_role)
      AND school_id IN (SELECT ur.school_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
      AND user_id IN (SELECT ur2.user_id FROM public.user_roles ur2 WHERE ur2.school_id = school_id)
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );
