
-- Add staff_id column to profiles for teacher short IDs
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_staff_id ON public.profiles(staff_id) WHERE staff_id IS NOT NULL;

-- Function to generate unique 2-3 digit teacher ID
CREATE OR REPLACE FUNCTION public.generate_teacher_staff_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
  attempts int := 0;
  num int;
BEGIN
  -- Try 2-digit first (10-99)
  LOOP
    num := 10 + floor(random() * 90)::int;
    candidate := 'T' || num::text;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE staff_id = candidate) THEN
      RETURN candidate;
    END IF;
    attempts := attempts + 1;
    IF attempts > 90 THEN EXIT; END IF;
  END LOOP;
  
  -- Fallback to 3-digit (100-999)
  attempts := 0;
  LOOP
    num := 100 + floor(random() * 900)::int;
    candidate := 'T' || num::text;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE staff_id = candidate) THEN
      RETURN candidate;
    END IF;
    attempts := attempts + 1;
    IF attempts > 100 THEN
      candidate := 'T' || floor(random() * 9000 + 1000)::int::text;
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

-- Allow students/parents to update user_id on students table for self-linking
CREATE POLICY "Students can link own user_id"
ON public.students
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  user_id = auth.uid()
  AND has_role(auth.uid(), 'student'::app_role)
);
