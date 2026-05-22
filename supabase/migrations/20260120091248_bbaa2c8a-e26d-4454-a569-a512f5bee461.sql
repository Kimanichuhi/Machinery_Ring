-- Migration: 20260120091248_bbaa2c8a-e26d-4454-a569-a512f5bee461.sql
--
-- Add columns to track follow-up completion and link to original visit
ALTER TABLE public.visits 
ADD COLUMN IF NOT EXISTS follow_up_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.visits 
ADD COLUMN IF NOT EXISTS parent_visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL;

-- Add index for parent visit lookups
CREATE INDEX IF NOT EXISTS idx_visits_parent_visit_id ON public.visits(parent_visit_id);

-- Add index for follow-up queries
CREATE INDEX IF NOT EXISTS idx_visits_follow_up ON public.visits(follow_up_required, follow_up_date) 
WHERE follow_up_required = true AND follow_up_completed = false;

-- Allow TOTs to update their own visits (for marking follow-ups complete)
CREATE POLICY "TOTs can update own visits"
ON public.visits
FOR UPDATE
USING (auth.uid() = tot_id)
WITH CHECK (auth.uid() = tot_id);

-- Create function to send follow-up reminder notifications
CREATE OR REPLACE FUNCTION public.check_and_notify_overdue_followups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  visit_record RECORD;
  tot_profile RECORD;
BEGIN
  -- Find overdue follow-ups that haven't been completed
  FOR visit_record IN 
    SELECT v.id, v.tot_id, v.farmer_id, v.follow_up_date, f.name as farmer_name
    FROM visits v
    LEFT JOIN farmers f ON v.farmer_id = f.id
    WHERE v.follow_up_required = true 
      AND v.follow_up_completed = false
      AND v.follow_up_date < CURRENT_DATE
      AND v.follow_up_date >= CURRENT_DATE - INTERVAL '1 day'
  LOOP
    -- Insert notification for the TOT
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      visit_record.tot_id,
      'Overdue Follow-up',
      'Follow-up visit for ' || COALESCE(visit_record.farmer_name, 'a farmer') || ' was due on ' || visit_record.follow_up_date,
      'visit',
      '/visits/' || visit_record.id
    );
  END LOOP;
END;
$$;