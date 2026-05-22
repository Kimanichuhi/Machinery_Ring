-- Migration: 20260102112226_72656105-269c-4467-a42e-70a234835579.sql
--
-- Fix: Restrict profiles table access based on roles
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Admins and managers can view all profiles
CREATE POLICY "Admins and managers can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Coordinators can view profiles of TOTs in their local MR
CREATE POLICY "Coordinators can view local_mr profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'local_mr_coordinator'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.tot_assignments ta
    JOIN public.local_mrs lm ON ta.local_mr_id = lm.id
    WHERE ta.tot_id = profiles.id
    AND lm.coordinator_id = auth.uid()
  )
);