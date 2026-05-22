-- Migration: 20260506105752_5d864ad4-f72a-4f62-b45f-9fc80769a8cd.sql
--
-- Replace ineffective permissive "deny anon" policies with proper RESTRICTIVE policies.
-- A permissive policy returning false does not deny access; only restrictive policies enforce denial.

DROP POLICY IF EXISTS "Deny anon access to machinery" ON public.machinery;
CREATE POLICY "Deny anon access to machinery"
ON public.machinery AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to commission_payouts" ON public.commission_payouts;
CREATE POLICY "Deny anon access to commission_payouts"
ON public.commission_payouts AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to profiles" ON public.profiles;
CREATE POLICY "Deny anon access to profiles"
ON public.profiles AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to farmers" ON public.farmers;
CREATE POLICY "Deny anon access to farmers"
ON public.farmers AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to sales" ON public.sales;
CREATE POLICY "Deny anon access to sales"
ON public.sales AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to visits" ON public.visits;
CREATE POLICY "Deny anon access to visits"
ON public.visits AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to trainings" ON public.trainings;
CREATE POLICY "Deny anon access to trainings"
ON public.trainings AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to training_attendees" ON public.training_attendees;
CREATE POLICY "Deny anon access to training_attendees"
ON public.training_attendees AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to mechanisation_jobs" ON public.mechanisation_jobs;
CREATE POLICY "Deny anon access to mechanisation_jobs"
ON public.mechanisation_jobs AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to machinery_bookings" ON public.machinery_bookings;
CREATE POLICY "Deny anon access to machinery_bookings"
ON public.machinery_bookings AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to local_mrs" ON public.local_mrs;
CREATE POLICY "Deny anon access to local_mrs"
ON public.local_mrs AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to user_roles" ON public.user_roles;
CREATE POLICY "Deny anon access to user_roles"
ON public.user_roles AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to tot_assignments" ON public.tot_assignments;
CREATE POLICY "Deny anon access to tot_assignments"
ON public.tot_assignments AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to notifications" ON public.notifications;
CREATE POLICY "Deny anon access to notifications"
ON public.notifications AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to audit_logs" ON public.audit_logs;
CREATE POLICY "Deny anon access to audit_logs"
ON public.audit_logs AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);