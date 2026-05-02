-- 1. Length & value constraints (defensive)
ALTER TABLE public.exam_questions_bank
  ADD CONSTRAINT exam_questions_bank_question_text_len CHECK (char_length(question_text) BETWEEN 1 AND 4000),
  ADD CONSTRAINT exam_questions_bank_option_a_len CHECK (char_length(option_a) BETWEEN 1 AND 1000),
  ADD CONSTRAINT exam_questions_bank_option_b_len CHECK (char_length(option_b) BETWEEN 1 AND 1000),
  ADD CONSTRAINT exam_questions_bank_option_c_len CHECK (char_length(option_c) BETWEEN 1 AND 1000),
  ADD CONSTRAINT exam_questions_bank_option_d_len CHECK (char_length(option_d) BETWEEN 1 AND 1000),
  ADD CONSTRAINT exam_questions_bank_correct_answer_chk CHECK (UPPER(correct_answer) IN ('A','B','C','D')),
  ADD CONSTRAINT exam_questions_bank_difficulty_chk CHECK (LOWER(difficulty_level) IN ('easy','medium','hard'));

-- 2. Deterministic dedup hash (school + subject + normalized question text)
ALTER TABLE public.exam_questions_bank
  ADD COLUMN content_hash text GENERATED ALWAYS AS (
    encode(digest(
      coalesce(school_id::text,'') || '|' ||
      coalesce(subject_id::text,'') || '|' ||
      lower(regexp_replace(question_text, '\s+', ' ', 'g'))
    , 'sha256'), 'hex')
  ) STORED;

CREATE UNIQUE INDEX exam_questions_bank_content_hash_uniq
  ON public.exam_questions_bank (content_hash);

-- 3. Performance indexes for filtering at scale
CREATE INDEX IF NOT EXISTS exam_questions_bank_school_idx ON public.exam_questions_bank (school_id);
CREATE INDEX IF NOT EXISTS exam_questions_bank_subject_idx ON public.exam_questions_bank (subject_id);
CREATE INDEX IF NOT EXISTS exam_questions_bank_grade_idx ON public.exam_questions_bank (grade_level);
CREATE INDEX IF NOT EXISTS exam_questions_bank_difficulty_idx ON public.exam_questions_bank (difficulty_level);
CREATE INDEX IF NOT EXISTS exam_questions_bank_school_created_idx ON public.exam_questions_bank (school_id, created_at DESC);

-- 4. RLS policies: per-school, role-scoped writes
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.exam_questions_bank;

CREATE POLICY "School members can read questions"
  ON public.exam_questions_bank FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_assignments ua
      WHERE ua.user_id = auth.uid() AND ua.school_id = exam_questions_bank.school_id
    )
  );

CREATE POLICY "Staff can insert questions in own school"
  ON public.exam_questions_bank FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_assignments ua
      WHERE ua.user_id = auth.uid()
        AND ua.school_id = exam_questions_bank.school_id
        AND ua.role_name IN ('teacher','school_admin','director','vice_academic','super_admin')
    )
  );

CREATE POLICY "Staff can update questions in own school"
  ON public.exam_questions_bank FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_assignments ua
      WHERE ua.user_id = auth.uid()
        AND ua.school_id = exam_questions_bank.school_id
        AND ua.role_name IN ('teacher','school_admin','director','vice_academic','super_admin')
    )
  );

CREATE POLICY "Staff can delete questions in own school"
  ON public.exam_questions_bank FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_assignments ua
      WHERE ua.user_id = auth.uid()
        AND ua.school_id = exam_questions_bank.school_id
        AND ua.role_name IN ('teacher','school_admin','director','vice_academic','super_admin')
    )
  );

-- Ensure pgcrypto is available for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;