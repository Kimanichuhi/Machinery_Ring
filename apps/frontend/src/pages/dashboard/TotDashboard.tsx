// src/pages/dashboard/TotDashboard.tsx
import { 
  Users, 
  ShoppingCart, 
  Tractor, 
  MapPin, 
  GraduationCap, 
  TrendingUp,
  AlertCircle 
} from 'lucide-react';

import { StatCard } from '@/components/dashboard/StatCard';
import { GlobalRecentActivity } from '@/components/dashboard/GlobalRecentActivity';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { ProductChart } from '@/components/dashboard/ProductChart';
import { OverdueFollowUps } from '@/components/dashboard/OverdueFollowUps';

import { useSupabaseTotStats, TotStats } from '@/hooks/api/useSupabaseDashboard';
import { PerformanceSummary } from '@/components/dashboard/PerformanceSummary';
import { CommissionSummary } from '@/components/dashboard/CommissionSummary';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardRealtime, useFarmersRealtime } from '@/hooks/api/useDashboardRealtime';

export function TotDashboard() {
  // Enable realtime updates
  useDashboardRealtime();
  useFarmersRealtime();

  const { user } = useAuth();
  const totId = user?.id || '';

  const { 
    data: stats, 
    isLoading, 
    error 
  } = useSupabaseTotStats(totId);

  const formatCurrency = (value: number) => {
    if (!value) return 'KES 0K';
    if (value >= 1000000) return `KES ${(value / 1000000).toFixed(1)}M`;
    return `KES ${(value / 1000).toFixed(0)}K`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-2" />
          <div className="h-4 bg-muted rounded w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4 text-warning opacity-80" />
        <p className="text-lg">Failed to load your dashboard</p>
        <p className="text-sm mt-2">Please check your connection and try again</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            TOT Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Track your field operations and performance
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 stagger-children">
        <StatCard
          title="My Farmers"
          value={(stats.totalFarmers || 0).toLocaleString()}
          subtitle="Farmers served"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          variant="forest"
        />
        <StatCard
          title="Total Sales"
          value={(stats.totalSales || 0).toLocaleString()}
          subtitle="Transactions"
          icon={ShoppingCart}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats.totalRevenue || 0)}
          subtitle="From sales"
          icon={TrendingUp}
          variant="wheat"
        />
        <StatCard
          title="Mechanisation"
          value={(stats.mechanisationJobs || 0).toLocaleString()}
          subtitle="Jobs booked"
          icon={Tractor}
          trend={{ value: 15, isPositive: true }}
          href="/machinery"
        />
        <StatCard
          title="Farm Visits"
          value={(stats.visitsCompleted || 0).toLocaleString()}
          subtitle="Completed"
          icon={MapPin}
        />
        <StatCard
          title="Trainings"
          value={(stats.trainingsHeld || 0).toLocaleString()}
          subtitle="Sessions held"
          icon={GraduationCap}
          variant="earth"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          <SalesChart />
        </div>

        {/* Sidebar - No QuickActions for TOT (Admin only) */}
        <div className="flex flex-col gap-6">
          <ProductChart />
          <PerformanceSummary />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OverdueFollowUps totId={totId} showPending={true} limit={5} />
        <CommissionSummary />
        <GlobalRecentActivity />
      </div>
    </div>
  );
}
