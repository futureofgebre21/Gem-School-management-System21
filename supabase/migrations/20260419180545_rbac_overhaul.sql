-- Update app_role enum to include new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vice_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vice_academic';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'human_resource';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cashier';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'director';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'record_office';

-- Create user_assignments table to replace user_roles for better flexibility
CREATE TABLE IF NOT EXISTS public.user_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_name, school_id)
);

-- Create staff_invites table for invitation codes
CREATE TABLE IF NOT EXISTS public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_assignments
CREATE POLICY "Users can view own assignments"
  ON public.user_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage assignments"
  ON public.user_assignments FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'school_admin'::app_role) 
    OR has_role(auth.uid(), 'vice_admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'school_admin'::app_role) 
    OR has_role(auth.uid(), 'vice_admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- RLS Policies for staff_invites
CREATE POLICY "Admins can manage invites"
  ON public.staff_invites FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'school_admin'::app_role) 
    OR has_role(auth.uid(), 'vice_admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'school_admin'::app_role) 
    OR has_role(auth.uid(), 'vice_admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Update existing RLS policies to include new roles
-- Teachers table: allow more roles to manage
DROP POLICY IF EXISTS "School admins can manage teachers" ON public.teachers;
CREATE POLICY "Authorized staff can manage teachers"
  ON public.teachers FOR ALL TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role) 
      OR has_role(auth.uid(), 'vice_admin'::app_role)
      OR has_role(auth.uid(), 'vice_academic'::app_role)
      OR has_role(auth.uid(), 'human_resource'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
  WITH CHECK (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role) 
      OR has_role(auth.uid(), 'vice_admin'::app_role)
      OR has_role(auth.uid(), 'vice_academic'::app_role)
      OR has_role(auth.uid(), 'human_resource'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

-- Students table: allow more roles
DROP POLICY IF EXISTS "School admins can manage students" ON public.students;
CREATE POLICY "Authorized staff can manage students"
  ON public.students FOR ALL TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role) 
      OR has_role(auth.uid(), 'vice_admin'::app_role)
      OR has_role(auth.uid(), 'vice_academic'::app_role)
      OR has_role(auth.uid(), 'record_office'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
  WITH CHECK (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role) 
      OR has_role(auth.uid(), 'vice_admin'::app_role)
      OR has_role(auth.uid(), 'vice_academic'::app_role)
      OR has_role(auth.uid(), 'record_office'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

-- For Director and Record Office: no DELETE permission
-- They can INSERT and UPDATE but not DELETE
CREATE POLICY "Director and Record Office can insert/update students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'director'::app_role) 
      OR has_role(auth.uid(), 'record_office'::app_role)
    )
  );

CREATE POLICY "Director and Record Office can update students"
  ON public.students FOR UPDATE TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'director'::app_role) 
      OR has_role(auth.uid(), 'record_office'::app_role)
    )
  );

-- Similar for teachers
CREATE POLICY "Director and Record Office can insert/update teachers"
  ON public.teachers FOR INSERT TO authenticated
  WITH CHECK (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'director'::app_role) 
      OR has_role(auth.uid(), 'record_office'::app_role)
    )
  );

CREATE POLICY "Director and Record Office can update teachers"
  ON public.teachers FOR UPDATE TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'director'::app_role) 
      OR has_role(auth.uid(), 'record_office'::app_role)
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_user_assignments_updated_at
  BEFORE UPDATE ON public.user_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_invites_updated_at
  BEFORE UPDATE ON public.staff_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();