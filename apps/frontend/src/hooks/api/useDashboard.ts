// src/hooks/api/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import {
  fetchAdminStats,
  fetchManagerStats,
  fetchTotStats,
  fetchMonthlySalesData,
  fetchProductPerformance,
  fetchTopPerformers,
} from '@/lib/supabase/dashboardQueries';

export interface AdminStats {
  totalFarmers: number;
  totalSales: number;
  totalMRs: number;
  totalTots: number;
  totalRevenue: number;
  totalProducts?: number;
  pendingApprovals: number;
  activeTots: number;
  completedMechanisation: number;
  mechanisationJobs?: number;
  trainingsHeld?: number;
}

export interface ManagerStats {
  totalFarmers: number;
  totalTots: number;
  totalSales: number;
  totalRevenue: number;
  totalVisits: number;
  totalTrainings: number;
  pendingApprovals: number;
  pendingMechanisation: number;
}

export interface TotStats {
  totalFarmers: number;
  totalSales: number;
  totalRevenue: number;
  mechanisationJobs: number;
  visitsCompleted: number;
  trainingsHeld: number;
  totalCommission: number;
  pendingSync?: number;
}

export interface TopPerformer {
  id: string;
  name: string;
  metric: string;
  value: string;
  rank: number;
}

export const dashboardKeys = {
  admin: () => ['dashboard', 'admin'] as const,
  manager: (localMrId: string) => ['dashboard', 'manager', localMrId] as const,
  tot: (totId: string) => ['dashboard', 'tot', totId] as const,
  monthlySales: (params?: { localMrId?: string; totId?: string; year?: number }) =>
    ['dashboard', 'sales', 'monthly', params] as const,
  productPerformance: (localMrId?: string) =>
    ['dashboard', 'products', 'performance', localMrId] as const,
  topPerformers: (type: 'tots' | 'farmers', localMrId?: string) =>
    ['dashboard', 'top-performers', type, localMrId] as const,
};

export function useAdminDashboard() {
  return useQuery({
    queryKey: dashboardKeys.admin(),
    queryFn: fetchAdminStats,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

export function useManagerDashboard(localMrId: string) {
  return useQuery({
    queryKey: dashboardKeys.manager(localMrId),
    queryFn: () => fetchManagerStats(localMrId),
    enabled: !!localMrId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTotDashboard(totId: string) {
  return useQuery({
    queryKey: dashboardKeys.tot(totId),
    queryFn: () => fetchTotStats(totId),
    enabled: !!totId,
    staleTime: 1000 * 60 * 3,
  });
}

export function useMonthlySalesData(params?: { localMrId?: string; totId?: string; year?: number }) {
  return useQuery({
    queryKey: dashboardKeys.monthlySales(params),
    queryFn: () => fetchMonthlySalesData(params),
    staleTime: 1000 * 60 * 15,
  });
}

export function useProductPerformance(localMrId?: string) {
  return useQuery({
    queryKey: dashboardKeys.productPerformance(localMrId),
    queryFn: () => fetchProductPerformance(localMrId),
    staleTime: 1000 * 60 * 10,
  });
}

export function useTopPerformers(type: 'tots' | 'farmers', localMrId?: string) {
  return useQuery({
    queryKey: dashboardKeys.topPerformers(type, localMrId),
    queryFn: () => fetchTopPerformers(type, localMrId),
    staleTime: 1000 * 60 * 8,
  });
}
