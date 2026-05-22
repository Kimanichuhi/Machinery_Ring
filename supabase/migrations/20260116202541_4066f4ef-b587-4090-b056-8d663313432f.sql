-- Migration: 20260116202541_4066f4ef-b587-4090-b056-8d663313432f.sql
--
-- Add profile_id column to training_attendees for TOT attendance
ALTER TABLE public.training_attendees 
ADD COLUMN profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Make farmer_id nullable to allow TOT-only attendance records
ALTER TABLE public.training_attendees 
ALTER COLUMN farmer_id DROP NOT NULL;

-- Add check constraint to ensure either farmer_id or profile_id is set
ALTER TABLE public.training_attendees 
ADD CONSTRAINT training_attendees_participant_check 
CHECK (farmer_id IS NOT NULL OR profile_id IS NOT NULL);

-- Drop the existing unique constraint on training_id, farmer_id and recreate with profile_id
ALTER TABLE public.training_attendees DROP CONSTRAINT IF EXISTS training_attendees_training_id_farmer_id_key;

-- Create a unique index that allows either farmer or profile attendance
CREATE UNIQUE INDEX training_attendees_unique_participant 
ON public.training_attendees (training_id, COALESCE(farmer_id, '00000000-0000-0000-0000-000000000000'), COALESCE(profile_id, '00000000-0000-0000-0000-000000000000'));

-- Add index for profile_id lookups
CREATE INDEX idx_training_attendees_profile_id ON public.training_attendees(profile_id);

-- Update RLS policies to allow viewing attendees with profile_id
-- (existing policies already cover this via training_id checks)