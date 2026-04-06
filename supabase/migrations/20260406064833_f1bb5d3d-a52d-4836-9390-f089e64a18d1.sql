
-- Add user_id and parent_id columns to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_id uuid;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON public.students(parent_id);

-- RLS: Students can view their own student record via user_id
CREATE POLICY "Students can view own record"
ON public.students
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS: Parents can view students linked to them via parent_id
CREATE POLICY "Parents can view linked students via parent_id"
ON public.students
FOR SELECT
TO authenticated
USING (parent_id = auth.uid());

-- RLS: Students can view their own grades
CREATE POLICY "Students can view own grades"
ON public.grades
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

-- RLS: Students can view their own attendance
CREATE POLICY "Students can view own attendance"
ON public.student_attendance
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

-- RLS: Parents can view grades of students linked via parent_id
CREATE POLICY "Parents can view linked student grades via parent_id"
ON public.grades
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE parent_id = auth.uid()
  )
);

-- RLS: Parents can view attendance of students linked via parent_id
CREATE POLICY "Parents can view linked student attendance via parent_id"
ON public.student_attendance
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE parent_id = auth.uid()
  )
);
