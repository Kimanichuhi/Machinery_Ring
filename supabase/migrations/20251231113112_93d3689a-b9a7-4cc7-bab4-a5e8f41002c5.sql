-- Migration: 20251231113112_93d3689a-b9a7-4cc7-bab4-a5e8f41002c5.sql
--
-- Fix security definer views by recreating them with SECURITY INVOKER
DROP VIEW IF EXISTS public.sales_summary;
DROP VIEW IF EXISTS public.tot_performance;
DROP VIEW IF EXISTS public.local_mr_performance;
DROP VIEW IF EXISTS public.monthly_trends;

-- Sales summary view with SECURITY INVOKER
CREATE VIEW public.sales_summary
WITH (security_invoker = on)
AS
SELECT 
    s.local_mr_id,
    lm.name as local_mr_name,
    DATE_TRUNC('month', s.sale_date) as month,
    COUNT(*) as total_sales,
    SUM(s.total_amount) as total_revenue,
    SUM(s.commission_amount) as total_commission,
    COUNT(DISTINCT s.farmer_id) as unique_farmers,
    COUNT(DISTINCT s.tot_id) as active_tots
FROM public.sales s
JOIN public.local_mrs lm ON s.local_mr_id = lm.id
WHERE s.payment_status != 'cancelled'
GROUP BY s.local_mr_id, lm.name, DATE_TRUNC('month', s.sale_date);

-- TOT performance view with SECURITY INVOKER
CREATE VIEW public.tot_performance
WITH (security_invoker = on)
AS
SELECT 
    ta.tot_id,
    p.name as tot_name,
    ta.local_mr_id,
    lm.name as local_mr_name,
    COUNT(DISTINCT s.id) as total_sales,
    COALESCE(SUM(s.total_amount), 0) as total_revenue,
    COALESCE(SUM(s.commission_amount), 0) as total_commission,
    COALESCE(SUM(CASE WHEN s.commission_paid THEN s.commission_amount ELSE 0 END), 0) as paid_commission,
    COALESCE(SUM(CASE WHEN NOT s.commission_paid THEN s.commission_amount ELSE 0 END), 0) as pending_commission,
    COUNT(DISTINCT v.id) as total_visits,
    COUNT(DISTINCT f.id) as farmers_served
FROM public.tot_assignments ta
JOIN public.profiles p ON ta.tot_id = p.id
JOIN public.local_mrs lm ON ta.local_mr_id = lm.id
LEFT JOIN public.sales s ON ta.tot_id = s.tot_id AND s.payment_status != 'cancelled'
LEFT JOIN public.visits v ON ta.tot_id = v.tot_id
LEFT JOIN public.farmers f ON f.local_mr_id = ta.local_mr_id
WHERE ta.status = 'active'
GROUP BY ta.tot_id, p.name, ta.local_mr_id, lm.name;

-- Local MR performance view with SECURITY INVOKER
CREATE VIEW public.local_mr_performance
WITH (security_invoker = on)
AS
SELECT 
    lm.id as local_mr_id,
    lm.name as local_mr_name,
    lm.region,
    lm.county,
    COUNT(DISTINCT ta.tot_id) as total_tots,
    COUNT(DISTINCT f.id) as total_farmers,
    COUNT(DISTINCT s.id) as total_sales,
    COALESCE(SUM(s.total_amount), 0) as total_revenue,
    COALESCE(SUM(s.commission_amount), 0) as total_commission,
    COUNT(DISTINCT mj.id) as total_bookings,
    COUNT(DISTINCT t.id) as total_trainings,
    COUNT(DISTINCT v.id) as total_visits
FROM public.local_mrs lm
LEFT JOIN public.tot_assignments ta ON lm.id = ta.local_mr_id AND ta.status = 'active'
LEFT JOIN public.farmers f ON lm.id = f.local_mr_id
LEFT JOIN public.sales s ON lm.id = s.local_mr_id AND s.payment_status != 'cancelled'
LEFT JOIN public.mechanisation_jobs mj ON lm.id = mj.local_mr_id
LEFT JOIN public.trainings t ON lm.id = t.local_mr_id
LEFT JOIN public.visits v ON lm.id = v.local_mr_id
WHERE lm.status = 'active'
GROUP BY lm.id, lm.name, lm.region, lm.county;

-- Monthly trends view with SECURITY INVOKER
CREATE VIEW public.monthly_trends
WITH (security_invoker = on)
AS
SELECT 
    DATE_TRUNC('month', sale_date)::DATE as month,
    COUNT(*) as sales_count,
    SUM(total_amount) as revenue,
    SUM(commission_amount) as commission,
    COUNT(DISTINCT farmer_id) as farmers,
    COUNT(DISTINCT tot_id) as tots
FROM public.sales
WHERE payment_status != 'cancelled'
GROUP BY DATE_TRUNC('month', sale_date)
ORDER BY month DESC;