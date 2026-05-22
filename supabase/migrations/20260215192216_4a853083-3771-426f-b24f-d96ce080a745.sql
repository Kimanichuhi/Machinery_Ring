-- Migration: 20260215192216_4a853083-3771-426f-b24f-d96ce080a745.sql
--
-- Create a trigger function that calls the edge function on notification insert
CREATE OR REPLACE FUNCTION public.trigger_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _payload JSONB;
  _supabase_url TEXT;
  _service_key TEXT;
BEGIN
  -- Build payload matching what the edge function expects
  _payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'title', NEW.title,
      'message', NEW.message,
      'type', NEW.type
    )
  );

  -- Call the edge function via pg_net
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := _payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block notification insert if email fails
  RAISE WARNING 'Email notification trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_notification_insert_send_email ON public.notifications;
CREATE TRIGGER on_notification_insert_send_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notification_email();