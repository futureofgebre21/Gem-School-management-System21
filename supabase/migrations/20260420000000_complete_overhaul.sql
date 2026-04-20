-- Complete overhaul migration for School Management System
-- Date: 2026-04-20

-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create academic_structure table
CREATE TABLE IF NOT EXISTS public.academic_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  grade text NOT NULL,
  section text NOT NULL,
  subject text NOT NULL,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  syllabus_coverage jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, academic_year, grade, section, subject)
);

-- Create grades table
CREATE TABLE IF NOT EXISTS public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  grade text NOT NULL,
  section text NOT NULL,
  subject text NOT NULL,
  exam_type text NOT NULL CHECK (exam_type IN ('midterm', 'final', 'assignment', 'project')),
  score numeric(5,2) CHECK (score >= 0 AND score <= 100),
  max_score numeric(5,2) DEFAULT 100,
  remarks text,
  graded_by uuid REFERENCES auth.users(id),
  graded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('student', 'teacher', 'staff')),
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by uuid REFERENCES auth.users(id),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id, date)
);

-- Create fee_payments table
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_structure_id uuid NOT NULL, -- Will reference fee_structures when created
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text CHECK (payment_method IN ('cash', 'bank_transfer', 'online', 'check')),
  transaction_id text,
  remarks text,
  collected_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create fee_structures table
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annually', 'one_time')),
  grade text,
  academic_year text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key to fee_payments
ALTER TABLE public.fee_payments ADD CONSTRAINT fk_fee_payments_structure
  FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id) ON DELETE CASCADE;

-- Add user_id columns to teachers and students for linking
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_academic_structure_school ON public.academic_structure(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_school_student ON public.grades(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON public.attendance(school_id, date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_school_student ON public.fee_payments(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_school ON public.fee_structures(school_id);

-- Enable RLS on new tables
ALTER TABLE public.academic_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

-- Function to generate custom staff IDs
CREATE OR REPLACE FUNCTION public.generate_staff_id(role_prefix text, school_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  counter int := 1;
  candidate text;
BEGIN
  LOOP
    candidate := role_prefix || '-' || LPAD(counter::text, 3, '0');
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE school_id = $2 AND staff_id = candidate
    ) THEN
      RETURN candidate;
    END IF;
    counter := counter + 1;
    IF counter > 999 THEN
      RAISE EXCEPTION 'Too many staff members for role %', role_prefix;
    END IF;
  END LOOP;
END;
$$;

-- Function to get role prefix
CREATE OR REPLACE FUNCTION public.get_role_prefix(role_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE role_name
    WHEN 'director' THEN RETURN 'DIR';
    WHEN 'vice_academic' THEN RETURN 'VIAC';
    WHEN 'vice_admin' THEN RETURN 'VIAD';
    WHEN 'record_office' THEN RETURN 'RO';
    WHEN 'human_resource' THEN RETURN 'HR';
    WHEN 'cashier' THEN RETURN 'CA';
    WHEN 'teacher' THEN RETURN 'TCH';
    ELSE RETURN NULL;
  END CASE;
END;
$$;

-- RPC: verify_teacher_and_link
CREATE OR REPLACE FUNCTION public.verify_teacher_and_link(
  input_school_code text,
  input_teacher_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  school_record record;
  teacher_record record;
  result jsonb;
BEGIN
  -- Get school by code
  SELECT * INTO school_record
  FROM schools
  WHERE school_code = upper(input_school_code);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid school code');
  END IF;

  -- Get teacher by ID
  SELECT * INTO teacher_record
  FROM teachers
  WHERE school_id = school_record.id
    AND (staff_id = input_teacher_id OR id::text = input_teacher_id);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Teacher not found');
  END IF;

  -- Check if already linked
  IF teacher_record.user_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Teacher account already linked');
  END IF;

  -- Link the user (assuming auth.uid() is the current user)
  UPDATE teachers
  SET user_id = auth.uid()
  WHERE id = teacher_record.id;

  -- Assign role
  INSERT INTO user_assignments (user_id, role_name, school_id)
  VALUES (auth.uid(), 'teacher', school_record.id)
  ON CONFLICT (user_id, role_name, school_id) DO NOTHING;

  -- Update profile
  UPDATE profiles
  SET school_id = school_record.id
  WHERE id = auth.uid();

  RETURN jsonb_build_object('success', true, 'message', 'Teacher account linked successfully');
END;
$$;

-- RPC: generate_staff_invite_with_data
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
  -- Check permissions
  IF NOT has_role(auth.uid(), 'school_admin'::app_role)
     AND NOT has_role(auth.uid(), 'vice_admin'::app_role)
     AND NOT has_role(auth.uid(), 'director'::app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate staff invites';
  END IF;

  -- Generate unique invite code
  LOOP
    invite_code := upper(substring(md5(random()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM staff_invites WHERE invite_code = invite_code
    );
  END LOOP;

  -- Generate staff ID if applicable
  role_prefix := get_role_prefix(p_role_name);
  IF role_prefix IS NOT NULL THEN
    staff_id := generate_staff_id(role_prefix, p_school_id);
  END IF;

  -- Insert invite
  INSERT INTO staff_invites (
    school_id, role_name, invite_code, created_by, expires_at
  ) VALUES (
    p_school_id, p_role_name, invite_code, p_created_by, p_expires_at
  );

  RETURN jsonb_build_object(
    'invite_code', invite_code,
    'staff_id', staff_id,
    'role_name', p_role_name
  );
END;
$$;

-- RPC: create_school_with_admin (update to handle director role)
CREATE OR REPLACE FUNCTION public.create_school_with_admin(
  school_name text,
  school_type text DEFAULT 'private',
  city text DEFAULT NULL,
  country text DEFAULT 'Nigeria',
  phone text DEFAULT NULL,
  email text DEFAULT NULL,
  p_role_name text DEFAULT 'director',
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  school_id uuid;
  school_code text;
  role_prefix text;
  staff_id text;
BEGIN
  -- Generate unique school code
  LOOP
    school_code := 'GEM-' || upper(substring(md5(random()::text) from 1 for 3));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM schools WHERE school_code = school_code);
  END LOOP;

  -- Create school
  INSERT INTO schools (name, school_code, type, city, country, phone, email)
  VALUES (school_name, school_code, school_type, city, country, phone, email)
  RETURNING id INTO school_id;

  -- Generate staff ID for director
  role_prefix := get_role_prefix(p_role_name);
  IF role_prefix IS NOT NULL THEN
    staff_id := generate_staff_id(role_prefix, school_id);
    UPDATE profiles SET staff_id = staff_id WHERE id = p_user_id;
  END IF;

  -- Assign role
  INSERT INTO user_assignments (user_id, role_name, school_id)
  VALUES (p_user_id, p_role_name, school_id)
  ON CONFLICT (user_id, role_name, school_id) DO NOTHING;

  -- Update profile
  UPDATE profiles SET school_id = school_id WHERE id = p_user_id;

  RETURN school_id;
END;
$$;

-- RLS Policies for new tables

-- academic_structure policies
CREATE POLICY "Staff can manage academic structure"
  ON public.academic_structure FOR ALL TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'vice_academic'::app_role)
      OR has_role(auth.uid(), 'record_office'::app_role)
    )
  )
  WITH CHECK (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'vice_academic'::app_role)
      OR has_role(auth.uid(), 'record_office'::app_role)
    )
  );

CREATE POLICY "Teachers can view their subjects"
  ON public.academic_structure FOR SELECT TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND has_role(auth.uid(), 'teacher'::app_role)
    AND teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
  );

-- grades policies
CREATE POLICY "Authorized staff can manage grades"
  ON public.grades FOR ALL TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'vice_academic'::app_role)
      OR has_role(auth.uid(), 'record_office'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
    )
  )
  WITH CHECK (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'vice_academic'::app_role)
      OR has_role(auth.uid(), 'record_office'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
    )
  );

CREATE POLICY "Students can view their grades"
  ON public.grades FOR SELECT TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND has_role(auth.uid(), 'student'::app_role)
    AND student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's grades"
  ON public.grades FOR SELECT TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND has_role(auth.uid(), 'parent'::app_role)
    AND student_id IN (
      SELECT student_id FROM parent_students
      WHERE parent_id IN (
        SELECT id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- attendance policies
CREATE POLICY "Staff can manage attendance"
  ON public.attendance FOR ALL TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'vice_admin'::app_role)
      OR has_role(auth.uid(), 'vice_academic'::app_role)
      OR has_role(auth.uid(), 'record_office'::app_role)
      OR has_role(auth.uid(), 'human_resource'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
    )
  )
  WITH CHECK (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'vice_admin'::app_role)
      OR has_role(auth.uid(), 'vice_academic'::app_role)
      OR has_role(auth.uid(), 'record_office'::app_role)
      OR has_role(auth.uid(), 'human_resource'::app_role)
      OR has_role(auth.uid(), 'teacher'::app_role)
    )
  );

CREATE POLICY "Students and parents can view attendance"
  ON public.attendance FOR SELECT TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (
      (has_role(auth.uid(), 'student'::app_role) AND user_id = auth.uid())
      OR (has_role(auth.uid(), 'parent'::app_role) AND user_id IN (
        SELECT s.user_id FROM students s
        JOIN parent_students ps ON s.id = ps.student_id
        WHERE ps.parent_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      ))
    )
  );

-- fee_structures policies
CREATE POLICY "Authorized staff can manage fee structures"
  ON public.fee_structures FOR ALL TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'cashier'::app_role)
    )
  )
  WITH CHECK (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'cashier'::app_role)
    )
  );

-- fee_payments policies
CREATE POLICY "Cashier and admin can manage payments"
  ON public.fee_payments FOR ALL TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'cashier'::app_role)
    )
  )
  WITH CHECK (
    school_id = get_user_school_id(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'cashier'::app_role)
    )
  );

CREATE POLICY "Students and parents can view their payments"
  ON public.fee_payments FOR SELECT TO authenticated
  USING (
    school_id = get_user_school_id(auth.uid())
    AND (
      (has_role(auth.uid(), 'student'::app_role) AND student_id IN (
        SELECT id FROM students WHERE user_id = auth.uid()
      ))
      OR (has_role(auth.uid(), 'parent'::app_role) AND student_id IN (
        SELECT student_id FROM parent_students
        WHERE parent_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      ))
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_academic_structure_updated_at
  BEFORE UPDATE ON public.academic_structure
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grades_updated_at
  BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fee_structures_updated_at
  BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fee_payments_updated_at
  BEFORE UPDATE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();