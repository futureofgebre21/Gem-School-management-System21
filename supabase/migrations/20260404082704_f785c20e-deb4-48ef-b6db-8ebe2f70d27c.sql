-- Add student linking and parent search tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS linked_student_id uuid REFERENCES public.students(id),
ADD COLUMN IF NOT EXISTS parent_search_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_name_locked text,
ADD COLUMN IF NOT EXISTS parent_phone_locked text;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_linked_student ON public.profiles(linked_student_id) WHERE linked_student_id IS NOT NULL;

-- Prevent changing linked_student_id once set
CREATE OR REPLACE FUNCTION public.prevent_relink_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.linked_student_id IS NOT NULL AND NEW.linked_student_id IS DISTINCT FROM OLD.linked_student_id THEN
    RAISE EXCEPTION 'Cannot change linked student once set';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_relink_student_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_relink_student();