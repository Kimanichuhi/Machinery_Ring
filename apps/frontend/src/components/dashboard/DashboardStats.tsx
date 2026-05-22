// src/components/dashboard/DashboardStats.tsx
import { StatCard } from './StatCard';
import { Users, ShoppingCart, Tractor, TrendingUp } from 'lucide-react';
import { useAdminDashboard, AdminStats } from '@/hooks/api/useDashboard';

export function DashboardStats() {
  const { data: response, isLoading, error } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 bg-card rounded-2xl animate-pulse">
            <div className="h-8 bg-muted rounded w-32 mb-4" />
            <div className="h-10 bg-muted rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  const stats: AdminStats | undefined = response;

  if (error || !stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Failed to load dashboard stats. Please try again later.</p>
      </div>
    );
  }

  const formatKES = (amount: number) => `KES ${(amount / 1000).toFixed(0)}K`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Farmers"
        value={(stats.totalFarmers || 0).toLocaleString()}
        subtitle="Registered to date"
        icon={Users}
        trend={{ value: 18, isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Total Sales"
        value={formatKES(stats.totalRevenue || 0)}
        subtitle="This month"
        icon={ShoppingCart}
        trend={{ value: 12, isPositive: true }}
        variant="forest"
      />
      <StatCard
        title="Mechanisation Jobs"
        value={(stats.mechanisationJobs || 0).toLocaleString()}
        subtitle="This month"
        icon={Tractor}
        trend={{ value: 8, isPositive: true }}
        variant="wheat"
      />
      <StatCard
        title="Trainings Held"
        value={(stats.trainingsHeld || 0).toLocaleString()}
        subtitle="This month"
        icon={TrendingUp}
        trend={{ value: 5, isPositive: true }}
        variant="sage"
      />
    </div>
  );
}
