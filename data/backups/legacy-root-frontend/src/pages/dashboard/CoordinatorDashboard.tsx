// src/pages/dashboard/CoordinatorDashboard.tsx
import { 
  Users, ShoppingCart, Tractor, 
  GraduationCap, TrendingUp, UserCheck, Eye, MapPin, Building2
} from 'lucide-react';

import { StatCard } from '@/components/dashboard/StatCard';
import { GlobalRecentActivity } from '@/components/dashboard/GlobalRecentActivity';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { ProductChart } from '@/components/dashboard/ProductChart';
import { TopPerformers } from '@/components/dashboard/TopPerformers';
import { TOTPerformanceOverview } from '@/components/dashboard/TOTPerformanceOverview';
import { OverdueFollowUps } from '@/components/dashboard/OverdueFollowUps';
import { PerformanceSummary } from '@/components/dashboard/PerformanceSummary';

import { useAuth } from '@/contexts/AuthContext';
import { useDashboardRealtime, useFarmersRealtime, useMechanisationRealtime } from '@/hooks/api/useDashboardRealtime';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CoordinatorStats {
  totalFarmers: number;
  totalTots: number;
  activeTots: number;
  totalSales: number;
  totalRevenue: number;
  completedJobs: number;
  totalTrainings: number;
  totalVisits: number;
  localMrName: string;
  localMrId: string | null;
}

// Hook to fetch coordinator-specific stats (only their assigned MR)
function useCoordinatorStats(userId: string) {
  return useQuery({
    queryKey: ['coordinator-stats', userId],
    queryFn: async (): Promise<CoordinatorStats> => {
      // Get the Local MR assigned to this coordinator
      const { data: localMr, error: mrError } = await supabase
        .from('local_mrs')
        .select('id, name')
        .eq('coordinator_id', userId)
        .single();

      if (mrError || !localMr) {
        console.error('Error fetching coordinator local MR:', mrError);
        return {
          totalFarmers: 0,
          totalTots: 0,
          activeTots: 0,
          totalSales: 0,
          totalRevenue: 0,
          completedJobs: 0,
          totalTrainings: 0,
          totalVisits: 0,
          localMrName: 'Not Assigned',
          localMrId: null,
        };
      }

      const localMrId = localMr.id;

      // Fetch stats for this specific MR only
      const [farmersResult, totsResult, salesResult, bookingsResult, trainingsResult, visitsResult] = await Promise.all([
        supabase.from('farmers').select('id', { count: 'exact', head: true }).eq('local_mr_id', localMrId),
        supabase.from('tot_assignments').select('id, status', { count: 'exact' }).eq('local_mr_id', localMrId),
        supabase.from('sales').select('id, total_amount', { count: 'exact' }).eq('local_mr_id', localMrId),
        supabase.from('machinery_bookings').select('id, status', { count: 'exact' }).eq('local_mr_id', localMrId),
        supabase.from('trainings').select('id', { count: 'exact', head: true }).eq('local_mr_id', localMrId),
        supabase.from('visits').select('id', { count: 'exact', head: true }).eq('local_mr_id', localMrId),
      ]);

      const totalRevenue = salesResult.data?.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) || 0;
      const activeTots = totsResult.data?.filter(t => t.status === 'active').length || 0;
      const completedBookings = bookingsResult.data?.filter(b => b.status === 'completed').length || 0;

      return {
        totalFarmers: farmersResult.count || 0,
        totalTots: totsResult.count || 0,
        activeTots,
        totalSales: salesResult.count || 0,
        totalRevenue,
        completedJobs: completedBookings,
        totalTrainings: trainingsResult.count || 0,
        totalVisits: visitsResult.count || 0,
        localMrName: localMr.name,
        localMrId: localMr.id,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 3,
  });
}

// Hook to fetch TOTs for this coordinator's MR with full performance metrics
function useCoordinatorTots(userId: string) {
  return useQuery({
    queryKey: ['coordinator-tots', userId],
    queryFn: async () => {
      // Get the Local MR assigned to this coordinator
      const { data: localMr } = await supabase
        .from('local_mrs')
        .select('id, name')
        .eq('coordinator_id', userId)
        .single();

      if (!localMr) return [];

      const localMrId = localMr.id;

      // Get TOT assignments for this MR
      const { data: assignments } = await supabase
        .from('tot_assignments')
        .select('tot_id, status')
        .eq('local_mr_id', localMrId);

      if (!assignments || assignments.length === 0) return [];

      // Get profile info for these TOTs
      const totIds = assignments.map(a => a.tot_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, phone, status')
        .in('id', totIds);

      // Fetch sales for this MR's TOTs
      const { data: sales } = await supabase
        .from('sales')
        .select('tot_id, total_amount, commission_amount, sale_date')
        .eq('local_mr_id', localMrId);

      // Fetch bookings for this MR's TOTs (use tot_id, not booked_by)
      const { data: bookings } = await supabase
        .from('machinery_bookings')
        .select('tot_id, status, start_date')
        .eq('local_mr_id', localMrId);

      // Fetch trainings for this MR
      const { data: trainings } = await supabase
        .from('trainings')
        .select('id, trainer_id, status, scheduled_date')
        .eq('local_mr_id', localMrId);

      // Fetch training attendees (TOTs as participants)
      const trainingIds = (trainings || []).map(t => t.id);
      const { data: trainingAttendees } = trainingIds.length > 0 
        ? await supabase
            .from('training_attendees')
            .select('training_id, profile_id')
            .in('training_id', trainingIds)
            .not('profile_id', 'is', null)
        : { data: [] };

      // Fetch visits for this MR's TOTs
      const { data: visits } = await supabase
        .from('visits')
        .select('tot_id, profile_id, visit_date')
        .eq('local_mr_id', localMrId);

      // Aggregate sales metrics per TOT
      const totSalesMap = new Map<string, { count: number; revenue: number; commission: number; lastSaleDate: string | null }>();
      (sales || []).forEach((s) => {
        if (!totIds.includes(s.tot_id)) return;
        const existing = totSalesMap.get(s.tot_id) || { count: 0, revenue: 0, commission: 0, lastSaleDate: null };
        existing.count += 1;
        existing.revenue += Number(s.total_amount) || 0;
        existing.commission += Number(s.commission_amount) || 0;
        if (!existing.lastSaleDate || s.sale_date > existing.lastSaleDate) {
          existing.lastSaleDate = s.sale_date;
        }
        totSalesMap.set(s.tot_id, existing);
      });

      // Aggregate bookings per TOT (use tot_id)
      const totJobsMap = new Map<string, { count: number; completedCount: number; lastJobDate: string | null }>();
      (bookings || []).forEach((b) => {
        if (!b.tot_id || !totIds.includes(b.tot_id)) return;
        const existing = totJobsMap.get(b.tot_id) || { count: 0, completedCount: 0, lastJobDate: null };
        existing.count += 1;
        if (b.status === 'completed') existing.completedCount += 1;
        if (!existing.lastJobDate || b.start_date > existing.lastJobDate) {
          existing.lastJobDate = b.start_date;
        }
        totJobsMap.set(b.tot_id, existing);
      });

      // Build a map of training details for attendee lookups
      const trainingDetailsMap = new Map<string, { status: string; scheduled_date: string }>();
      (trainings || []).forEach((t) => {
        trainingDetailsMap.set(t.id, { status: t.status || '', scheduled_date: t.scheduled_date || '' });
      });

      // Aggregate trainings per TOT (trainer_id and as attendee via profile_id)
      const totTrainingsMap = new Map<string, { count: number; completedCount: number; lastTrainingDate: string | null }>();
      
      // As trainer
      (trainings || []).forEach((t) => {
        if (!totIds.includes(t.trainer_id)) return;
        const existing = totTrainingsMap.get(t.trainer_id) || { count: 0, completedCount: 0, lastTrainingDate: null };
        existing.count += 1;
        if (t.status === 'completed') existing.completedCount += 1;
        if (!existing.lastTrainingDate || t.scheduled_date > existing.lastTrainingDate) {
          existing.lastTrainingDate = t.scheduled_date;
        }
        totTrainingsMap.set(t.trainer_id, existing);
      });
      
      // As attendee
      (trainingAttendees || []).forEach((a: any) => {
        if (!a.profile_id || !totIds.includes(a.profile_id)) return;
        const existing = totTrainingsMap.get(a.profile_id) || { count: 0, completedCount: 0, lastTrainingDate: null };
        existing.count += 1;
        const trainingDetails = trainingDetailsMap.get(a.training_id);
        if (trainingDetails?.status === 'completed') existing.completedCount += 1;
        if (trainingDetails?.scheduled_date && (!existing.lastTrainingDate || trainingDetails.scheduled_date > existing.lastTrainingDate)) {
          existing.lastTrainingDate = trainingDetails.scheduled_date;
        }
        totTrainingsMap.set(a.profile_id, existing);
      });

      // Aggregate visits per TOT (tot_id and profile_id)
      const totVisitsMap = new Map<string, { count: number; lastVisitDate: string | null }>();
      (visits || []).forEach((v) => {
        // Count visits where TOT is creator
        if (v.tot_id && totIds.includes(v.tot_id)) {
          const existing = totVisitsMap.get(v.tot_id) || { count: 0, lastVisitDate: null };
          existing.count += 1;
          if (!existing.lastVisitDate || v.visit_date > existing.lastVisitDate) {
            existing.lastVisitDate = v.visit_date;
          }
          totVisitsMap.set(v.tot_id, existing);
        }
        // Count visits where TOT is participant
        if (v.profile_id && totIds.includes(v.profile_id)) {
          const existing = totVisitsMap.get(v.profile_id) || { count: 0, lastVisitDate: null };
          existing.count += 1;
          if (!existing.lastVisitDate || v.visit_date > existing.lastVisitDate) {
            existing.lastVisitDate = v.visit_date;
          }
          totVisitsMap.set(v.profile_id, existing);
        }
      });

      return (profiles || []).map(p => {
        const assignment = assignments.find(a => a.tot_id === p.id);
        const salesData = totSalesMap.get(p.id);
        const jobsData = totJobsMap.get(p.id);
        const trainingsData = totTrainingsMap.get(p.id);
        const visitsData = totVisitsMap.get(p.id);

        // Calculate last activity date
        const activityDates = [
          salesData?.lastSaleDate,
          jobsData?.lastJobDate,
          trainingsData?.lastTrainingDate,
          visitsData?.lastVisitDate,
        ].filter(Boolean) as string[];
        
        const lastActivityDate = activityDates.length > 0 
          ? activityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          : null;

        return {
          id: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone || '',
          role: 'tot' as const,
          status: assignment?.status || p.status,
          createdAt: new Date().toISOString(),
          localMrId: localMrId,
          localMrName: localMr.name,
          salesCount: salesData?.count || 0,
          totalRevenue: salesData?.revenue || 0,
          totalCommission: salesData?.commission || 0,
          jobsCount: jobsData?.count || 0,
          completedJobsCount: jobsData?.completedCount || 0,
          trainingsCount: trainingsData?.count || 0,
          completedTrainingsCount: trainingsData?.completedCount || 0,
          visitsCount: visitsData?.count || 0,
          lastActivityDate,
        };
      });
    },
    enabled: !!userId,
  });
}

// Hook to fetch sales for this coordinator's MR (with full data for TOT performance)
function useCoordinatorSales(userId: string) {
  return useQuery({
    queryKey: ['coordinator-sales', userId],
    queryFn: async () => {
      const { data: localMr } = await supabase
        .from('local_mrs')
        .select('id')
        .eq('coordinator_id', userId)
        .single();

      if (!localMr) return [];

      const { data: sales } = await supabase
        .from('sales')
        .select(`
          id, local_mr_id, total_amount, payment_status, sale_date, 
          commission_amount, tot_id, farmer_id, product_id, quantity, unit_price,
          products(name)
        `)
        .eq('local_mr_id', localMr.id)
        .order('sale_date', { ascending: false });

      return (sales || []).map(s => ({
        id: s.id,
        localMrId: s.local_mr_id,
        total: Number(s.total_amount) || 0,
        status: s.payment_status || 'pending',
        date: s.sale_date,
        commissionAmount: Number(s.commission_amount) || 0,
        totId: s.tot_id,
        farmerId: s.farmer_id,
        productId: s.product_id,
        productName: (s.products as any)?.name || 'Unknown',
        quantity: s.quantity,
        unitPrice: Number(s.unit_price) || 0,
      }));
    },
    enabled: !!userId,
  });
}

export function CoordinatorDashboard() {
  const { user } = useAuth();
  const userId = user?.id || '';

  // Enable realtime updates
  useDashboardRealtime();
  useFarmersRealtime();
  useMechanisationRealtime();

  const { data: stats, isLoading: statsLoading } = useCoordinatorStats(userId);
  const { data: tots = [], isLoading: totsLoading } = useCoordinatorTots(userId);
  const { data: sales = [], isLoading: salesLoading } = useCoordinatorSales(userId);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `KES ${(value / 1000000).toFixed(1)}M`;
    return `KES ${(value / 1000).toFixed(0)}K`;
  };

  const isLoading = statsLoading || totsLoading || salesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-2" />
          <div className="h-4 bg-muted rounded w-96" />
        </div>
        <div className="grid grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-32 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // TOTs already have full metrics from the updated hook
  const totsForOverview = tots;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Coordinator Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {stats?.localMrName || 'Local MR'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            <Eye className="w-4 h-4 mr-1" />
            Read-Only View
          </Badge>
        </div>
      </div>

      {/* Stats Grid - MR-specific KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 stagger-children">
        <StatCard
          title="Total Farmers"
          value={stats?.totalFarmers || 0}
          subtitle="In your MR"
          icon={Users}
          variant="forest"
        />
        <StatCard
          title="Total TOTs"
          value={stats?.totalTots || 0}
          subtitle={`${stats?.activeTots || 0} active`}
          icon={UserCheck}
        />
        <StatCard
          title="Total Sales"
          value={stats?.totalSales || 0}
          subtitle="Transactions"
          icon={ShoppingCart}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          subtitle="From sales"
          icon={TrendingUp}
          variant="wheat"
        />
        <StatCard
          title="Mechanisation"
          value={stats?.completedJobs || 0}
          subtitle="Jobs completed"
          icon={Tractor}
          href="/machinery"
        />
        <StatCard
          title="Trainings"
          value={stats?.totalTrainings || 0}
          subtitle="Sessions held"
          icon={GraduationCap}
          variant="earth"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SalesChart />
          <TOTPerformanceOverview 
            tots={totsForOverview}
            localMRs={[]}
            sales={sales as any}
          />
        </div>

        {/* Side Column */}
        <div className="space-y-6">
          <PerformanceSummary />
          <OverdueFollowUps localMrId={stats?.localMrId || undefined} limit={5} />
          <TopPerformers type="tots" />
          <TopPerformers type="farmers" />
          <ProductChart />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlobalRecentActivity />
      </div>
    </div>
  );
}
