-- Migration: 20260102121957_d5bf7d75-3281-4331-a2a6-2657fc1a9a29.sql
--
-- ============================================================
-- ADD AUTHENTICATION REQUIREMENT POLICIES TO ALL TABLES
-- These ensure no unauthenticated access is possible
-- ============================================================

-- Helper function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
$$;

-- PROFILES: Add authentication requirement (already has role-based policies)
CREATE POLICY "Require authentication for profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- FARMERS: Add authentication requirement
CREATE POLICY "Require authentication for farmers"
ON public.farmers FOR SELECT
USING (auth.uid() IS NOT NULL);

-- LOCAL_MRS: Add authentication requirement 
CREATE POLICY "Require authentication for local_mrs"
ON public.local_mrs FOR SELECT
USING (auth.uid() IS NOT NULL);

-- SALES: Add authentication requirement
CREATE POLICY "Require authentication for sales"
ON public.sales FOR SELECT
USING (auth.uid() IS NOT NULL);

-- COMMISSION_PAYOUTS: Add authentication requirement
CREATE POLICY "Require authentication for commission_payouts"
ON public.commission_payouts FOR SELECT
USING (auth.uid() IS NOT NULL);

-- MECHANISATION_JOBS: Add authentication requirement
CREATE POLICY "Require authentication for mechanisation_jobs"
ON public.mechanisation_jobs FOR SELECT
USING (auth.uid() IS NOT NULL);

-- VISITS: Add authentication requirement
CREATE POLICY "Require authentication for visits"
ON public.visits FOR SELECT
USING (auth.uid() IS NOT NULL);

-- PRODUCTS: Add authentication requirement
CREATE POLICY "Require authentication for products"
ON public.products FOR SELECT
USING (auth.uid() IS NOT NULL);

-- MACHINERY: Add authentication requirement
CREATE POLICY "Require authentication for machinery"
ON public.machinery FOR SELECT
USING (auth.uid() IS NOT NULL);

-- MACHINERY_SERVICE_HISTORY: Add authentication requirement
CREATE POLICY "Require authentication for machinery_service_history"
ON public.machinery_service_history FOR SELECT
USING (auth.uid() IS NOT NULL);

-- MACHINERY_BOOKINGS: Add authentication requirement
CREATE POLICY "Require authentication for machinery_bookings"
ON public.machinery_bookings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- TRAININGS: Add authentication requirement
CREATE POLICY "Require authentication for trainings"
ON public.trainings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- TRAINING_ATTENDEES: Add authentication requirement
CREATE POLICY "Require authentication for training_attendees"
ON public.training_attendees FOR SELECT
USING (auth.uid() IS NOT NULL);

-- TOT_ASSIGNMENTS: Add authentication requirement
CREATE POLICY "Require authentication for tot_assignments"
ON public.tot_assignments FOR SELECT
USING (auth.uid() IS NOT NULL);

-- USER_ROLES: Add authentication requirement
CREATE POLICY "Require authentication for user_roles"
ON public.user_roles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- NOTIFICATIONS: Add authentication requirement
CREATE POLICY "Require authentication for notifications"
ON public.notifications FOR SELECT
USING (auth.uid() IS NOT NULL);

-- AUDIT_LOGS: Add authentication requirement
CREATE POLICY "Require authentication for audit_logs"
ON public.audit_logs FOR SELECT
USING (auth.uid() IS NOT NULL);