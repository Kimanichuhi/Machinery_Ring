-- Migration: 20260212204451_f4ad0636-bf94-4233-a44d-2294e8f1f8f0.sql
--
-- Add unique constraint on phone to prevent duplicate farmers
-- Only apply to non-null, non-empty phone values
CREATE UNIQUE INDEX idx_farmers_unique_phone ON public.farmers (phone) WHERE phone IS NOT NULL AND phone != '';