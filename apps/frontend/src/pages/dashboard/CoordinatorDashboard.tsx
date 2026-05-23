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
import { fetchCoordinatorStats, fetchCoordinatorTots, fetchCoordinatorSales } from '@/lib/supabase/dashboardQueries';
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
    queryFn: () => fetchCoordinatorStats(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 3,
  });
}

// Hook to fetch TOTs for this coordinator's MR with full performance metrics
function useCoordinatorTots(userId: string) {
  return useQuery({
    queryKey: ['coordinator-tots', userId],
    queryFn: () => fetchCoordinatorTots(userId),
    enabled: !!userId,
  });
}

// Hook to fetch sales for this coordinator's MR (with full data for TOT performance)
function useCoordinatorSales(userId: string) {
  return useQuery({
    queryKey: ['coordinator-sales', userId],
    queryFn: () => fetchCoordinatorSales(userId),
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
