-- Migration: 20260629170000_communication_weather_intelligence.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.is_communication_operator(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(user_id, 'admin'::app_role)
      OR public.has_role(user_id, 'manager'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_communication_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(user_id, 'admin'::app_role);
$$;

CREATE TABLE IF NOT EXISTS public.communication_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'manual',
  category text,
  status text NOT NULL DEFAULT 'draft',
  scheduled_message_id uuid,
  recipient_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  estimated_cost numeric(12,2) NOT NULL DEFAULT 0,
  provider text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.communication_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.communication_messages(id) ON DELETE CASCADE,
  farmer_id uuid REFERENCES public.farmers(id) ON DELETE SET NULL,
  local_mr_id uuid REFERENCES public.local_mrs(id) ON DELETE SET NULL,
  name text,
  phone text NOT NULL,
  recipient_type text NOT NULL DEFAULT 'farmer',
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.communication_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  body text NOT NULL,
  variables text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_default boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'manual',
  scheduled_for timestamptz NOT NULL,
  repeat_rule text NOT NULL DEFAULT 'once',
  cron_expression text,
  timezone text NOT NULL DEFAULT 'Africa/Nairobi',
  last_run_at timestamptz,
  next_run_at timestamptz,
  paused_at timestamptz,
  cancelled_at timestamptz,
  retry_policy jsonb NOT NULL DEFAULT '{"max_attempts":3}'::jsonb,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

ALTER TABLE public.communication_messages
  ADD CONSTRAINT communication_messages_scheduled_message_fk
  FOREIGN KEY (scheduled_message_id) REFERENCES public.scheduled_messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.communication_messages(id) ON DELETE SET NULL,
  provider text,
  provider_batch_id text,
  status text NOT NULL DEFAULT 'queued',
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_recipients integer NOT NULL DEFAULT 0,
  total_cost numeric(12,2) NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.sms_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.communication_messages(id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES public.communication_recipients(id) ON DELETE SET NULL,
  farmer_id uuid REFERENCES public.farmers(id) ON DELETE SET NULL,
  phone text NOT NULL,
  provider text,
  provider_id text,
  delivery_status text NOT NULL DEFAULT 'pending',
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  retry_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.sms_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.communication_messages(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.communication_recipients(id) ON DELETE CASCADE,
  phone text NOT NULL,
  body text NOT NULL,
  priority integer NOT NULL DEFAULT 5,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  processed_at timestamptz,
  error text,
  status text NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.weather_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL,
  latitude numeric(10,6),
  longitude numeric(10,6),
  temperature numeric(6,2),
  humidity numeric(6,2),
  rain numeric(6,2),
  wind numeric(6,2),
  forecast jsonb NOT NULL DEFAULT '{}'::jsonb,
  alert_level text NOT NULL DEFAULT 'low',
  raw_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ttl_seconds integer NOT NULL DEFAULT 86400,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.weather_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weather_cache_id uuid REFERENCES public.weather_cache(id) ON DELETE SET NULL,
  forecast_date date NOT NULL,
  summary text,
  temperature_min numeric(6,2),
  temperature_max numeric(6,2),
  rain_probability numeric(6,2),
  humidity numeric(6,2),
  wind_speed numeric(6,2),
  agricultural_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.weather_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weather_cache_id uuid REFERENCES public.weather_cache(id) ON DELETE SET NULL,
  alert_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  recommendation text,
  queued_message_id uuid REFERENCES public.communication_messages(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.weather_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  period_start date,
  period_end date,
  report_type text NOT NULL DEFAULT 'weekly',
  summary text,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_message_id uuid REFERENCES public.communication_messages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.communication_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_sensitive boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type text NOT NULL,
  provider_name text NOT NULL,
  non_secret_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref text,
  is_active boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_communication_messages_status ON public.communication_messages(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_communication_messages_created_at ON public.communication_messages(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_communication_recipients_message_id ON public.communication_recipients(message_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_next_run ON public.scheduled_messages(next_run_at, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sms_queue_ready ON public.sms_queue(status, scheduled_for, priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sms_delivery_logs_message_id ON public.sms_delivery_logs(message_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sms_delivery_logs_phone ON public.sms_delivery_logs(phone) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires_at ON public.weather_cache(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_weather_forecasts_date ON public.weather_forecasts(forecast_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_weather_alerts_status ON public.weather_alerts(status, severity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_provider_settings_active ON public.provider_settings(provider_type, is_active) WHERE deleted_at IS NULL;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'communication_messages',
    'communication_recipients',
    'communication_templates',
    'scheduled_messages',
    'sms_logs',
    'sms_delivery_logs',
    'sms_queue',
    'weather_cache',
    'weather_forecasts',
    'weather_alerts',
    'weather_reports',
    'communication_settings',
    'provider_settings'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', table_name, table_name);
  END LOOP;
END $$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'communication_messages',
    'communication_recipients',
    'communication_templates',
    'scheduled_messages',
    'sms_logs',
    'sms_delivery_logs',
    'sms_queue',
    'weather_cache',
    'weather_forecasts',
    'weather_alerts',
    'weather_reports',
    'communication_settings',
    'provider_settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Admins full access to %s" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Managers read and create %s" ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY "Admins full access to %s" ON public.%I FOR ALL TO authenticated USING (public.is_communication_admin(auth.uid())) WITH CHECK (public.is_communication_admin(auth.uid()))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Managers read and create %s" ON public.%I FOR SELECT TO authenticated USING (public.is_communication_operator(auth.uid()) AND deleted_at IS NULL)', table_name, table_name);
    EXECUTE format('CREATE POLICY "Managers insert %s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_communication_operator(auth.uid()))', table_name, table_name);
  END LOOP;
END $$;

INSERT INTO public.communication_templates (name, category, body, variables, is_default, status)
VALUES
  ('Training Reminder', 'Training', 'Hello {{farmer_name}}, reminder: training is on {{date}} at {{time}} in {{training_location}}. Machinery Ring Nyandarua.', ARRAY['farmer_name','date','time','training_location'], true, 'active'),
  ('Machinery Booking', 'Machinery', 'Hello {{farmer_name}}, your machinery booking is confirmed for {{date}} at {{time}}. Machinery Ring Nyandarua.', ARRAY['farmer_name','date','time'], true, 'active'),
  ('Weather Update', 'Weather', 'Weather update for {{local_mr}}: {{weather}}, temperature {{temperature}}. Plan spraying and machinery work accordingly.', ARRAY['local_mr','weather','temperature'], true, 'active'),
  ('Payment Reminder', 'Finance', 'Hello {{farmer_name}}, kindly complete your pending payment by {{date}}. Machinery Ring Nyandarua.', ARRAY['farmer_name','date'], true, 'active'),
  ('Meeting Invitation', 'Meeting', 'Hello {{farmer_name}}, you are invited to a Machinery Ring meeting on {{date}} at {{time}}.', ARRAY['farmer_name','date','time'], true, 'active'),
  ('Emergency Alert', 'Alert', 'Emergency alert for {{local_mr}}: {{weather}}. Follow field safety guidance and avoid risky operations.', ARRAY['local_mr','weather'], true, 'active'),
  ('General Announcement', 'Announcement', 'Hello {{farmer_name}}, {{local_mr}} announcement: ', ARRAY['farmer_name','local_mr'], true, 'active'),
  ('Seasonal Advice', 'Advisory', 'Seasonal advice: {{weather}} expected. Recommendations: planting, spraying, dairy, and machinery schedules should be reviewed.', ARRAY['weather'], true, 'active')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
