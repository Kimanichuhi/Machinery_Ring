-- Migration: 20260507071852_005b9459-b04c-432b-a327-1e7a745efcd9.sql
--

-- 1. Products: add buying & selling prices
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS buying_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Backfill selling_price from existing unit_price
UPDATE public.products SET selling_price = unit_price WHERE selling_price = 0 AND unit_price > 0;

-- 2. Sales: farmer optional + new commission columns
ALTER TABLE public.sales ALTER COLUMN farmer_id DROP NOT NULL;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS profit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tot_commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regional_mr_commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS local_mr_commission NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 3. Replace commission calculation trigger
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
BEGIN
    SELECT COALESCE(buying_price, 0), COALESCE(NULLIF(selling_price,0), unit_price, 0)
      INTO p_buying, p_selling
    FROM public.products WHERE id = NEW.product_id;

    per_unit_profit := GREATEST(p_selling - p_buying, 0);
    total_profit := NEW.quantity * per_unit_profit;

    NEW.unit_price := p_selling;
    NEW.total_amount := NEW.quantity * p_selling;
    NEW.profit_amount := total_profit;

    NEW.tot_commission := ROUND(total_profit * 0.40, 2);
    NEW.regional_mr_commission := ROUND(total_profit * 0.50, 2);
    NEW.local_mr_commission := ROUND(total_profit * 0.10, 2);

    -- Keep legacy commission_amount = TOT commission for compatibility
    NEW.commission_per_unit := ROUND(per_unit_profit * 0.40, 2);
    NEW.commission_amount := NEW.tot_commission;

    RETURN NEW;
END;
$function$;

-- 4. Update prevention trigger to also lock new fields
CREATE OR REPLACE FUNCTION public.prevent_commission_recalculation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.commission_per_unit := OLD.commission_per_unit;
    NEW.commission_amount := OLD.commission_amount;
    NEW.total_amount := OLD.total_amount;
    NEW.unit_price := OLD.unit_price;
    NEW.profit_amount := OLD.profit_amount;
    NEW.tot_commission := OLD.tot_commission;
    NEW.regional_mr_commission := OLD.regional_mr_commission;
    NEW.local_mr_commission := OLD.local_mr_commission;
    RETURN NEW;
END;
$function$;

-- 5. Ensure triggers exist
DROP TRIGGER IF EXISTS calculate_sale_commission_trigger ON public.sales;
CREATE TRIGGER calculate_sale_commission_trigger
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_sale_commission();

DROP TRIGGER IF EXISTS prevent_commission_recalculation_trigger ON public.sales;
CREATE TRIGGER prevent_commission_recalculation_trigger
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_commission_recalculation();
