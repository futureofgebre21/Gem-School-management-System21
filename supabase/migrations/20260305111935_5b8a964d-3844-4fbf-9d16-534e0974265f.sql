
-- =============================================
-- FIX: Replace overly broad "School members can view" SELECT policies
-- with role-scoped policies on students, grades, student_attendance, fee_payments
-- =============================================

-- 1. STUDENTS table
DROP POLICY IF EXISTS "School members can view students" ON public.students;

-- Admins and teachers can view all students in their school
CREATE POLICY "Staff can view school students" ON public.students
  FOR SELECT TO authenticated
  USING (
    (school_id = get_user_school_id(auth.uid()) AND (
      has_role(auth.uid(), 'school_admin'::app_role) OR
      has_role(auth.uid(), 'teacher'::app_role)
    ))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Parents can view only their linked students
CREATE POLICY "Parents can view linked students" ON public.students
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT ps.student_id FROM parent_students ps WHERE ps.parent_user_id = auth.uid())
  );

-- Students can view only themselves (matched via parent_students or student role link)
-- Note: students with 'student' role currently have no direct link to students table,
-- so they won't see any records unless linked. This is secure by default.


-- 2. GRADES table
DROP POLICY IF EXISTS "School members can view grades" ON public.grades;

CREATE POLICY "Staff can view school grades" ON public.grades
  FOR SELECT TO authenticated
  USING (
    (school_id = get_user_school_id(auth.uid()) AND (
      has_role(auth.uid(), 'school_admin'::app_role) OR
      has_role(auth.uid(), 'teacher'::app_role)
    ))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Parents already have "Parents can view linked student grades" policy - keep it


-- 3. STUDENT_ATTENDANCE table
DROP POLICY IF EXISTS "School members can view student attendance" ON public.student_attendance;

CREATE POLICY "Staff can view school attendance" ON public.student_attendance
  FOR SELECT TO authenticated
  USING (
    (school_id = get_user_school_id(auth.uid()) AND (
      has_role(auth.uid(), 'school_admin'::app_role) OR
      has_role(auth.uid(), 'teacher'::app_role)
    ))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Parents already have "Parents can view linked student attendance" policy - keep it


-- 4. FEE_PAYMENTS table
DROP POLICY IF EXISTS "School members can view fee payments" ON public.fee_payments;

CREATE POLICY "Staff can view school fee payments" ON public.fee_payments
  FOR SELECT TO authenticated
  USING (
    (school_id = get_user_school_id(auth.uid()) AND (
      has_role(auth.uid(), 'school_admin'::app_role) OR
      has_role(auth.uid(), 'teacher'::app_role)
    ))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Parents already have "Parents can view linked student fees" policy - keep it
