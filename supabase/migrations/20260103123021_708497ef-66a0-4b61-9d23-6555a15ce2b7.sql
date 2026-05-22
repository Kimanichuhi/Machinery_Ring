-- Migration: 20260103123021_708497ef-66a0-4b61-9d23-6555a15ce2b7.sql
--
-- Create function to auto-deduct stock on sale creation
CREATE OR REPLACE FUNCTION public.deduct_stock_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO current_stock
  FROM products
  WHERE id = NEW.product_id;
  
  -- Check if sufficient stock available
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', current_stock, NEW.quantity;
  END IF;
  
  -- Deduct stock
  UPDATE products
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to deduct stock after sale is inserted
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_sale ON public.sales;
CREATE TRIGGER trigger_deduct_stock_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_stock_on_sale();

-- Create function to restore stock on sale deletion
CREATE OR REPLACE FUNCTION public.restore_stock_on_sale_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Restore stock when sale is deleted
  UPDATE products
  SET stock_quantity = stock_quantity + OLD.quantity,
      updated_at = NOW()
  WHERE id = OLD.product_id;
  
  RETURN OLD;
END;
$$;

-- Create trigger to restore stock when sale is deleted
DROP TRIGGER IF EXISTS trigger_restore_stock_on_sale_delete ON public.sales;
CREATE TRIGGER trigger_restore_stock_on_sale_delete
  BEFORE DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_sale_delete();