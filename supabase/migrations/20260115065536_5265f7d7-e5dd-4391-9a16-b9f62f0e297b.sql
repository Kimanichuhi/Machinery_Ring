-- Migration: 20260115065536_5265f7d7-e5dd-4391-9a16-b9f62f0e297b.sql
--
-- Add tot_id column to machinery_bookings to track which TOT connected the booking
ALTER TABLE public.machinery_bookings 
ADD COLUMN tot_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_machinery_bookings_tot_id ON public.machinery_bookings(tot_id);