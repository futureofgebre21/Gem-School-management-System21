-- MASTER MIGRATION: Complete RBAC Overhaul for School Management System
-- Date: 2026-04-20
-- This migration rebuilds the entire role/permission system and fixes the 404 RPC error

-- Step 1: Drop and recreate app_role ENUM with ONLY primary roles
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'school_admin',
  'teacher',
  'student',
  'parent'
);

-- Step 2: Create admin_position ENUM for sub-positions under school_admin
CREATE TYPE IF NOT EXISTS public.admin_position AS ENUM (
  'director',
  'vice_academic',
  'vice_admin',
  'record_office',
  'human_resource',
  'cashier'
);

-- Step 3: Recreate user_assignments with both role and position
DROP TABLE IF EXISTS public.user_assignments CASCADE;
CREATE TABLE public.user_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name public.app_role NOT NULL,
  position public.admin_position,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_name, position, school_id)
);

ALTER TABLE public.user_assignments ENABLE ROW LEVEL SECURITY;

-- Step 4: Ensure staff_invites table exists with proper structure
DROP TABLE IF EXISTS public.staff_invites CASCADE;
CREATE TABLE public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role_name public.app_role NOT NULL,
  position public.admin_position,
  invite_code text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

-- Step 5: Add staff_id column to profiles for custom ID tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_id text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position public.admin_position;

-- Step 6: Helper function to get custom ID prefix
CREATE OR REPLACE FUNCTION public.get_custom_id_prefix(position public.admin_position)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE position
    WHEN 'director' THEN RETURN 'DIR';
    WHEN 'vice_academic' THEN RETURN 'VIAC';
    WHEN 'vice_admin' THEN RETURN 'VIAD';
    WHEN 'record_office' THEN RETURN 'RO';
    WHEN 'human_resource' THEN RETURN 'HR';
    WHEN 'cashier' THEN RETURN 'CA';
    ELSE RETURN NULL;
  END CASE;
END;
$$;

-- Step 7: Function to generate custom staff IDs
CREATE OR REPLACE FUNCTION public.generate_custom_staff_id(
  position public.admin_position,
  school_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  counter int := 1;
  candidate text;
  max_attempts int := 999;
BEGIN
  prefix := get_custom_id_prefix(position);
  
  IF prefix IS NULL THEN
    RETURN NULL;
  END IF;

  LOOP
    candidate := prefix || '-' || LPAD(counter::text, 3, '0');
    
    -- Check if staff_id is unique for this school
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE school_id = $2 AND staff_id = candidate
    ) THEN
      RETURN candidate;
    END IF;
    
    counter := counter + 1;
    IF counter > max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique staff ID for % in school %', position, school_id;
    END IF;
  END LOOP;
END;
$$;

-- Step 8: THE CRITICAL RPC FUNCTION - generate_staff_invite_with_data
-- Frontend calls: supabase.rpc('generate_staff_invite_with_data', { p_school_id, p_role_name })
CREATE OR REPLACE FUNCTION public.generate_staff_invite_with_data(
  p_school_id text,
  p_role_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_code text;
  staff_id text;
  admin_position public.admin_position;
  school_uuid uuid;
  user_id uuid;
BEGIN
  user_id := auth.uid();
  
  -- Convert school_id string to UUID
  BEGIN
    school_uuid := p_school_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid school_id format: %', p_school_id;
  END;
  
  -- Permission check: only admins can generate staff invites
  IF NOT (
    has_role(user_id, 'school_admin'::app_role)
    OR has_role(user_id, 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate staff invites';
  END IF;

  -- Try to parse role_name as admin_position enum
  BEGIN
    admin_position := p_role_name::public.admin_position;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid role_name: % is not a valid admin position', p_role_name;
  END;

  -- Generate unique invite code
  LOOP
    invite_code := upper(substring(md5((random()::text || now()::text)) from 1 for 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.staff_invites WHERE invite_code = invite_code
    );
  END LOOP;

  -- Generate custom staff ID for this position
  staff_id := generate_custom_staff_id(admin_position, school_uuid);

  -- Insert the staff invite
  INSERT INTO public.staff_invites (
    school_id,
    role_name,
    position,
    invite_code,
    created_by,
    expires_at
  ) VALUES (
    school_uuid,
    'school_admin'::app_role,
    admin_position,
    invite_code,
    user_id,
    now() + interval '30 days'
  );

  RETURN jsonb_build_object(
    'invite_code', invite_code,
    'staff_id', staff_id,
    'position', admin_position,
    'success', true
  );
END;
$$;

-- Step 9: Grant execute permissions to RPC
GRANT EXECUTE ON FUNCTION public.generate_staff_invite_with_data(text, text) 
  TO authenticated, anon, service_role;

-- Step 10: Update has_role function to work with roles
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_assignments
    WHERE user_id = $1 AND role_name = $2
  );
END;
$$;

-- Step 11: RLS Policies for user_assignments
DROP POLICY IF EXISTS "Users can view own assignments" ON public.user_assignments;
CREATE POLICY "Users can view own assignments"
  ON public.user_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage assignments" ON public.user_assignments;
CREATE POLICY "Admins can manage assignments"
  ON public.user_assignments FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Step 12: RLS Policies for staff_invites
DROP POLICY IF EXISTS "Admins can manage invites" ON public.staff_invites;
CREATE POLICY "Admins can manage invites"
  ON public.staff_invites FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Step 13: Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
