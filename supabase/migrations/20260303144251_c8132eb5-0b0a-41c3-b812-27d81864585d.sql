
-- 1. Make photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'photos';

-- 2. Drop the public read policy and replace with authenticated-only
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
CREATE POLICY "Authenticated users can view photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'photos');

-- 3. Add auth check to get_school_by_code RPC
CREATE OR REPLACE FUNCTION public.get_school_by_code(_code text)
RETURNS TABLE(id uuid, name text, school_code text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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

-- 4. Add score range constraint to grades table
ALTER TABLE public.grades
ADD CONSTRAINT grades_score_range
CHECK (score IS NULL OR (score >= 0 AND score <= 100));
