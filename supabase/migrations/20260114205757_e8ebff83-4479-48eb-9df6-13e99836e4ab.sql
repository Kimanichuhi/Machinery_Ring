-- Migration: 20260114205757_e8ebff83-4479-48eb-9df6-13e99836e4ab.sql
--
-- Create function to update farmer trainings_attended count
CREATE OR REPLACE FUNCTION public.update_farmer_trainings_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment trainings_attended for the farmer
    UPDATE public.farmers
    SET trainings_attended = trainings_attended + 1,
        updated_at = now()
    WHERE id = NEW.farmer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement trainings_attended for the farmer
    UPDATE public.farmers
    SET trainings_attended = GREATEST(0, trainings_attended - 1),
        updated_at = now()
    WHERE id = OLD.farmer_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on training_attendees table
DROP TRIGGER IF EXISTS update_farmer_trainings_count_trigger ON public.training_attendees;
CREATE TRIGGER update_farmer_trainings_count_trigger
AFTER INSERT OR DELETE ON public.training_attendees
FOR EACH ROW
EXECUTE FUNCTION public.update_farmer_trainings_count();

-- Enable realtime for training_attendees table
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_attendees;