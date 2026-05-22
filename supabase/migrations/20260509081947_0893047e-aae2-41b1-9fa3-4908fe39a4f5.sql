-- Migration: 20260509081947_0893047e-aae2-41b1-9fa3-4908fe39a4f5.sql
--

-- Update commission calc to zero out commissions when recorder is office_employee
CREATE OR REPLACE FUNCTION public.calculate_sale_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    p_buying NUMERIC(12,2);
    p_selling NUMERIC(12,2);
    per_unit_profit NUMERIC(12,2);
    total_profit NUMERIC(12,2);
    recorder_role app_role;
BEGIN
    SELECT COALESCE(buying_price, 0), COALESCE(NULLIF(selling_price,0), unit_price, 0)
      INTO p_buying, p_selling
    FROM public.products WHERE id = NEW.product_id;

    per_unit_profit := GREATEST(p_selling - p_buying, 0);
    total_profit := NEW.quantity * per_unit_profit;

    NEW.unit_price := p_selling;
    NEW.total_amount := NEW.quantity * p_selling;
    NEW.profit_amount := total_profit;

    SELECT role INTO recorder_role FROM public.user_roles WHERE user_id = NEW.tot_id LIMIT 1;

    IF recorder_role = 'office_employee'::app_role THEN
        NEW.tot_commission := 0;
        NEW.regional_mr_commission := 0;
        NEW.local_mr_commission := 0;
        NEW.commission_per_unit := 0;
        NEW.commission_amount := 0;
    ELSE
        NEW.tot_commission := ROUND(total_profit * 0.40, 2);
        NEW.regional_mr_commission := ROUND(total_profit * 0.50, 2);
        NEW.local_mr_commission := ROUND(total_profit * 0.10, 2);
        NEW.commission_per_unit := ROUND(per_unit_profit * 0.40, 2);
        NEW.commission_amount := NEW.tot_commission;
    END IF;

    RETURN NEW;
END;
$function$;

-- RLS: allow office employees to view core data tables
DROP POLICY IF EXISTS "Office employees can view sales" ON public.sales;
CREATE POLICY "Office employees can view sales" ON public.sales
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_employee'::app_role));

DROP POLICY IF EXISTS "Office employees can record sales" ON public.sales;
CREATE POLICY "Office employees can record sales" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'office_employee'::app_role) AND tot_id = auth.uid());

DROP POLICY IF EXISTS "Office employees can view farmers" ON public.farmers;
CREATE POLICY "Office employees can view farmers" ON public.farmers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_employee'::app_role));

DROP POLICY IF EXISTS "Office employees can view products" ON public.products;
CREATE POLICY "Office employees can view products" ON public.products
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_employee'::app_role));

DROP POLICY IF EXISTS "Office employees can view local_mrs" ON public.local_mrs;
CREATE POLICY "Office employees can view local_mrs" ON public.local_mrs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_employee'::app_role));

DROP POLICY IF EXISTS "Office employees can view tot_assignments" ON public.tot_assignments;
CREATE POLICY "Office employees can view tot_assignments" ON public.tot_assignments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_employee'::app_role));

DROP POLICY IF EXISTS "Office employees can view profiles" ON public.profiles;
CREATE POLICY "Office employees can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_employee'::app_role));

DROP POLICY IF EXISTS "Office employees can view machinery" ON public.machinery;
CREATE POLICY "Office employees can view machinery" ON public.machinery
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_employee'::app_role));

DROP POLICY IF EXISTS "Office employees can view trainings" ON public.trainings;
CREATE POLICY "Office employees can view trainings" ON public.trainings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_employee'::app_role));

DROP POLICY IF EXISTS "Office employees can view visits" ON public.visits;
CREATE POLICY "Office employees can view visits" ON public.visits
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_employee'::app_role));

DROP POLICY IF EXISTS "Office employees can view machinery_bookings" ON public.machinery_bookings;
CREATE POLICY "Office employees can view machinery_bookings" ON public.machinery_bookings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_employee'::app_role));
