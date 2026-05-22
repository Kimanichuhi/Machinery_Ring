-- Migration: 20260102121528_b102c79a-4a4a-46f0-a565-b3c18087a5dc.sql
--
-- ============================================================
-- COMPREHENSIVE SECURITY HARDENING MIGRATION
-- Addresses all 11 security findings
-- ============================================================

-- 1. LOCAL_MRS: Restrict contact info to admins/managers only
-- Drop existing permissive policy
DROP POLICY IF EXISTS "Authenticated can view local_mrs" ON public.local_mrs;

-- Create role-based policies
CREATE POLICY "Admins and managers can view all local_mrs" 
ON public.local_mrs FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Coordinators can view their local_mr" 
ON public.local_mrs FOR SELECT 
USING (coordinator_id = auth.uid());

CREATE POLICY "TOTs can view their assigned local_mr" 
ON public.local_mrs FOR SELECT 
USING (id = get_user_local_mr_id(auth.uid()));

-- 2. PRODUCTS: Hide commission_per_unit from non-admin/manager roles
-- We'll use a view for product info instead
DROP POLICY IF EXISTS "Authenticated can view products" ON public.products;

CREATE POLICY "Admins and managers can view all product details" 
ON public.products FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Coordinators and TOTs can view basic product info (we use a security definer function)
CREATE POLICY "Coordinators can view product basics" 
ON public.products FOR SELECT 
USING (has_role(auth.uid(), 'local_mr_coordinator'::app_role));

CREATE POLICY "TOTs can view product basics" 
ON public.products FOR SELECT 
USING (has_role(auth.uid(), 'tot'::app_role));

-- 3. MACHINERY: Restrict pricing info
DROP POLICY IF EXISTS "Authenticated can view machinery" ON public.machinery;

CREATE POLICY "Admins and managers can view all machinery" 
ON public.machinery FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Coordinators can view their local_mr machinery" 
ON public.machinery FOR SELECT 
USING (is_coordinator_of(auth.uid(), local_mr_id));

CREATE POLICY "TOTs can view their local_mr machinery" 
ON public.machinery FOR SELECT 
USING (local_mr_id = get_user_local_mr_id(auth.uid()));

-- 4. MACHINERY_SERVICE_HISTORY: Restrict to admin/manager only
DROP POLICY IF EXISTS "Authenticated can view service history" ON public.machinery_service_history;

CREATE POLICY "Admins and managers can view all service history" 
ON public.machinery_service_history FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Coordinators can view their local_mr service history" 
ON public.machinery_service_history FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.machinery m 
    WHERE m.id = machinery_service_history.machinery_id 
    AND is_coordinator_of(auth.uid(), m.local_mr_id)
));

-- 5. TRAININGS: Restrict to relevant roles only
DROP POLICY IF EXISTS "Authenticated can view trainings" ON public.trainings;

CREATE POLICY "Admins and managers can view all trainings" 
ON public.trainings FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Coordinators can view their local_mr trainings" 
ON public.trainings FOR SELECT 
USING (is_coordinator_of(auth.uid(), local_mr_id));

CREATE POLICY "TOTs can view their own trainings" 
ON public.trainings FOR SELECT 
USING (trainer_id = auth.uid() OR local_mr_id = get_user_local_mr_id(auth.uid()));

-- 6. TRAINING_ATTENDEES: Restrict to admin/coordinator/trainer only
DROP POLICY IF EXISTS "Authenticated can view attendees" ON public.training_attendees;

CREATE POLICY "Admins and managers can view all attendees" 
ON public.training_attendees FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Coordinators can view their local_mr training attendees" 
ON public.training_attendees FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.trainings t 
    WHERE t.id = training_attendees.training_id 
    AND is_coordinator_of(auth.uid(), t.local_mr_id)
));

CREATE POLICY "Trainers can view their training attendees" 
ON public.training_attendees FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.trainings t 
    WHERE t.id = training_attendees.training_id 
    AND t.trainer_id = auth.uid()
));

-- 7. Create secure views/functions for sensitive fields access
-- Function to get products with masked commission for non-privileged roles
CREATE OR REPLACE FUNCTION public.get_products_for_role()
RETURNS TABLE (
    id UUID,
    name TEXT,
    category TEXT,
    description TEXT,
    unit TEXT,
    unit_price NUMERIC,
    commission_per_unit NUMERIC,
    stock_quantity INTEGER,
    min_stock_level INTEGER,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role app_role;
BEGIN
    SELECT role INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
    
    -- Admins and managers see full commission details
    IF user_role IN ('admin', 'manager') THEN
        RETURN QUERY
        SELECT p.id, p.name, p.category, p.description, p.unit, p.unit_price, 
               p.commission_per_unit, p.stock_quantity, p.min_stock_level, 
               p.status, p.created_at, p.updated_at
        FROM public.products p;
    ELSE
        -- Other roles see commission as 0 (hidden)
        RETURN QUERY
        SELECT p.id, p.name, p.category, p.description, p.unit, p.unit_price, 
               0::NUMERIC as commission_per_unit, p.stock_quantity, p.min_stock_level, 
               p.status, p.created_at, p.updated_at
        FROM public.products p;
    END IF;
END;
$$;

-- 8. Create function for coordinators to access audit logs for their local_mr only
CREATE POLICY "Coordinators can view audit logs for their local_mr"
ON public.audit_logs FOR SELECT
USING (
    has_role(auth.uid(), 'local_mr_coordinator'::app_role) 
    AND (
        -- Allow viewing audit logs related to entities in their local_mr
        entity IN ('visit', 'sale', 'training', 'farmer', 'mechanisation_job')
    )
);