
-- Add school type column
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'private';

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Staff can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

-- Create fee_structures table
CREATE TABLE public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id),
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  academic_year_id uuid REFERENCES public.academic_years(id),
  class_id uuid REFERENCES public.classes(id),
  term text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fee structures"
  ON public.fee_structures FOR ALL
  USING (
    (has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    (has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "School members can view fee structures"
  ON public.fee_structures FOR SELECT
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

-- Create fee_payments table
CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  fee_structure_id uuid NOT NULL REFERENCES public.fee_structures(id),
  amount_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  payment_date date,
  payment_method text,
  receipt_number text,
  remarks text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage fee payments"
  ON public.fee_payments FOR ALL
  USING (
    ((has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'teacher'))
      AND school_id = get_user_school_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    ((has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'teacher'))
      AND school_id = get_user_school_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "School members can view fee payments"
  ON public.fee_payments FOR SELECT
  USING (school_id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Parents can view linked student fees"
  ON public.fee_payments FOR SELECT
  USING (student_id IN (
    SELECT student_id FROM parent_students WHERE parent_user_id = auth.uid()
  ));

-- Auto-generate receipt numbers
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
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

CREATE TRIGGER trg_generate_receipt_number
  BEFORE INSERT ON public.fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_receipt_number();

-- Add updated_at triggers for new tables
CREATE TRIGGER update_fee_structures_updated_at
  BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fee_payments_updated_at
  BEFORE UPDATE ON public.fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
