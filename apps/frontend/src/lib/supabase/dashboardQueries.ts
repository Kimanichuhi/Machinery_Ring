// src/lib/supabase/dashboardQueries.ts
import {
  fetchAdminStats as backendFetchAdminStats,
  fetchTotStats as backendFetchTotStats,
  fetchLocalMRsWithStats as backendFetchLocalMRsWithStats,
  fetchMonthlySalesData as backendFetchMonthlySalesData,
  fetchProductPerformance as backendFetchProductPerformance,
  fetchTopPerformers as backendFetchTopPerformers,
  fetchFarmers as backendFetchFarmers,
  fetchSales as backendFetchSales,
  fetchVisits as backendFetchVisits,
  fetchMechanisationJobs as backendFetchMechanisationJobs,
  fetchTrainings as backendFetchTrainings,
  fetchUsers as backendFetchUsers,
  fetchRecentActivity as backendFetchRecentActivity,
} from "@/lib/backend";

export interface AdminStats {
  totalFarmers: number;
  totalSales: number;
  totalMRs: number;
  totalTots: number;
  totalRevenue: number;
  totalProducts: number;
  pendingApprovals: number;
  activeTots: number;
  completedMechanisation: number;
  mechanisationJobs: number;
  trainingsHeld: number;
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
  pendingSync: number;
}

export interface LocalMRWithStats {
  id: string;
  name: string;
  code: string;
  region: string;
  county: string;
  sub_county: string | null;
  ward: string | null;
  status: string;
  coordinator_id: string | null;
  totalTots: number;
  totalFarmers: number;
  coordinatorName?: string;
}

export interface MonthlySalesData {
  month: string;
  value: number;
  count: number;
}

export interface ProductPerformance {
  name: string;
  value: number;
  productId: string;
}

export interface TopPerformer {
  id: string;
  name: string;
  metric: string;
  value: string;
  rank: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return backendFetchAdminStats();
}

export async function fetchTotStats(totId: string): Promise<TotStats> {
  return backendFetchTotStats(totId);
}

export async function fetchLocalMRsWithStats(): Promise<LocalMRWithStats[]> {
  return backendFetchLocalMRsWithStats();
}

export async function fetchMonthlySalesData(params?: {
  localMrId?: string;
  totId?: string;
  year?: number;
}): Promise<MonthlySalesData[]> {
  return backendFetchMonthlySalesData(params);
}

export async function fetchProductPerformance(localMrId?: string): Promise<ProductPerformance[]> {
  return backendFetchProductPerformance(localMrId);
}

export async function fetchTopPerformers(type: "tots" | "farmers", localMrId?: string): Promise<TopPerformer[]> {
  return backendFetchTopPerformers(type, localMrId);
}

export async function fetchFarmers(filters?: {
  localMrId?: string;
  search?: string;
  status?: string;
}) {
  return backendFetchFarmers(filters);
}

export async function fetchSales(filters?: {
  localMrId?: string;
  totId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return backendFetchSales(filters);
}

export async function fetchVisits(filters?: {
  localMrId?: string;
  totId?: string;
}) {
  return backendFetchVisits(filters);
}

export async function fetchMechanisationJobs(filters?: {
  localMrId?: string;
  totId?: string;
  status?: string;
}) {
  return backendFetchMechanisationJobs(filters);
}

export async function fetchTrainings(filters?: {
  localMrId?: string;
  trainerId?: string;
}) {
  return backendFetchTrainings(filters);
}

export async function fetchUsers() {
  return backendFetchUsers();
}

export async function fetchRecentActivity(limit = 10) {
  return backendFetchRecentActivity(limit);
}
