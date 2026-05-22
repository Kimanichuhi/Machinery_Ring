-- Migration: 20260104185226_2b6e9206-55cf-4e5d-88e8-56cfb0d43407.sql
--

-- Fix function search path for security

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
