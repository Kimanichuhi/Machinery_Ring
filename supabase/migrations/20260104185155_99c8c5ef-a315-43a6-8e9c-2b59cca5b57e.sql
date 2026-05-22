-- Migration: 20260104185155_99c8c5ef-a315-43a6-8e9c-2b59cca5b57e.sql
--

-- Create notification triggers for sales, trainings, and bookings

-- Function to create notification on sale completion
CREATE OR REPLACE FUNCTION public.notify_sale_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    INSERT INTO public.notifications (type, title, message, user_id, local_mr_id)
    VALUES (
      'sale',
      'Sale Completed',
      'A sale has been completed successfully.',
      NEW.tot_id,
      NEW.local_mr_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification on training completion
CREATE OR REPLACE FUNCTION public.notify_training_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
    INSERT INTO public.notifications (type, title, message, user_id, local_mr_id)
    VALUES (
      'training',
      'Training Completed',
      'Training "' || NEW.title || '" has been marked as completed.',
      NEW.trainer_id,
      NEW.local_mr_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification on machinery booking
CREATE OR REPLACE FUNCTION public.notify_machinery_booked()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (type, title, message, user_id, local_mr_id)
  VALUES (
    'mechanisation',
    'Machinery Booked',
    'New machinery booking created for ' || NEW.start_date || '.',
    NEW.booked_by,
    NEW.local_mr_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_sale_completed ON public.sales;
CREATE TRIGGER trigger_notify_sale_completed
  AFTER INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_sale_completed();

DROP TRIGGER IF EXISTS trigger_notify_training_completed ON public.trainings;
CREATE TRIGGER trigger_notify_training_completed
  AFTER UPDATE ON public.trainings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_training_completed();

DROP TRIGGER IF EXISTS trigger_notify_machinery_booked ON public.machinery_bookings;
CREATE TRIGGER trigger_notify_machinery_booked
  AFTER INSERT ON public.machinery_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_machinery_booked();
