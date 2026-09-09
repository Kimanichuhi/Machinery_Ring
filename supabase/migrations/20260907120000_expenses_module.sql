-- Migration: 20260907120000_expenses_module.sql
--
-- ============================================================
-- EXPENSES MODULE
-- Tracks every operational expense. Only admins and managers
-- may view, record, or edit expenses; every change is captured
-- in audit_logs via the existing generic audit trigger.
-- ============================================================

CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'cash',
    vendor TEXT,
    local_mr_id UUID REFERENCES public.local_mrs(id),
    recorded_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
    status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'voided')),
    notes TEXT,
    expense_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.expenses IS 'Every operational expense recorded by a manager or admin.';

-- Keep updated_at current, same helper used by every other table
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track every single expense change (insert/update/delete) in audit_logs
CREATE TRIGGER audit_expenses_insert
    AFTER INSERT ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_expenses_update
    AFTER UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_expenses_delete
    AFTER DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date DESC);
CREATE INDEX idx_expenses_local_mr_id ON public.expenses(local_mr_id);
CREATE INDEX idx_expenses_recorded_by ON public.expenses(recorded_by);
CREATE INDEX idx_expenses_category ON public.expenses(category);

-- ============================================================
-- ROW LEVEL SECURITY
-- Only admin and manager roles may touch this table at all.
-- ============================================================

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view expenses" ON public.expenses FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins and managers can record expenses" ON public.expenses FOR INSERT WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
    AND recorded_by = auth.uid()
);

CREATE POLICY "Admins and managers can update expenses" ON public.expenses FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

-- Hard delete is restricted to admins, and only once an expense has been voided,
-- so a wrong entry is always corrected via voiding first, preserving the audit trail.
CREATE POLICY "Admins can delete voided expenses" ON public.expenses FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') AND status = 'voided'
);

CREATE POLICY "Deny anon access to expenses"
ON public.expenses AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);
