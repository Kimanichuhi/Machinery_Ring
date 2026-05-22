-- Migration: 20260102110017_7a82adf1-9b42-4798-89dc-dc59a06371e8.sql
--
-- Add commission_per_acre and tot_commission to mechanisation_jobs
ALTER TABLE public.mechanisation_jobs 
ADD COLUMN IF NOT EXISTS commission_per_acre numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS tot_commission numeric DEFAULT 0;

-- Enable realtime for mechanisation_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.mechanisation_jobs;

-- Create trigger to calculate tot_commission on insert/update
CREATE OR REPLACE FUNCTION public.calculate_mechanisation_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate TOT commission based on acreage and commission rate
  NEW.tot_commission := COALESCE(NEW.area_acres, 0) * COALESCE(NEW.commission_per_acre, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS calculate_mechanisation_commission_trigger ON public.mechanisation_jobs;

-- Create trigger
CREATE TRIGGER calculate_mechanisation_commission_trigger
BEFORE INSERT OR UPDATE ON public.mechanisation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.calculate_mechanisation_commission();