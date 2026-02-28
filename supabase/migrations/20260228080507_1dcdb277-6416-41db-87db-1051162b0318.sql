
-- Academic Years
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

-- Classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Sections
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Class Subjects (link subjects to classes with optional teacher)
CREATE TABLE public.class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject_id)
);
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

-- Student class assignments
CREATE TABLE public.student_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, academic_year_id)
);
ALTER TABLE public.student_classes ENABLE ROW LEVEL SECURITY;

-- Student Attendance
CREATE TABLE public.student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- Teacher Attendance
CREATE TABLE public.teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, date)
);
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

-- Grades
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  score NUMERIC(5,2),
  grade TEXT,
  remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, academic_year_id, term)
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'all',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Parent-Student linking
CREATE TABLE public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_user_id, student_id)
);
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- ======= RLS POLICIES =======

-- Academic Years
CREATE POLICY "School members can view academic years" ON public.academic_years FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage academic years" ON public.academic_years FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'));

-- Classes
CREATE POLICY "School members can view classes" ON public.classes FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'));

-- Sections
CREATE POLICY "School members can view sections" ON public.sections FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'));

-- Subjects
CREATE POLICY "School members can view subjects" ON public.subjects FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'));

-- Class Subjects
CREATE POLICY "School members can view class subjects" ON public.class_subjects FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage class subjects" ON public.class_subjects FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'));

-- Student Classes
CREATE POLICY "School members can view student classes" ON public.student_classes FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage student classes" ON public.student_classes FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'));

-- Student Attendance
CREATE POLICY "School members can view student attendance" ON public.student_attendance FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Staff can manage student attendance" ON public.student_attendance FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'teacher')) AND school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'teacher')) AND school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

-- Teacher Attendance
CREATE POLICY "School members can view teacher attendance" ON public.teacher_attendance FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage teacher attendance" ON public.teacher_attendance FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'));

-- Grades
CREATE POLICY "School members can view grades" ON public.grades FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Staff can manage grades" ON public.grades FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'teacher')) AND school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'teacher')) AND school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

-- Announcements
CREATE POLICY "School members can view announcements" ON public.announcements FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'));

-- Parent Students
CREATE POLICY "Parents can view own links" ON public.parent_students FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());
CREATE POLICY "Parents can view linked student grades" ON public.grades FOR SELECT TO authenticated
  USING (student_id IN (SELECT student_id FROM public.parent_students WHERE parent_user_id = auth.uid()));
CREATE POLICY "Parents can view linked student attendance" ON public.student_attendance FOR SELECT TO authenticated
  USING (student_id IN (SELECT student_id FROM public.parent_students WHERE parent_user_id = auth.uid()));
CREATE POLICY "Admins can manage parent links" ON public.parent_students FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'));

-- Update triggers
CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON public.academic_years FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
