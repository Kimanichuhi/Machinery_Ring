-- Migration: 20260108153018_ddef6621-facd-437a-a9a2-7fb30b9a97d8.sql
--
-- Create function to clean up user data when profile is deleted
CREATE OR REPLACE FUNCTION public.cleanup_user_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete user role
  DELETE FROM public.user_roles WHERE user_id = OLD.id;
  
  -- Delete tot assignments
  DELETE FROM public.tot_assignments WHERE tot_id = OLD.id;
  
  -- Delete notification settings
  DELETE FROM public.notification_settings WHERE user_id = OLD.id;
  
  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger to run before profile deletion
DROP TRIGGER IF EXISTS cleanup_user_data_trigger ON public.profiles;
CREATE TRIGGER cleanup_user_data_trigger
BEFORE DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_user_data();