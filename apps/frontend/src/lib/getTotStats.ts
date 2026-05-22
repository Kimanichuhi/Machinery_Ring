import { DashboardStats } from '@/types';

// This function now returns static fallback data
// Real data should come from the useTotDashboard API hook
export function getTotStats(_totId: string): DashboardStats {
  // Fallback mock data when API is unavailable
  return {
    totalFarmers: 2,
    totalSales: 2,
    totalRevenue: 31000,
    mechanisationJobs: 1,
    visitsCompleted: 2,
    trainingsHeld: 1,
    totalCommission: 1550,
  };
}
