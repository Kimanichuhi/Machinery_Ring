-- Migration: 20260121083837_3565577a-7e63-4abf-abc2-4eceadc5b0bd.sql
--
-- Fix: Reduce exposure of highly sensitive farmer PII by moving it out of the main farmers table.
-- Strategy:
-- 1) Create a new RLS-protected table for highly sensitive fields
-- 2) Backfill existing data
-- 3) Drop sensitive columns from public.farmers

BEGIN;

-- 1) New private table for highly sensitive PII
CREATE TABLE IF NOT EXISTS public.farmer_private_data (
  farmer_id UUID PRIMARY KEY REFERENCES public.farmers(id) ON DELETE CASCADE,
  id_number TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.farmer_private_data ENABLE ROW LEVEL SECURITY;

-- Only admins/managers can read/write private data.
-- (Coordinators/TOTs are intentionally excluded.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'farmer_private_data'
      AND policyname = 'Admins and managers can view farmer private data'
  ) THEN
    CREATE POLICY "Admins and managers can view farmer private data"
    ON public.farmer_private_data
    FOR SELECT
    USING (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'farmer_private_data'
      AND policyname = 'Admins and managers can manage farmer private data'
  ) THEN
    CREATE POLICY "Admins and managers can manage farmer private data"
    ON public.farmer_private_data
    FOR ALL
    USING (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
    WITH CHECK (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    );
  END IF;
END $$;

-- Maintain updated_at
DROP TRIGGER IF EXISTS trg_farmer_private_data_updated_at ON public.farmer_private_data;
CREATE TRIGGER trg_farmer_private_data_updated_at
BEFORE UPDATE ON public.farmer_private_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Backfill existing data from public.farmers (if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='farmers' AND column_name='id_number'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='farmers' AND column_name='date_of_birth'
  ) THEN
    INSERT INTO public.farmer_private_data (farmer_id, id_number, date_of_birth)
    SELECT f.id, f.id_number, f.date_of_birth
    FROM public.farmers f
    WHERE f.id_number IS NOT NULL OR f.date_of_birth IS NOT NULL
    ON CONFLICT (farmer_id)
    DO UPDATE SET
      id_number = EXCLUDED.id_number,
      date_of_birth = EXCLUDED.date_of_birth,
      updated_at = now();
  END IF;
END $$;

-- 3) Drop highly sensitive columns from public.farmers to prevent broad access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='farmers' AND column_name='id_number'
  ) THEN
    ALTER TABLE public.farmers DROP COLUMN id_number;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='farmers' AND column_name='date_of_birth'
  ) THEN
    ALTER TABLE public.farmers DROP COLUMN date_of_birth;
  END IF;
END $$;

COMMIT;