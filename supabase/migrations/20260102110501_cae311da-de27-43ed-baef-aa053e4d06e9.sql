-- Migration: 20260102110501_cae311da-de27-43ed-baef-aa053e4d06e9.sql
--
-- Fix function search path for calculate_mechanisation_commission
CREATE OR REPLACE FUNCTION public.calculate_mechanisation_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate TOT commission based on acreage and commission rate
  NEW.tot_commission := COALESCE(NEW.area_acres, 0) * COALESCE(NEW.commission_per_acre, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;