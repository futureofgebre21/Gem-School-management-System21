
-- Exam Questions Bank
CREATE TABLE public.exam_questions_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  grade_level text NOT NULL,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  explanation text,
  difficulty_level text NOT NULL DEFAULT 'medium' CHECK (difficulty_level IN ('easy','medium','hard')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Exams table
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  exam_title text NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  grade_level text NOT NULL,
  total_questions int NOT NULL DEFAULT 10,
  time_limit_minutes int NOT NULL DEFAULT 60,
  exam_type text NOT NULL DEFAULT 'practice' CHECK (exam_type IN ('practice','model')),
  created_by uuid REFERENCES auth.users(id),
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Exam Question Links
CREATE TABLE public.exam_question_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.exam_questions_bank(id) ON DELETE CASCADE,
  question_order int,
  UNIQUE(exam_id, question_id)
);

-- Exam Attempts
CREATE TABLE public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  score numeric DEFAULT 0,
  total_questions int NOT NULL DEFAULT 0,
  percentage numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Student Answers
CREATE TABLE public.exam_student_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.exam_questions_bank(id) ON DELETE CASCADE,
  selected_answer text CHECK (selected_answer IN ('A','B','C','D')),
  is_correct boolean DEFAULT false,
  answered_at timestamptz DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- Exam Results Summary
CREATE TABLE public.exam_results_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  total_correct int NOT NULL DEFAULT 0,
  total_wrong int NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  rank int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.exam_questions_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_question_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results_summary ENABLE ROW LEVEL SECURITY;

-- Question Bank: Staff can manage, school members can view
CREATE POLICY "Staff can manage exam questions" ON public.exam_questions_bank
FOR ALL TO authenticated
USING (
  ((has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  AND school_id = get_user_school_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  ((has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  AND school_id = get_user_school_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "School members can view exam questions" ON public.exam_questions_bank
FOR SELECT TO authenticated
USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Exams: Staff can manage, school members can view
CREATE POLICY "Staff can manage exams" ON public.exams
FOR ALL TO authenticated
USING (
  ((has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  AND school_id = get_user_school_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  ((has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  AND school_id = get_user_school_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "School members can view published exams" ON public.exams
FOR SELECT TO authenticated
USING (
  (school_id = get_user_school_id(auth.uid()) AND is_published = true)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Exam Question Links: Staff manage, all school view
CREATE POLICY "Staff can manage exam question links" ON public.exam_question_links
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND (
    ((has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
    AND e.school_id = get_user_school_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  ))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND (
    ((has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
    AND e.school_id = get_user_school_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  ))
);

CREATE POLICY "School members can view exam question links" ON public.exam_question_links
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND (
    e.school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role)
  ))
);

-- Exam Attempts: Students manage own, staff view school
CREATE POLICY "Students can manage own attempts" ON public.exam_attempts
FOR ALL TO authenticated
USING (
  (student_id IN (SELECT s.id FROM public.students s WHERE s.school_id = get_user_school_id(auth.uid())))
  OR ((has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
      AND school_id = get_user_school_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  (student_id IN (SELECT s.id FROM public.students s WHERE s.school_id = get_user_school_id(auth.uid())))
  OR ((has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
      AND school_id = get_user_school_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Student Answers: Students manage own, staff view
CREATE POLICY "Users can manage exam answers" ON public.exam_student_answers
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = attempt_id AND (
    a.school_id = get_user_school_id(auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  ))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = attempt_id AND (
    a.school_id = get_user_school_id(auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  ))
);

-- Exam Results Summary: School members can view
CREATE POLICY "Staff can manage exam results" ON public.exam_results_summary
FOR ALL TO authenticated
USING (
  ((has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  AND school_id = get_user_school_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  ((has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  AND school_id = get_user_school_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "School members can view exam results" ON public.exam_results_summary
FOR SELECT TO authenticated
USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));
