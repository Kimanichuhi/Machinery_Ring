-- Migration: 20260106080456_c135445f-df71-42bc-9293-076ea41f39d2.sql
--
-- Add trainer text field to trainings table for manual trainer name entry
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS trainer TEXT;

-- Update status column default to 'completed' since all trainings are historical
ALTER TABLE public.trainings ALTER COLUMN status SET DEFAULT 'completed';