// src/hooks/api/useSupabaseDashboard.ts
import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminStats,
  fetchTotStats,
  fetchLocalMRsWithStats,
  fetchMonthlySalesData,
  fetchProductPerformance,
  fetchTopPerformers,
  fetchFarmers,
  fetchSales,
  fetchVisits,
  fetchMechanisationJobs,
  fetchTrainings,
  fetchUsers,
  fetchRecentActivity,
  AdminStats,
  TotStats,
  LocalMRWithStats,
  MonthlySalesData,
  ProductPerformance,
  TopPerformer,
} from "@/lib/supabase/dashboardQueries";

// Query keys
export const supabaseDashboardKeys = {
  adminStats: () => ["supabase", "dashboard", "admin"] as const,
  totStats: (totId: string) => ["supabase", "dashboard", "tot", totId] as const,
  localMRs: () => ["supabase", "localMRs"] as const,
  monthlySales: (params?: { localMrId?: string; totId?: string; year?: number }) =>
    ["supabase", "sales", "monthly", params] as const,
  productPerformance: (localMrId?: string) =>
    ["supabase", "products", "performance", localMrId] as const,
  topPerformers: (type: "tots" | "farmers", localMrId?: string) =>
    ["supabase", "topPerformers", type, localMrId] as const,
  farmers: (filters?: { localMrId?: string; search?: string; status?: string }) =>
    ["supabase", "farmers", filters] as const,
  sales: (filters?: { localMrId?: string; totId?: string; startDate?: string; endDate?: string }) =>
    ["supabase", "sales", filters] as const,
  visits: (filters?: { localMrId?: string; totId?: string }) =>
    ["supabase", "visits", filters] as const,
  mechanisation: (filters?: { localMrId?: string; totId?: string; status?: string }) =>
    ["supabase", "mechanisation", filters] as const,
  trainings: (filters?: { localMrId?: string; trainerId?: string }) =>
    ["supabase", "trainings", filters] as const,
  users: () => ["supabase", "users"] as const,
  recentActivity: (limit?: number) => ["supabase", "activity", limit] as const,
};

/**
 * Admin Dashboard Stats (Organization-wide)
 */
export function useSupabaseAdminStats() {
  return useQuery<AdminStats>({
    queryKey: supabaseDashboardKeys.adminStats(),
    queryFn: fetchAdminStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15,
  });
}

/**
 * TOT Dashboard Stats (Personal)
 */
export function useSupabaseTotStats(totId: string) {
  return useQuery<TotStats>({
    queryKey: supabaseDashboardKeys.totStats(totId),
    queryFn: () => fetchTotStats(totId),
    enabled: !!totId,
    staleTime: 1000 * 60 * 3,
  });
}

/**
 * Local MRs with computed stats
 */
export function useSupabaseLocalMRs() {
  return useQuery<LocalMRWithStats[]>({
    queryKey: supabaseDashboardKeys.localMRs(),
    queryFn: fetchLocalMRsWithStats,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Monthly sales chart data
 */
export function useSupabaseMonthlySales(params?: {
  localMrId?: string;
  totId?: string;
  year?: number;
}) {
  return useQuery<MonthlySalesData[]>({
    queryKey: supabaseDashboardKeys.monthlySales(params),
    queryFn: () => fetchMonthlySalesData(params),
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Product performance chart data
 */
export function useSupabaseProductPerformance(localMrId?: string) {
  return useQuery<ProductPerformance[]>({
    queryKey: supabaseDashboardKeys.productPerformance(localMrId),
    queryFn: () => fetchProductPerformance(localMrId),
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Top performers (TOTs or Farmers)
 */
export function useSupabaseTopPerformers(type: "tots" | "farmers", localMrId?: string) {
  return useQuery<TopPerformer[]>({
    queryKey: supabaseDashboardKeys.topPerformers(type, localMrId),
    queryFn: () => fetchTopPerformers(type, localMrId),
    staleTime: 1000 * 60 * 8,
  });
}

/**
 * Farmers list
 */
export function useSupabaseFarmers(filters?: {
  localMrId?: string;
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: supabaseDashboardKeys.farmers(filters),
    queryFn: () => fetchFarmers(filters),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Sales list
 */
export function useSupabaseSales(filters?: {
  localMrId?: string;
  totId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: supabaseDashboardKeys.sales(filters),
    queryFn: () => fetchSales(filters),
    staleTime: 1000 * 60 * 3,
  });
}

/**
 * Visits list
 */
export function useSupabaseVisits(filters?: { localMrId?: string; totId?: string }) {
  return useQuery({
    queryKey: supabaseDashboardKeys.visits(filters),
    queryFn: () => fetchVisits(filters),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Mechanisation jobs list
 */
export function useSupabaseMechanisation(filters?: {
  localMrId?: string;
  totId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: supabaseDashboardKeys.mechanisation(filters),
    queryFn: () => fetchMechanisationJobs(filters),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Trainings list
 */
export function useSupabaseTrainings(filters?: { localMrId?: string; trainerId?: string }) {
  return useQuery({
    queryKey: supabaseDashboardKeys.trainings(filters),
    queryFn: () => fetchTrainings(filters),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Users with roles
 */
export function useSupabaseUsers() {
  return useQuery({
    queryKey: supabaseDashboardKeys.users(),
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Recent activity feed
 */
export function useSupabaseRecentActivity(limit = 10) {
  return useQuery({
    queryKey: supabaseDashboardKeys.recentActivity(limit),
    queryFn: () => fetchRecentActivity(limit),
    staleTime: 1000 * 60 * 2,
  });
}

// Re-export types
export type { AdminStats, TotStats, LocalMRWithStats, MonthlySalesData, ProductPerformance, TopPerformer };
