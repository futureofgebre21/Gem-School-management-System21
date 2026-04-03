
-- Add unique constraint on exam_student_answers for upsert support
ALTER TABLE public.exam_student_answers
ADD CONSTRAINT exam_student_answers_attempt_question_unique 
UNIQUE (attempt_id, question_id);
