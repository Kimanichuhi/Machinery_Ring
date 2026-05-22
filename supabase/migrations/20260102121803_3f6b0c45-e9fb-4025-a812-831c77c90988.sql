-- Migration: 20260102121803_3f6b0c45-e9fb-4025-a812-831c77c90988.sql
--
-- ============================================================
-- DROP UNPROTECTED VIEWS AND REPLACE WITH SECURE FUNCTIONS
-- ============================================================

-- 1. Drop the sales_summary view - it has no RLS
DROP VIEW IF EXISTS public.sales_summary;

-- 2. Drop the tot_performance view - it has no RLS
DROP VIEW IF EXISTS public.tot_performance;

-- 3. Create secure function for sales summary with role-based access
CREATE OR REPLACE FUNCTION public.get_sales_summary(_local_mr_id uuid DEFAULT NULL)
RETURNS TABLE (
    local_mr_id UUID,
    local_mr_name TEXT,
    month TIMESTAMPTZ,
    total_sales BIGINT,
    total_revenue NUMERIC,
    total_commission NUMERIC,
    unique_farmers BIGINT,
    active_tots BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role app_role;
    user_local_mr_id UUID;
BEGIN
    SELECT role INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
    
    -- Admins and managers can see all
    IF user_role IN ('admin', 'manager') THEN
        RETURN QUERY
        SELECT 
            lm.id as local_mr_id,
            lm.name as local_mr_name,
            DATE_TRUNC('month', s.sale_date) as month,
            COUNT(*)::BIGINT as total_sales,
            SUM(s.total_amount) as total_revenue,
            SUM(s.commission_amount) as total_commission,
            COUNT(DISTINCT s.farmer_id)::BIGINT as unique_farmers,
            COUNT(DISTINCT s.tot_id)::BIGINT as active_tots
        FROM public.sales s
        JOIN public.local_mrs lm ON s.local_mr_id = lm.id
        WHERE s.payment_status != 'cancelled'
        AND (_local_mr_id IS NULL OR s.local_mr_id = _local_mr_id)
        GROUP BY lm.id, lm.name, DATE_TRUNC('month', s.sale_date)
        ORDER BY month DESC;
    
    -- Coordinators see their local MR only
    ELSIF user_role = 'local_mr_coordinator' THEN
        RETURN QUERY
        SELECT 
            lm.id as local_mr_id,
            lm.name as local_mr_name,
            DATE_TRUNC('month', s.sale_date) as month,
            COUNT(*)::BIGINT as total_sales,
            SUM(s.total_amount) as total_revenue,
            SUM(s.commission_amount) as total_commission,
            COUNT(DISTINCT s.farmer_id)::BIGINT as unique_farmers,
            COUNT(DISTINCT s.tot_id)::BIGINT as active_tots
        FROM public.sales s
        JOIN public.local_mrs lm ON s.local_mr_id = lm.id
        WHERE s.payment_status != 'cancelled'
        AND lm.coordinator_id = auth.uid()
        AND (_local_mr_id IS NULL OR s.local_mr_id = _local_mr_id)
        GROUP BY lm.id, lm.name, DATE_TRUNC('month', s.sale_date)
        ORDER BY month DESC;
    
    -- TOTs see their local MR stats only
    ELSIF user_role = 'tot' THEN
        SELECT get_user_local_mr_id(auth.uid()) INTO user_local_mr_id;
        
        RETURN QUERY
        SELECT 
            lm.id as local_mr_id,
            lm.name as local_mr_name,
            DATE_TRUNC('month', s.sale_date) as month,
            COUNT(*)::BIGINT as total_sales,
            SUM(s.total_amount) as total_revenue,
            SUM(s.commission_amount) as total_commission,
            COUNT(DISTINCT s.farmer_id)::BIGINT as unique_farmers,
            COUNT(DISTINCT s.tot_id)::BIGINT as active_tots
        FROM public.sales s
        JOIN public.local_mrs lm ON s.local_mr_id = lm.id
        WHERE s.payment_status != 'cancelled'
        AND s.local_mr_id = user_local_mr_id
        AND (_local_mr_id IS NULL OR s.local_mr_id = _local_mr_id)
        GROUP BY lm.id, lm.name, DATE_TRUNC('month', s.sale_date)
        ORDER BY month DESC;
    END IF;
END;
$$;

-- 4. Create secure function for TOT performance with role-based access
CREATE OR REPLACE FUNCTION public.get_tot_performance(_local_mr_id uuid DEFAULT NULL)
RETURNS TABLE (
    tot_id UUID,
    tot_name TEXT,
    local_mr_id UUID,
    local_mr_name TEXT,
    total_sales BIGINT,
    total_revenue NUMERIC,
    total_commission NUMERIC,
    paid_commission NUMERIC,
    pending_commission NUMERIC,
    farmers_served BIGINT,
    total_visits BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role app_role;
    user_local_mr_id UUID;
BEGIN
    SELECT role INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
    
    -- Admins and managers can see all
    IF user_role IN ('admin', 'manager') THEN
        RETURN QUERY
        SELECT 
            ta.tot_id,
            p.name as tot_name,
            ta.local_mr_id,
            lm.name as local_mr_name,
            COALESCE((SELECT COUNT(*) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::BIGINT as total_sales,
            COALESCE((SELECT SUM(s.total_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::NUMERIC as total_revenue,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::NUMERIC as total_commission,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id AND s.commission_paid = true), 0)::NUMERIC as paid_commission,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id AND s.commission_paid = false), 0)::NUMERIC as pending_commission,
            COALESCE((SELECT COUNT(DISTINCT s.farmer_id) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::BIGINT as farmers_served,
            COALESCE((SELECT COUNT(*) FROM public.visits v WHERE v.tot_id = ta.tot_id), 0)::BIGINT as total_visits
        FROM public.tot_assignments ta
        JOIN public.profiles p ON p.id = ta.tot_id
        JOIN public.local_mrs lm ON lm.id = ta.local_mr_id
        WHERE ta.status = 'active'
        AND (_local_mr_id IS NULL OR ta.local_mr_id = _local_mr_id);
    
    -- Coordinators see their local MR TOTs only
    ELSIF user_role = 'local_mr_coordinator' THEN
        RETURN QUERY
        SELECT 
            ta.tot_id,
            p.name as tot_name,
            ta.local_mr_id,
            lm.name as local_mr_name,
            COALESCE((SELECT COUNT(*) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::BIGINT as total_sales,
            COALESCE((SELECT SUM(s.total_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::NUMERIC as total_revenue,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::NUMERIC as total_commission,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id AND s.commission_paid = true), 0)::NUMERIC as paid_commission,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id AND s.commission_paid = false), 0)::NUMERIC as pending_commission,
            COALESCE((SELECT COUNT(DISTINCT s.farmer_id) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::BIGINT as farmers_served,
            COALESCE((SELECT COUNT(*) FROM public.visits v WHERE v.tot_id = ta.tot_id), 0)::BIGINT as total_visits
        FROM public.tot_assignments ta
        JOIN public.profiles p ON p.id = ta.tot_id
        JOIN public.local_mrs lm ON lm.id = ta.local_mr_id
        WHERE ta.status = 'active'
        AND lm.coordinator_id = auth.uid()
        AND (_local_mr_id IS NULL OR ta.local_mr_id = _local_mr_id);
    
    -- TOTs see only their own performance
    ELSIF user_role = 'tot' THEN
        RETURN QUERY
        SELECT 
            ta.tot_id,
            p.name as tot_name,
            ta.local_mr_id,
            lm.name as local_mr_name,
            COALESCE((SELECT COUNT(*) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::BIGINT as total_sales,
            COALESCE((SELECT SUM(s.total_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::NUMERIC as total_revenue,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::NUMERIC as total_commission,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id AND s.commission_paid = true), 0)::NUMERIC as paid_commission,
            COALESCE((SELECT SUM(s.commission_amount) FROM public.sales s WHERE s.tot_id = ta.tot_id AND s.commission_paid = false), 0)::NUMERIC as pending_commission,
            COALESCE((SELECT COUNT(DISTINCT s.farmer_id) FROM public.sales s WHERE s.tot_id = ta.tot_id), 0)::BIGINT as farmers_served,
            COALESCE((SELECT COUNT(*) FROM public.visits v WHERE v.tot_id = ta.tot_id), 0)::BIGINT as total_visits
        FROM public.tot_assignments ta
        JOIN public.profiles p ON p.id = ta.tot_id
        JOIN public.local_mrs lm ON lm.id = ta.local_mr_id
        WHERE ta.status = 'active'
        AND ta.tot_id = auth.uid()
        AND (_local_mr_id IS NULL OR ta.local_mr_id = _local_mr_id);
    END IF;
END;
$$;