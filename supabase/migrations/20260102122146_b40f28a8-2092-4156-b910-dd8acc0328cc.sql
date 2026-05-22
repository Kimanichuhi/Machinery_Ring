-- Migration: 20260102122146_b40f28a8-2092-4156-b910-dd8acc0328cc.sql
--
-- ============================================================
-- REMOVE OVERLY PERMISSIVE AUTHENTICATION POLICIES
-- The role-based policies already require authentication via auth.uid()
-- These blanket policies create security holes by allowing ANY authenticated user
-- ============================================================

-- Drop all the blanket authentication policies
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for farmers" ON public.farmers;
DROP POLICY IF EXISTS "Require authentication for local_mrs" ON public.local_mrs;
DROP POLICY IF EXISTS "Require authentication for sales" ON public.sales;
DROP POLICY IF EXISTS "Require authentication for commission_payouts" ON public.commission_payouts;
DROP POLICY IF EXISTS "Require authentication for mechanisation_jobs" ON public.mechanisation_jobs;
DROP POLICY IF EXISTS "Require authentication for visits" ON public.visits;
DROP POLICY IF EXISTS "Require authentication for products" ON public.products;
DROP POLICY IF EXISTS "Require authentication for machinery" ON public.machinery;
DROP POLICY IF EXISTS "Require authentication for machinery_service_history" ON public.machinery_service_history;
DROP POLICY IF EXISTS "Require authentication for machinery_bookings" ON public.machinery_bookings;
DROP POLICY IF EXISTS "Require authentication for trainings" ON public.trainings;
DROP POLICY IF EXISTS "Require authentication for training_attendees" ON public.training_attendees;
DROP POLICY IF EXISTS "Require authentication for tot_assignments" ON public.tot_assignments;
DROP POLICY IF EXISTS "Require authentication for user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Require authentication for notifications" ON public.notifications;
DROP POLICY IF EXISTS "Require authentication for audit_logs" ON public.audit_logs;

-- Drop the helper function we don't need
DROP FUNCTION IF EXISTS public.is_authenticated();