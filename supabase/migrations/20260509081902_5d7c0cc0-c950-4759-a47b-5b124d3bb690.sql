-- Migration: 20260509081902_5d7c0cc0-c950-4759-a47b-5b124d3bb690.sql
--

-- 1) Add office_employee to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'office_employee';
