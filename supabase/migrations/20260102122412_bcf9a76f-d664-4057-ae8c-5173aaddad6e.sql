-- Migration: 20260102122412_bcf9a76f-d664-4057-ae8c-5173aaddad6e.sql
--
-- ============================================================
-- ADD EXPLICIT DENY POLICIES FOR ANONYMOUS (UNAUTHENTICATED) USERS
-- This ensures the anon role cannot access any data even if other policies exist
-- ============================================================

-- PROFILES: Deny anon access
CREATE POLICY "Deny anon access to profiles"
ON public.profiles FOR SELECT TO anon
USING (false);

-- FARMERS: Deny anon access  
CREATE POLICY "Deny anon access to farmers"
ON public.farmers FOR SELECT TO anon
USING (false);

-- LOCAL_MRS: Deny anon access
CREATE POLICY "Deny anon access to local_mrs"
ON public.local_mrs FOR SELECT TO anon
USING (false);

-- SALES: Deny anon access
CREATE POLICY "Deny anon access to sales"
ON public.sales FOR SELECT TO anon
USING (false);

-- COMMISSION_PAYOUTS: Deny anon access
CREATE POLICY "Deny anon access to commission_payouts"
ON public.commission_payouts FOR SELECT TO anon
USING (false);

-- MECHANISATION_JOBS: Deny anon access
CREATE POLICY "Deny anon access to mechanisation_jobs"
ON public.mechanisation_jobs FOR SELECT TO anon
USING (false);

-- PRODUCTS: Deny anon access
CREATE POLICY "Deny anon access to products"
ON public.products FOR SELECT TO anon
USING (false);

-- MACHINERY: Deny anon access
CREATE POLICY "Deny anon access to machinery"
ON public.machinery FOR SELECT TO anon
USING (false);

-- MACHINERY_SERVICE_HISTORY: Deny anon access
CREATE POLICY "Deny anon access to machinery_service_history"
ON public.machinery_service_history FOR SELECT TO anon
USING (false);

-- MACHINERY_BOOKINGS: Deny anon access
CREATE POLICY "Deny anon access to machinery_bookings"
ON public.machinery_bookings FOR SELECT TO anon
USING (false);

-- TRAININGS: Deny anon access
CREATE POLICY "Deny anon access to trainings"
ON public.trainings FOR SELECT TO anon
USING (false);

-- TRAINING_ATTENDEES: Deny anon access
CREATE POLICY "Deny anon access to training_attendees"
ON public.training_attendees FOR SELECT TO anon
USING (false);

-- VISITS: Deny anon access
CREATE POLICY "Deny anon access to visits"
ON public.visits FOR SELECT TO anon
USING (false);

-- TOT_ASSIGNMENTS: Deny anon access
CREATE POLICY "Deny anon access to tot_assignments"
ON public.tot_assignments FOR SELECT TO anon
USING (false);

-- USER_ROLES: Deny anon access
CREATE POLICY "Deny anon access to user_roles"
ON public.user_roles FOR SELECT TO anon
USING (false);

-- NOTIFICATIONS: Deny anon access
CREATE POLICY "Deny anon access to notifications"
ON public.notifications FOR SELECT TO anon
USING (false);

-- AUDIT_LOGS: Deny anon access
CREATE POLICY "Deny anon access to audit_logs"
ON public.audit_logs FOR SELECT TO anon
USING (false);