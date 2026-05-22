-- Migration: 20260102095317_c108b147-759e-4692-bb0d-127a7c58e669.sql
--
-- Enable realtime for products table
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;