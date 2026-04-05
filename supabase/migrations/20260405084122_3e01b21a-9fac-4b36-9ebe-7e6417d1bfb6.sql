-- Add Foreign Key from exams.grade_id to grade_level.id
ALTER TABLE public.exams
ADD CONSTRAINT exams_grade_id_fkey
FOREIGN KEY (grade_id) REFERENCES public.grade_level(id);