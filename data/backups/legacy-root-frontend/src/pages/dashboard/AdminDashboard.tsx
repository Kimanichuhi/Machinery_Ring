// src/pages/dashboard/AdminDashboard.tsx
import { useState } from 'react';
import { 
  Users, ShoppingCart, Tractor, Building2, 
  GraduationCap, TrendingUp, UserCog, Package, AlertCircle, Plus 
} from 'lucide-react';

import { StatCard } from '@/components/dashboard/StatCard';
import { GlobalRecentActivity } from '@/components/dashboard/GlobalRecentActivity';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { ProductChart } from '@/components/dashboard/ProductChart';
import { TopPerformers } from '@/components/dashboard/TopPerformers';
import { OverdueFollowUps } from '@/components/dashboard/OverdueFollowUps';
import { TOTPerformanceOverview } from '@/components/dashboard/TOTPerformanceOverview';
import { PerformanceSummary } from '@/components/dashboard/PerformanceSummary';
import { AddTOTDialog } from '@/components/dashboard/AddTOTDialog';
import {
  useSupabaseAdminStats, 
  useSupabaseLocalMRs,
  useSupabaseSales,
  AdminStats 
} from '@/hooks/api/useSupabaseDashboard';
import { useUsers } from '@/hooks/api/useUsers';
import { useDashboardRealtime, useFarmersRealtime } from '@/hooks/api/useDashboardRealtime';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function AdminDashboard() {
  const [isAddTOTOpen, setIsAddTOTOpen] = useState(false);
  
  // Enable realtime updates
  useDashboardRealtime();
  useFarmersRealtime();

  const { data: stats, isLoading: statsLoading, error: statsError } = useSupabaseAdminStats();
  const { data: localMRs = [] } = useSupabaseLocalMRs();
  const { data: allUsers = [] } = useUsers();
  const { data: sales = [] } = useSupabaseSales();

  // Filter TOTs from users
  const tots = allUsers.filter(u => u.role === 'tot');

  // Process Local MR data for charts
  const top5MRs = localMRs.slice(0, 5);
  const barData = top5MRs.map(mr => ({
    name: mr.name?.split(' ')[0] || mr.code,
    farmers: mr.totalFarmers || 0,
    tots: (mr.totalTots || 0) * 10,
  }));

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `KES ${(value / 1000000).toFixed(1)}M`;
    return `KES ${(value / 1000).toFixed(0)}K`;
  };

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-2" />
          <div className="h-4 bg-muted rounded w-96" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (statsError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4 text-orange-500" />
        <p>Failed to load dashboard data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Organisation-wide operations overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="terracotta" className="text-sm py-1 px-3">
            <Building2 className="w-4 h-4 mr-1" />
            {stats.totalMRs || 0} Local MRs
          </Badge>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard
          title="Total Farmers"
          value={(stats.totalFarmers || 0).toLocaleString()}
          subtitle="Across all Local MRs"
          icon={Users}
          trend={{ value: 25, isPositive: true }}
          variant="forest"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue || 0)}
          subtitle="All time"
          icon={TrendingUp}
          trend={{ value: 18, isPositive: true }}
          variant="wheat"
        />
        <StatCard
          title="All Sales"
          value={(stats.totalSales || 0).toLocaleString()}
          subtitle="Transactions"
          icon={ShoppingCart}
        />
        <StatCard
          title="Mechanisation"
          value={(stats.mechanisationJobs || stats.completedMechanisation || 0).toLocaleString()}
          subtitle="Jobs completed"
          icon={Tractor}
          variant="earth"
          href="/machinery"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold font-heading">{stats.totalMRs || 0}</p>
            <p className="text-sm text-muted-foreground">Local MRs</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <UserCog className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold font-heading">{stats.totalTots || 0}</p>
            <p className="text-sm text-muted-foreground">Total TOTs</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold font-heading">{stats.trainingsHeld || 0}</p>
            <p className="text-sm text-muted-foreground">Trainings</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sage flex items-center justify-center">
            <Package className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold font-heading">{stats.totalProducts || 0}</p>
            <p className="text-sm text-muted-foreground">Products</p>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          <SalesChart />

          {/* Local MR Performance Bar Chart */}
          <Card variant="elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Local MR Performance</CardTitle>
              <Button variant="outline" size="sm">View Details</Button>
            </CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(120, 15%, 85%)" />
                      <XAxis dataKey="name" stroke="hsl(150, 20%, 40%)" fontSize={12} />
                      <YAxis stroke="hsl(150, 20%, 40%)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(40, 30%, 98%)',
                          border: '1px solid hsl(120, 15%, 85%)',
                          borderRadius: '12px',
                        }}
                      />
                      <Bar dataKey="farmers" fill="hsl(160, 55%, 20%)" radius={[4, 4, 0, 0]} name="Farmers" />
                      <Bar dataKey="tots" fill="hsl(42, 85%, 55%)" radius={[4, 4, 0, 0]} name="TOT Activity" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No Local MR data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Local MRs Overview List */}
          <Card variant="elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Local MRs Overview</CardTitle>
              <Button variant="forest" size="sm">Manage MRs</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {top5MRs.map((mr, index) => (
                  <div
                    key={mr.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                        {mr.code}
                      </div>
                      <div>
                        <p className="font-medium">{mr.name}</p>
                        <p className="text-sm text-muted-foreground">{mr.sub_county}, {mr.ward} • {mr.coordinatorName || 'No coordinator'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="font-semibold text-primary">{mr.totalTots || 0}</p>
                        <p className="text-xs text-muted-foreground">TOTs</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-accent-foreground">{mr.totalFarmers || 0}</p>
                        <p className="text-xs text-muted-foreground">Farmers</p>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  </div>
                ))}
                {top5MRs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No Local MRs found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Column */}
        <div className="space-y-6">
          <PerformanceSummary />
          <OverdueFollowUps limit={5} />
          <TopPerformers type="tots" />
          <ProductChart />
          <TopPerformers type="farmers" />
        </div>
      </div>

      {/* TOT Performance Overview */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            All TOTs Performance
          </CardTitle>
          <Button variant="forest" size="sm" onClick={() => setIsAddTOTOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add TOT
          </Button>
        </CardHeader>
        <CardContent>
          <TOTPerformanceOverview 
            tots={tots as any}
            localMRs={localMRs as any}
            sales={sales as any}
          />
        </CardContent>
      </Card>

      {/* Bottom Section */}
      <GlobalRecentActivity />

      {/* Add TOT Dialog */}
      <AddTOTDialog open={isAddTOTOpen} onOpenChange={setIsAddTOTOpen} />
    </div>
  );
}
