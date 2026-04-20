-- Clean SQL Migration - Proper PostgreSQL Syntax
-- School Management System RBAC Setup - Sequential Execution
-- Date: 2026-04-20

-- ============================================================
-- PHASE 1: Drop and Prepare (avoid conflicts)
-- ============================================================

-- Drop dependent functions first
DROP FUNCTION IF EXISTS public.generate_staff_invite_with_data(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_custom_id_prefix(public.admin_position) CASCADE;
DROP FUNCTION IF EXISTS public.generate_custom_staff_id(public.admin_position, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

-- Drop old tables that will be recreated
DROP TABLE IF EXISTS public.user_assignments CASCADE;
DROP TABLE IF EXISTS public.staff_invites CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS public.admin_position CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- ============================================================
-- PHASE 2: Create Primary Enums
-- ============================================================

CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'school_admin',
  'teacher',
  'student',
  'parent'
);

CREATE TYPE public.admin_position AS ENUM (
  'director',
  'vice_academic',
  'vice_admin',
  'record_office',
  'human_resource',
  'cashier'
);

-- ============================================================
-- PHASE 3: Create Core Tables
-- ============================================================

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

CREATE TABLE public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role_name public.app_role NOT NULL DEFAULT 'school_admin',
  position public.admin_position NOT NULL,
  invite_code text NOT NULL UNIQUE,
  staff_id text,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

-- Add columns to profiles if not exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_id text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position public.admin_position;

-- ============================================================
-- PHASE 4: Custom ID Generation Functions
-- ============================================================

-- Function to get prefix for a position
CREATE OR REPLACE FUNCTION public.get_id_prefix(position public.admin_position)
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

-- Function to generate unique staff ID for a position and school
CREATE OR REPLACE FUNCTION public.generate_unique_staff_id(
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
  prefix := public.get_id_prefix(position);
  
  IF prefix IS NULL THEN
    RETURN NULL;
  END IF;

  LOOP
    candidate := prefix || '-' || LPAD(counter::text, 3, '0');
    
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE school_id = $2 AND staff_id = candidate
    ) 
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_invites
      WHERE school_id = $2 AND staff_id = candidate
    ) THEN
      RETURN candidate;
    END IF;
    
    counter := counter + 1;
    IF counter > max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique staff ID for position % in school %', position, school_id;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- PHASE 5: Helper Function for RBAC Check
-- ============================================================

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

-- ============================================================
-- PHASE 6: THE CRITICAL RPC FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_staff_invite_with_data(
  p_school_id uuid,
  p_role public.app_role DEFAULT 'school_admin',
  p_position public.admin_position DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_code text;
  generated_staff_id text;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Permission check: only school_admin or super_admin can generate staff invites
  IF NOT (
    public.has_role(current_user_id, 'school_admin'::public.app_role)
    OR public.has_role(current_user_id, 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate staff invites';
  END IF;

  -- Validate position is provided
  IF p_position IS NULL THEN
    RAISE EXCEPTION 'Position must be specified for staff invite';
  END IF;

  -- Generate unique invite code
  LOOP
    invite_code := upper(substring(md5((random()::text || now()::text)) from 1 for 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.staff_invites WHERE invite_code = invite_code
    );
  END LOOP;

  -- Generate custom staff ID for this position and school
  generated_staff_id := public.generate_unique_staff_id(p_position, p_school_id);

  -- Insert the staff invite
  INSERT INTO public.staff_invites (
    school_id,
    role_name,
    position,
    invite_code,
    staff_id,
    created_by,
    expires_at
  ) VALUES (
    p_school_id,
    'school_admin',
    p_position,
    invite_code,
    generated_staff_id,
    current_user_id,
    now() + interval '30 days'
  );

  RETURN jsonb_build_object(
    'invite_code', invite_code,
    'staff_id', generated_staff_id,
    'position', p_position,
    'success', true
  );
END;
$$;

-- ============================================================
-- PHASE 7: Permissions and Schema Reload
-- ============================================================

GRANT EXECUTE ON FUNCTION public.generate_staff_invite_with_data(uuid, public.app_role, public.admin_position) 
  TO authenticated, anon, service_role;

GRANT EXECUTE ON FUNCTION public.get_id_prefix(public.admin_position)
  TO authenticated, anon, service_role;

GRANT EXECUTE ON FUNCTION public.generate_unique_staff_id(public.admin_position, uuid)
  TO authenticated, anon, service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
  TO authenticated, anon, service_role;

-- ============================================================
-- PHASE 8: RLS Policies
-- ============================================================

DROP POLICY IF EXISTS "Users can view own assignments" ON public.user_assignments;
CREATE POLICY "Users can view own assignments"
  ON public.user_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage assignments" ON public.user_assignments;
CREATE POLICY "Admins can manage assignments"
  ON public.user_assignments FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can manage invites" ON public.staff_invites;
CREATE POLICY "Admins can manage invites"
  ON public.staff_invites FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- ============================================================
-- PHASE 9: Notify PostgREST to Reload Schema
-- ============================================================

NOTIFY pgrst, 'reload schema';
