-- Migration: 20260101093411_e75e6861-7bea-470c-afaf-d9ae73688f97.sql
--
-- Fix function search_path security warning
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;