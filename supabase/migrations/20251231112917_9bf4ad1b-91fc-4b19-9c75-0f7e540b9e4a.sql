-- Migration: 20251231112917_9bf4ad1b-91fc-4b19-9c75-0f7e540b9e4a.sql
--
-- =============================================
-- MACHINERY RING NYANDARUA OPERATIONS DASHBOARD
-- Complete Database Schema with RLS
-- =============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'local_mr_coordinator', 'tot');

-- 2. User Roles Table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'tot',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Local MRs Table
CREATE TABLE public.local_mrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    county TEXT NOT NULL,
    sub_county TEXT,
    ward TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    coordinator_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TOT Assignments (links TOTs to Local MRs)
CREATE TABLE public.tot_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tot_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    local_mr_id UUID REFERENCES public.local_mrs(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active',
    UNIQUE (tot_id, local_mr_id)
);

-- 6. Products Table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    commission_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER NOT NULL DEFAULT 10,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Farmers Table
CREATE TABLE public.farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    id_number TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE,
    county TEXT NOT NULL,
    sub_county TEXT,
    ward TEXT,
    village TEXT,
    farm_size NUMERIC(10,2),
    farming_type TEXT,
    crops TEXT[],
    livestock TEXT[],
    local_mr_id UUID REFERENCES public.local_mrs(id),
    registered_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
    visits_count INTEGER NOT NULL DEFAULT 0,
    trainings_attended INTEGER NOT NULL DEFAULT 0,
    last_activity_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Sales Table (commission calculated once via trigger)
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES public.farmers(id) NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    tot_id UUID REFERENCES auth.users(id) NOT NULL,
    local_mr_id UUID REFERENCES public.local_mrs(id) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    commission_per_unit NUMERIC(12,2) NOT NULL,
    commission_amount NUMERIC(12,2) NOT NULL,
    commission_paid BOOLEAN NOT NULL DEFAULT false,
    commission_paid_at TIMESTAMPTZ,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    sale_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Machinery Table
CREATE TABLE public.machinery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    model TEXT,
    registration_number TEXT,
    local_mr_id UUID REFERENCES public.local_mrs(id),
    hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    daily_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
    condition TEXT DEFAULT 'good',
    last_service_date DATE,
    next_service_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Mechanisation Jobs (Bookings)
CREATE TABLE public.mechanisation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES public.farmers(id) NOT NULL,
    machinery_id UUID REFERENCES public.machinery(id) NOT NULL,
    tot_id UUID REFERENCES auth.users(id) NOT NULL,
    local_mr_id UUID REFERENCES public.local_mrs(id) NOT NULL,
    service_type TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    duration_hours NUMERIC(6,2),
    area_acres NUMERIC(10,2),
    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    completion_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Trainings Table
CREATE TABLE public.trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    training_type TEXT NOT NULL,
    trainer_id UUID REFERENCES auth.users(id) NOT NULL,
    local_mr_id UUID REFERENCES public.local_mrs(id),
    venue TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    duration_hours NUMERIC(6,2),
    max_attendees INTEGER,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Training Attendees (Junction table)
CREATE TABLE public.training_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE NOT NULL,
    farmer_id UUID REFERENCES public.farmers(id) ON DELETE CASCADE NOT NULL,
    attended BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (training_id, farmer_id)
);

-- 13. Visits Table
CREATE TABLE public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES public.farmers(id) NOT NULL,
    tot_id UUID REFERENCES auth.users(id) NOT NULL,
    local_mr_id UUID REFERENCES public.local_mrs(id),
    purpose TEXT NOT NULL,
    notes TEXT,
    follow_up_required BOOLEAN NOT NULL DEFAULT false,
    follow_up_date DATE,
    visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Commission Payouts Table
CREATE TABLE public.commission_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tot_id UUID REFERENCES auth.users(id) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    sales_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    actor_role TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    before_data JSONB,
    after_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    local_mr_id UUID REFERENCES public.local_mrs(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to get user's local_mr_id
CREATE OR REPLACE FUNCTION public.get_user_local_mr_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT local_mr_id FROM public.tot_assignments 
    WHERE tot_id = _user_id AND status = 'active' 
    LIMIT 1
$$;

-- Function to check if user is coordinator of a local MR
CREATE OR REPLACE FUNCTION public.is_coordinator_of(_user_id UUID, _local_mr_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.local_mrs
        WHERE id = _local_mr_id AND coordinator_id = _user_id
    )
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_local_mrs_updated_at BEFORE UPDATE ON public.local_mrs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON public.farmers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_machinery_updated_at BEFORE UPDATE ON public.machinery FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mechanisation_jobs_updated_at BEFORE UPDATE ON public.mechanisation_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commission_payouts_updated_at BEFORE UPDATE ON public.commission_payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Calculate commission on sale insert (IMMUTABLE - never recalculated)
CREATE OR REPLACE FUNCTION public.calculate_sale_commission()
RETURNS TRIGGER AS $$
DECLARE
    product_commission NUMERIC(12,2);
    product_price NUMERIC(12,2);
BEGIN
    -- Get product commission and price at time of sale
    SELECT commission_per_unit, unit_price INTO product_commission, product_price
    FROM public.products WHERE id = NEW.product_id;
    
    -- Set immutable commission values
    NEW.commission_per_unit := product_commission;
    NEW.unit_price := product_price;
    NEW.total_amount := NEW.quantity * product_price;
    NEW.commission_amount := NEW.quantity * product_commission;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER calculate_sale_commission_trigger
    BEFORE INSERT ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.calculate_sale_commission();

-- Prevent commission recalculation on update
CREATE OR REPLACE FUNCTION public.prevent_commission_recalculation()
RETURNS TRIGGER AS $$
BEGIN
    -- Keep original commission values
    NEW.commission_per_unit := OLD.commission_per_unit;
    NEW.commission_amount := OLD.commission_amount;
    NEW.total_amount := OLD.total_amount;
    NEW.unit_price := OLD.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER prevent_commission_recalculation_trigger
    BEFORE UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.prevent_commission_recalculation();

-- Update farmer visit count
CREATE OR REPLACE FUNCTION public.update_farmer_visit_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.farmers SET 
            visits_count = visits_count + 1,
            last_activity_date = now()
        WHERE id = NEW.farmer_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.farmers SET visits_count = visits_count - 1 WHERE id = OLD.farmer_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_farmer_visit_count_trigger
    AFTER INSERT OR DELETE ON public.visits
    FOR EACH ROW EXECUTE FUNCTION public.update_farmer_visit_count();

-- Update farmer training count
CREATE OR REPLACE FUNCTION public.update_farmer_training_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.farmers SET trainings_attended = trainings_attended + 1 WHERE id = NEW.farmer_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.farmers SET trainings_attended = trainings_attended - 1 WHERE id = OLD.farmer_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_farmer_training_count_trigger
    AFTER INSERT OR DELETE ON public.training_attendees
    FOR EACH ROW EXECUTE FUNCTION public.update_farmer_training_count();

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Audit logging function
CREATE OR REPLACE FUNCTION public.log_audit(
    _action TEXT,
    _entity TEXT,
    _entity_id UUID,
    _before_data JSONB DEFAULT NULL,
    _after_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _audit_id UUID;
    _actor_role TEXT;
BEGIN
    SELECT role::TEXT INTO _actor_role FROM public.user_roles WHERE user_id = auth.uid();
    
    INSERT INTO public.audit_logs (actor_id, actor_role, action, entity, entity_id, before_data, after_data)
    VALUES (auth.uid(), _actor_role, _action, _entity, _entity_id, _before_data, _after_data)
    RETURNING id INTO _audit_id;
    
    RETURN _audit_id;
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_mrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tot_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machinery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanisation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- USER_ROLES policies
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- LOCAL_MRS policies
CREATE POLICY "Authenticated can view local_mrs" ON public.local_mrs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage local_mrs" ON public.local_mrs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- TOT_ASSIGNMENTS policies
CREATE POLICY "Users can view own assignment" ON public.tot_assignments FOR SELECT USING (auth.uid() = tot_id);
CREATE POLICY "Admins and managers can view all" ON public.tot_assignments FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Coordinators can view their local_mr" ON public.tot_assignments FOR SELECT USING (
    public.is_coordinator_of(auth.uid(), local_mr_id)
);
CREATE POLICY "Admins can manage assignments" ON public.tot_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PRODUCTS policies
CREATE POLICY "Authenticated can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- FARMERS policies (scoped by role)
CREATE POLICY "Admins and managers can view all farmers" ON public.farmers FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Coordinators can view their local_mr farmers" ON public.farmers FOR SELECT USING (
    public.is_coordinator_of(auth.uid(), local_mr_id)
);
CREATE POLICY "TOTs can view farmers in their local_mr" ON public.farmers FOR SELECT USING (
    local_mr_id = public.get_user_local_mr_id(auth.uid())
);
CREATE POLICY "Admins can manage farmers" ON public.farmers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SALES policies
CREATE POLICY "Admins and managers can view all sales" ON public.sales FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Coordinators can view their local_mr sales" ON public.sales FOR SELECT USING (
    public.is_coordinator_of(auth.uid(), local_mr_id)
);
CREATE POLICY "TOTs can view own sales" ON public.sales FOR SELECT USING (auth.uid() = tot_id);
CREATE POLICY "Admins can manage sales" ON public.sales FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- MACHINERY policies
CREATE POLICY "Authenticated can view machinery" ON public.machinery FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage machinery" ON public.machinery FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- MECHANISATION_JOBS policies
CREATE POLICY "Admins and managers can view all jobs" ON public.mechanisation_jobs FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Coordinators can view their local_mr jobs" ON public.mechanisation_jobs FOR SELECT USING (
    public.is_coordinator_of(auth.uid(), local_mr_id)
);
CREATE POLICY "TOTs can view own jobs" ON public.mechanisation_jobs FOR SELECT USING (auth.uid() = tot_id);
CREATE POLICY "Admins can manage jobs" ON public.mechanisation_jobs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- TRAININGS policies
CREATE POLICY "Authenticated can view trainings" ON public.trainings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage trainings" ON public.trainings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- TRAINING_ATTENDEES policies
CREATE POLICY "Authenticated can view attendees" ON public.training_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage attendees" ON public.training_attendees FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- VISITS policies
CREATE POLICY "Admins and managers can view all visits" ON public.visits FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Coordinators can view their local_mr visits" ON public.visits FOR SELECT USING (
    public.is_coordinator_of(auth.uid(), local_mr_id)
);
CREATE POLICY "TOTs can view own visits" ON public.visits FOR SELECT USING (auth.uid() = tot_id);
CREATE POLICY "TOTs can create visits" ON public.visits FOR INSERT WITH CHECK (auth.uid() = tot_id);
CREATE POLICY "Admins can manage visits" ON public.visits FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- COMMISSION_PAYOUTS policies
CREATE POLICY "Admins and managers can view all payouts" ON public.commission_payouts FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "TOTs can view own payouts" ON public.commission_payouts FOR SELECT USING (auth.uid() = tot_id);
CREATE POLICY "Admins can manage payouts" ON public.commission_payouts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- AUDIT_LOGS policies
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

-- NOTIFICATIONS policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- REPORTING VIEWS
-- =============================================

-- Sales summary view
CREATE OR REPLACE VIEW public.sales_summary AS
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

-- TOT performance view
CREATE OR REPLACE VIEW public.tot_performance AS
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

-- Local MR performance view
CREATE OR REPLACE VIEW public.local_mr_performance AS
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

-- Monthly trends view
CREATE OR REPLACE VIEW public.monthly_trends AS
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

-- Create indexes for performance
CREATE INDEX idx_sales_tot_id ON public.sales(tot_id);
CREATE INDEX idx_sales_local_mr_id ON public.sales(local_mr_id);
CREATE INDEX idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX idx_farmers_local_mr_id ON public.farmers(local_mr_id);
CREATE INDEX idx_visits_tot_id ON public.visits(tot_id);
CREATE INDEX idx_visits_farmer_id ON public.visits(farmer_id);
CREATE INDEX idx_mechanisation_jobs_local_mr_id ON public.mechanisation_jobs(local_mr_id);
CREATE INDEX idx_tot_assignments_local_mr_id ON public.tot_assignments(local_mr_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);