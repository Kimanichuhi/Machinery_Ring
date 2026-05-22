-- Migration: 20260114210033_17fd3d91-c487-477f-87ac-e7b406618cc4.sql
--
-- Create function to update farmer visits_count
CREATE OR REPLACE FUNCTION public.update_farmer_visits_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment visits_count for the farmer
    UPDATE public.farmers
    SET visits_count = visits_count + 1,
        last_activity_date = now(),
        updated_at = now()
    WHERE id = NEW.farmer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement visits_count for the farmer
    UPDATE public.farmers
    SET visits_count = GREATEST(0, visits_count - 1),
        updated_at = now()
    WHERE id = OLD.farmer_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on visits table
DROP TRIGGER IF EXISTS update_farmer_visits_count_trigger ON public.visits;
CREATE TRIGGER update_farmer_visits_count_trigger
AFTER INSERT OR DELETE ON public.visits
FOR EACH ROW
EXECUTE FUNCTION public.update_farmer_visits_count();