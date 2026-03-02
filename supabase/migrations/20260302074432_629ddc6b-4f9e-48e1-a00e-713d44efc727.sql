
-- Add school_code column to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS school_code text UNIQUE;

-- Create function to generate unique 6-char school code like "GEM-X1"
CREATE OR REPLACE FUNCTION public.generate_school_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  prefix text;
  suffix text;
  candidate text;
  attempts int := 0;
BEGIN
  IF NEW.school_code IS NULL OR NEW.school_code = '' THEN
    -- Use first 3 chars of school name as prefix
    prefix := UPPER(LEFT(REGEXP_REPLACE(NEW.name, '[^A-Za-z]', '', 'g'), 3));
    IF LENGTH(prefix) < 3 THEN
      prefix := RPAD(prefix, 3, 'X');
    END IF;
    
    LOOP
      -- Generate random 2-char alphanumeric suffix
      suffix := CHR(65 + floor(random() * 26)::int) || floor(random() * 10)::int::text;
      candidate := prefix || '-' || suffix;
      
      -- Check uniqueness
      IF NOT EXISTS (SELECT 1 FROM public.schools WHERE school_code = candidate) THEN
        NEW.school_code := candidate;
        EXIT;
      END IF;
      
      attempts := attempts + 1;
      IF attempts > 100 THEN
        -- Fallback: use longer random suffix
        NEW.school_code := prefix || '-' || substr(md5(random()::text), 1, 4);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate school code
CREATE TRIGGER generate_school_code_trigger
BEFORE INSERT ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.generate_school_code();

-- Backfill existing schools that don't have codes
UPDATE public.schools 
SET school_code = UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 3)) || '-' || CHR(65 + (floor(random() * 26))::int) || (floor(random() * 10))::int::text
WHERE school_code IS NULL;

-- Update create_school_with_admin to return school_code too
CREATE OR REPLACE FUNCTION public.create_school_with_admin(
  _name text, 
  _type text DEFAULT 'private', 
  _city text DEFAULT NULL, 
  _country text DEFAULT 'Nigeria', 
  _phone text DEFAULT NULL, 
  _email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _school_id uuid;
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already has a role assigned';
  END IF;

  INSERT INTO public.schools (name, type, city, country, phone, email)
  VALUES (_name, _type, _city, _country, _phone, _email)
  RETURNING id INTO _school_id;

  INSERT INTO public.user_roles (user_id, role, school_id)
  VALUES (_user_id, 'school_admin', _school_id);

  UPDATE public.profiles SET school_id = _school_id WHERE id = _user_id;

  RETURN _school_id;
END;
$$;

-- Create function to look up school by code (for joining)
CREATE OR REPLACE FUNCTION public.get_school_by_code(_code text)
RETURNS TABLE(id uuid, name text, school_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, s.school_code 
  FROM public.schools s 
  WHERE UPPER(s.school_code) = UPPER(_code)
  LIMIT 1;
$$;
