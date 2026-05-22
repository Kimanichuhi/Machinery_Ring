-- Migration: 20260102112750_143a5f50-0c92-4625-9969-351f65f2cf9b.sql
--
-- Fix 1: Add RLS to monthly_trends view (materialized as table for RLS support)
-- Views in PostgreSQL don't support RLS directly, so we need to use security_invoker
-- The monthly_trends view already has security_invoker = on, but we need to ensure
-- only admins/managers can access aggregated data

-- Drop and recreate monthly_trends as a view with proper underlying restrictions
DROP VIEW IF EXISTS public.monthly_trends;

-- Create a function to get monthly trends with role-based access
CREATE OR REPLACE FUNCTION public.get_monthly_trends()
RETURNS TABLE(
    month DATE,
    sales_count BIGINT,
    revenue NUMERIC,
    commission NUMERIC,
    farmers BIGINT,
    tots BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow admins and managers to access this data
    IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)) THEN
        RAISE EXCEPTION 'Access denied: Admin or Manager role required';
    END IF;
    
    RETURN QUERY
    SELECT 
        DATE_TRUNC('month', sale_date)::DATE as month,
        COUNT(*)::BIGINT as sales_count,
        SUM(total_amount) as revenue,
        SUM(commission_amount) as commission,
        COUNT(DISTINCT farmer_id)::BIGINT as farmers,
        COUNT(DISTINCT tot_id)::BIGINT as tots
    FROM public.sales
    WHERE payment_status != 'cancelled'
    GROUP BY DATE_TRUNC('month', sale_date)
    ORDER BY month DESC;
END;
$$;

-- Fix 2: Create secure function for local_mr_performance with role checks
DROP VIEW IF EXISTS public.local_mr_performance;

CREATE OR REPLACE FUNCTION public.get_local_mr_performance(_local_mr_id UUID DEFAULT NULL)
RETURNS TABLE(
    local_mr_id UUID,
    local_mr_name TEXT,
    region TEXT,
    county TEXT,
    total_tots BIGINT,
    total_farmers BIGINT,
    total_sales BIGINT,
    total_revenue NUMERIC,
    total_commission NUMERIC,
    total_visits BIGINT,
    total_trainings BIGINT,
    total_bookings BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role app_role;
    user_local_mr_id UUID;
BEGIN
    -- Get user's role
    SELECT role INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
    
    -- Admins and managers can see all
    IF user_role IN ('admin', 'manager') THEN
        RETURN QUERY
        SELECT 
            lm.id as local_mr_id,
            lm.name as local_mr_name,
            lm.region,
            lm.county,
            COALESCE((SELECT COUNT(DISTINCT ta.tot_id) FROM public.tot_assignments ta WHERE ta.local_mr_id = lm.id AND ta.status = 'active'), 0)::BIGINT as total_tots,
            COALESCE((SELECT COUNT(*) FROM public.farmers f WHERE f.local_mr_id = lm.id), 0)::BIGINT as total_farmers,
            COALESCE((SELECT COUNT(*) FROM public.sales s WHERE s.local_mr_id = lm.id), 0)::BIGINT as total_sales,
            COALESCE((SELECT SUM(s.total_amount) FROM public.sales s WHERE s.local_mr_id = lm.id), 0)::NUMERIC as total_revenue,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.local_mr_id = lm.id), 0)::NUMERIC as total_commission,
            COALESCE((SELECT COUNT(*) FROM public.visits v WHERE v.local_mr_id = lm.id), 0)::BIGINT as total_visits,
            COALESCE((SELECT COUNT(*) FROM public.trainings t WHERE t.local_mr_id = lm.id), 0)::BIGINT as total_trainings,
            COALESCE((SELECT COUNT(*) FROM public.machinery_bookings mb WHERE mb.local_mr_id = lm.id), 0)::BIGINT as total_bookings
        FROM public.local_mrs lm
        WHERE (_local_mr_id IS NULL OR lm.id = _local_mr_id);
    
    -- Coordinators can only see their assigned local MR
    ELSIF user_role = 'local_mr_coordinator' THEN
        RETURN QUERY
        SELECT 
            lm.id as local_mr_id,
            lm.name as local_mr_name,
            lm.region,
            lm.county,
            COALESCE((SELECT COUNT(DISTINCT ta.tot_id) FROM public.tot_assignments ta WHERE ta.local_mr_id = lm.id AND ta.status = 'active'), 0)::BIGINT as total_tots,
            COALESCE((SELECT COUNT(*) FROM public.farmers f WHERE f.local_mr_id = lm.id), 0)::BIGINT as total_farmers,
            COALESCE((SELECT COUNT(*) FROM public.sales s WHERE s.local_mr_id = lm.id), 0)::BIGINT as total_sales,
            COALESCE((SELECT SUM(s.total_amount) FROM public.sales s WHERE s.local_mr_id = lm.id), 0)::NUMERIC as total_revenue,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.local_mr_id = lm.id), 0)::NUMERIC as total_commission,
            COALESCE((SELECT COUNT(*) FROM public.visits v WHERE v.local_mr_id = lm.id), 0)::BIGINT as total_visits,
            COALESCE((SELECT COUNT(*) FROM public.trainings t WHERE t.local_mr_id = lm.id), 0)::BIGINT as total_trainings,
            COALESCE((SELECT COUNT(*) FROM public.machinery_bookings mb WHERE mb.local_mr_id = lm.id), 0)::BIGINT as total_bookings
        FROM public.local_mrs lm
        WHERE lm.coordinator_id = auth.uid()
        AND (_local_mr_id IS NULL OR lm.id = _local_mr_id);
    
    -- TOTs can only see their own local MR stats
    ELSIF user_role = 'tot' THEN
        SELECT get_user_local_mr_id(auth.uid()) INTO user_local_mr_id;
        
        RETURN QUERY
        SELECT 
            lm.id as local_mr_id,
            lm.name as local_mr_name,
            lm.region,
            lm.county,
            COALESCE((SELECT COUNT(DISTINCT ta.tot_id) FROM public.tot_assignments ta WHERE ta.local_mr_id = lm.id AND ta.status = 'active'), 0)::BIGINT as total_tots,
            COALESCE((SELECT COUNT(*) FROM public.farmers f WHERE f.local_mr_id = lm.id), 0)::BIGINT as total_farmers,
            COALESCE((SELECT COUNT(*) FROM public.sales s WHERE s.local_mr_id = lm.id), 0)::BIGINT as total_sales,
            COALESCE((SELECT SUM(s.total_amount) FROM public.sales s WHERE s.local_mr_id = lm.id), 0)::NUMERIC as total_revenue,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.local_mr_id = lm.id), 0)::NUMERIC as total_commission,
            COALESCE((SELECT COUNT(*) FROM public.visits v WHERE v.local_mr_id = lm.id), 0)::BIGINT as total_visits,
            COALESCE((SELECT COUNT(*) FROM public.trainings t WHERE t.local_mr_id = lm.id), 0)::BIGINT as total_trainings,
            COALESCE((SELECT COUNT(*) FROM public.machinery_bookings mb WHERE mb.local_mr_id = lm.id), 0)::BIGINT as total_bookings
        FROM public.local_mrs lm
        WHERE lm.id = user_local_mr_id
        AND (_local_mr_id IS NULL OR lm.id = _local_mr_id);
    ELSE
        -- No access for unauthenticated or unknown roles
        RETURN;
    END IF;
END;
$$;

-- Fix 3: Restrict farmers table - TOTs can only see farmers they've registered or visited
-- Drop the existing overly permissive TOT policy
DROP POLICY IF EXISTS "TOTs can view farmers in their local_mr" ON public.farmers;

-- Create stricter policy: TOTs can only see farmers they registered or visited
CREATE POLICY "TOTs can view own registered or visited farmers" 
ON public.farmers 
FOR SELECT 
USING (
    -- User is a TOT
    has_role(auth.uid(), 'tot'::app_role) AND
    (
        -- Farmer was registered by this TOT
        registered_by = auth.uid() OR
        -- TOT has visited this farmer
        EXISTS (
            SELECT 1 FROM public.visits v 
            WHERE v.farmer_id = farmers.id 
            AND v.tot_id = auth.uid()
        ) OR
        -- TOT has a sale with this farmer
        EXISTS (
            SELECT 1 FROM public.sales s 
            WHERE s.farmer_id = farmers.id 
            AND s.tot_id = auth.uid()
        )
    )
);