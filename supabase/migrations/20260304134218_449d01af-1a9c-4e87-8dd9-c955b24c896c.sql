
-- Fix search_path in all SECURITY DEFINER and trigger functions to use unquoted form

CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num INT;
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    SELECT COALESCE(MAX(CAST(RIGHT(receipt_number, 6) AS INT)), 0) + 1
    INTO next_num
    FROM public.fee_payments WHERE school_id = NEW.school_id;
    NEW.receipt_number := 'RCP-' || LPAD(next_num::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_school_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  prefix text;
  suffix text;
  candidate text;
  attempts int := 0;
BEGIN
  IF NEW.school_code IS NULL OR NEW.school_code = '' THEN
    prefix := UPPER(LEFT(REGEXP_REPLACE(NEW.name, '[^A-Za-z]', '', 'g'), 3));
    IF LENGTH(prefix) < 3 THEN
      prefix := RPAD(prefix, 3, 'X');
    END IF;
    
    LOOP
      suffix := CHR(65 + floor(random() * 26)::int) || floor(random() * 10)::int::text;
      candidate := prefix || '-' || suffix;
      
      IF NOT EXISTS (SELECT 1 FROM public.schools WHERE school_code = candidate) THEN
        NEW.school_code := candidate;
        EXIT;
      END IF;
      
      attempts := attempts + 1;
      IF attempts > 100 THEN
        NEW.school_code := prefix || '-' || substr(md5(random()::text), 1, 4);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

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
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_school_by_code(_code text)
RETURNS TABLE(id uuid, name text, school_code text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, s.school_code 
  FROM public.schools s 
  WHERE UPPER(s.school_code) = UPPER(_code)
  LIMIT 1;
END;
$$;
