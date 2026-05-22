-- Migration: 20260102102340_c8857891-63bb-47e6-a00c-a3f9313c9f44.sql
--
-- Create machinery bookings table
CREATE TABLE public.machinery_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machinery_id UUID NOT NULL REFERENCES public.machinery(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL,
  mechanisation_job_id UUID REFERENCES public.mechanisation_jobs(id) ON DELETE SET NULL,
  booked_by UUID NOT NULL,
  local_mr_id UUID REFERENCES public.local_mrs(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create machinery service history table
CREATE TABLE public.machinery_service_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machinery_id UUID NOT NULL REFERENCES public.machinery(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('routine', 'repair', 'inspection', 'overhaul')),
  service_date DATE NOT NULL,
  description TEXT NOT NULL,
  cost NUMERIC(12,2) DEFAULT 0,
  performed_by TEXT,
  next_service_date DATE,
  odometer_reading NUMERIC,
  parts_replaced TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.machinery_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machinery_service_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for machinery_bookings
CREATE POLICY "Admins can manage bookings" ON public.machinery_bookings
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all bookings" ON public.machinery_bookings
FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Coordinators can view their local_mr bookings" ON public.machinery_bookings
FOR SELECT USING (is_coordinator_of(auth.uid(), local_mr_id));

CREATE POLICY "TOTs can view bookings in their local_mr" ON public.machinery_bookings
FOR SELECT USING (local_mr_id = get_user_local_mr_id(auth.uid()));

-- RLS policies for machinery_service_history
CREATE POLICY "Admins can manage service history" ON public.machinery_service_history
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view service history" ON public.machinery_service_history
FOR SELECT USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_machinery_bookings_updated_at
BEFORE UPDATE ON public.machinery_bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machinery_service_history_updated_at
BEFORE UPDATE ON public.machinery_service_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_machinery_bookings_machinery_id ON public.machinery_bookings(machinery_id);
CREATE INDEX idx_machinery_bookings_farmer_id ON public.machinery_bookings(farmer_id);
CREATE INDEX idx_machinery_bookings_dates ON public.machinery_bookings(start_date, end_date);
CREATE INDEX idx_machinery_bookings_status ON public.machinery_bookings(status);
CREATE INDEX idx_machinery_service_history_machinery_id ON public.machinery_service_history(machinery_id);
CREATE INDEX idx_machinery_service_history_next_service ON public.machinery_service_history(next_service_date);

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.machinery_bookings;