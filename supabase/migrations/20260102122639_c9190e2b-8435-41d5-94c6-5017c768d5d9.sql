-- Migration: 20260102122639_c9190e2b-8435-41d5-94c6-5017c768d5d9.sql
--
-- ============================================================
-- AUDIT LOGGING TRIGGERS FOR SENSITIVE TABLES
-- Automatically tracks INSERT, UPDATE, DELETE on sensitive data
-- ============================================================

-- Generic audit trigger function for table changes
CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _old_data JSONB;
    _new_data JSONB;
    _entity_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        _old_data := to_jsonb(OLD);
        _new_data := NULL;
        _entity_id := OLD.id;
    ELSIF TG_OP = 'UPDATE' THEN
        _old_data := to_jsonb(OLD);
        _new_data := to_jsonb(NEW);
        _entity_id := NEW.id;
    ELSIF TG_OP = 'INSERT' THEN
        _old_data := NULL;
        _new_data := to_jsonb(NEW);
        _entity_id := NEW.id;
    END IF;

    PERFORM public.log_audit(
        TG_OP,
        TG_TABLE_NAME,
        _entity_id,
        _old_data,
        _new_data
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- FARMERS table audit triggers
CREATE TRIGGER audit_farmers_insert
    AFTER INSERT ON public.farmers
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_farmers_update
    AFTER UPDATE ON public.farmers
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_farmers_delete
    AFTER DELETE ON public.farmers
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- PROFILES table audit triggers
CREATE TRIGGER audit_profiles_insert
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_profiles_update
    AFTER UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_profiles_delete
    AFTER DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- SALES table audit triggers
CREATE TRIGGER audit_sales_insert
    AFTER INSERT ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_sales_update
    AFTER UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_sales_delete
    AFTER DELETE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- COMMISSION_PAYOUTS table audit triggers
CREATE TRIGGER audit_commission_payouts_insert
    AFTER INSERT ON public.commission_payouts
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_commission_payouts_update
    AFTER UPDATE ON public.commission_payouts
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_commission_payouts_delete
    AFTER DELETE ON public.commission_payouts
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- USER_ROLES table audit triggers (critical for privilege escalation detection)
CREATE TRIGGER audit_user_roles_insert
    AFTER INSERT ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_user_roles_update
    AFTER UPDATE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_user_roles_delete
    AFTER DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();