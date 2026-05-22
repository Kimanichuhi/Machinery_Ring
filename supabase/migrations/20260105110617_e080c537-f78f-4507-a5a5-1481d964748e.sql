-- Migration: 20260105110617_e080c537-f78f-4507-a5a5-1481d964748e.sql
--
-- Drop existing restrictive policies for Coordinators and TOTs
DROP POLICY IF EXISTS "Coordinators can view their local_mr machinery" ON public.machinery;
DROP POLICY IF EXISTS "TOTs can view their local_mr machinery" ON public.machinery;

-- Create updated policies that also allow viewing shared/unassigned machinery (local_mr_id IS NULL)
CREATE POLICY "Coordinators can view machinery"
ON public.machinery
FOR SELECT
USING (
  is_coordinator_of(auth.uid(), local_mr_id) 
  OR local_mr_id IS NULL
);

CREATE POLICY "TOTs can view machinery"
ON public.machinery
FOR SELECT
USING (
  local_mr_id = get_user_local_mr_id(auth.uid()) 
  OR local_mr_id IS NULL
);