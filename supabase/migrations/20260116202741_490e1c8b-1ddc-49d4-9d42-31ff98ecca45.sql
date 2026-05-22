-- Migration: 20260116202741_490e1c8b-1ddc-49d4-9d42-31ff98ecca45.sql
--
-- Add profile_id column to visits for TOT visits
ALTER TABLE public.visits 
ADD COLUMN profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Make farmer_id nullable to allow TOT-only visit records
ALTER TABLE public.visits 
ALTER COLUMN farmer_id DROP NOT NULL;

-- Add check constraint to ensure either farmer_id or profile_id is set
ALTER TABLE public.visits 
ADD CONSTRAINT visits_participant_check 
CHECK (farmer_id IS NOT NULL OR profile_id IS NOT NULL);

-- Add index for profile_id lookups
CREATE INDEX idx_visits_profile_id ON public.visits(profile_id);