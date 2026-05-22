-- Migration: 20260508203731_be84efe3-126a-417e-a87e-e747ae39fbe3.sql
--
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS delivery_note_number TEXT;
CREATE INDEX IF NOT EXISTS idx_sales_delivery_note ON public.sales(delivery_note_number);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date);