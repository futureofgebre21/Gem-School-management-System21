
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'school_admin', 'teacher', 'student', 'parent');

-- Schools table
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Nigeria',
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles per security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  UNIQUE(user_id, role, school_id)
);

-- Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  class TEXT,
  section TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  address TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, student_id_number)
);

-- Teachers table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subjects TEXT[] DEFAULT '{}',
  classes TEXT[] DEFAULT '{}',
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security definer function for role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's school_id helper
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate student ID
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  school_prefix TEXT;
  next_num INT;
BEGIN
  SELECT UPPER(LEFT(REPLACE(name, ' ', ''), 3)) INTO school_prefix
  FROM public.schools WHERE id = NEW.school_id;
  
  SELECT COALESCE(MAX(CAST(RIGHT(student_id_number, 5) AS INT)), 0) + 1
  INTO next_num
  FROM public.students WHERE school_id = NEW.school_id;
  
  IF NEW.student_id_number IS NULL OR NEW.student_id_number = '' THEN
    NEW.student_id_number := COALESCE(school_prefix, 'GEM') || '-' || LPAD(next_num::TEXT, 5, '0');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_student_id_trigger
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_student_id();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Schools: viewable by authenticated users, manageable by super_admin
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view schools"
  ON public.schools FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage schools"
  ON public.schools FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "School admins can view school profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- User roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "School admins can manage school roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'school_admin')
    AND school_id = public.get_user_school_id(auth.uid())
    AND role NOT IN ('super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'school_admin')
    AND school_id = public.get_user_school_id(auth.uid())
    AND role NOT IN ('super_admin')
  );

-- Students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view students"
  ON public.students FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "School admins can manage students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_user_school_id(auth.uid())
    AND (public.has_role(auth.uid(), 'school_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "School admins can update students"
  ON public.students FOR UPDATE TO authenticated
  USING (
    school_id = public.get_user_school_id(auth.uid())
    AND (public.has_role(auth.uid(), 'school_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "School admins can delete students"
  ON public.students FOR DELETE TO authenticated
  USING (
    school_id = public.get_user_school_id(auth.uid())
    AND (public.has_role(auth.uid(), 'school_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- Teachers
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view teachers"
  ON public.teachers FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "School admins can manage teachers"
  ON public.teachers FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_user_school_id(auth.uid())
    AND (public.has_role(auth.uid(), 'school_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "School admins can update teachers"
  ON public.teachers FOR UPDATE TO authenticated
  USING (
    school_id = public.get_user_school_id(auth.uid())
    AND (public.has_role(auth.uid(), 'school_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "School admins can delete teachers"
  ON public.teachers FOR DELETE TO authenticated
  USING (
    school_id = public.get_user_school_id(auth.uid())
    AND (public.has_role(auth.uid(), 'school_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photos');
