// src/hooks/api/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

/**
 * Admin Dashboard - Organization-wide stats from Supabase
 */
export function useAdminDashboard() {
  return useQuery({
    queryKey: dashboardKeys.admin(),
    queryFn: async (): Promise<AdminStats> => {
      const [
        farmersResult,
        salesResult,
        localMrsResult,
        totsResult,
        productsResult,
        mechanisationResult,
        trainingsResult,
      ] = await Promise.all([
        supabase.from('farmers').select('*', { count: 'exact', head: true }),
        supabase.from('sales').select('total_amount, commission_amount'),
        supabase.from('local_mrs').select('*', { count: 'exact', head: true }),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'tot'),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('mechanisation_jobs').select('status'),
        supabase.from('trainings').select('*', { count: 'exact', head: true }),
      ]);

      const salesData = salesResult.data || [];
      const totalRevenue = salesData.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const mechanisationData = mechanisationResult.data || [];
      const completedMech = mechanisationData.filter(j => j.status === 'completed').length;

      return {
        totalFarmers: farmersResult.count || 0,
        totalSales: salesData.length,
        totalMRs: localMrsResult.count || 0,
        totalTots: totsResult.count || 0,
        totalRevenue,
        totalProducts: productsResult.count || 0,
        pendingApprovals: 0, // Approvals removed
        activeTots: totsResult.count || 0,
        completedMechanisation: completedMech,
        mechanisationJobs: mechanisationData.length,
        trainingsHeld: trainingsResult.count || 0,
      };
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Manager Dashboard - Local MR scoped (read-only access)
 */
export function useManagerDashboard(localMrId: string) {
  return useQuery({
    queryKey: dashboardKeys.manager(localMrId),
    queryFn: async (): Promise<ManagerStats> => {
      const [
        farmersResult,
        totsResult,
        salesResult,
        visitsResult,
        trainingsResult,
        mechanisationResult,
      ] = await Promise.all([
        supabase.from('farmers').select('*', { count: 'exact', head: true }).eq('local_mr_id', localMrId),
        supabase.from('tot_assignments').select('*', { count: 'exact', head: true }).eq('local_mr_id', localMrId).eq('status', 'active'),
        supabase.from('sales').select('total_amount').eq('local_mr_id', localMrId),
        supabase.from('visits').select('*', { count: 'exact', head: true }).eq('local_mr_id', localMrId),
        supabase.from('trainings').select('*', { count: 'exact', head: true }).eq('local_mr_id', localMrId),
        supabase.from('mechanisation_jobs').select('status').eq('local_mr_id', localMrId),
      ]);

      const salesData = salesResult.data || [];
      const totalRevenue = salesData.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const mechData = mechanisationResult.data || [];
      const pendingMech = mechData.filter(j => j.status === 'pending').length;

      return {
        totalFarmers: farmersResult.count || 0,
        totalTots: totsResult.count || 0,
        totalSales: salesData.length,
        totalRevenue,
        totalVisits: visitsResult.count || 0,
        totalTrainings: trainingsResult.count || 0,
        pendingApprovals: 0,
        pendingMechanisation: pendingMech,
      };
    },
    enabled: !!localMrId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * TOT Dashboard - Personal stats
 */
export function useTotDashboard(totId: string) {
  return useQuery({
    queryKey: dashboardKeys.tot(totId),
    queryFn: async (): Promise<TotStats> => {
      const [
        salesResult,
        visitsResult,
        trainingsResult,
        mechanisationResult,
      ] = await Promise.all([
        supabase.from('sales').select('total_amount, commission_amount, farmer_id').eq('tot_id', totId),
        supabase.from('visits').select('*', { count: 'exact', head: true }).eq('tot_id', totId),
        supabase.from('trainings').select('*', { count: 'exact', head: true }).eq('trainer_id', totId),
        supabase.from('mechanisation_jobs').select('*', { count: 'exact', head: true }).eq('tot_id', totId),
      ]);

      const salesData = salesResult.data || [];
      const totalRevenue = salesData.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const totalCommission = salesData.reduce((sum, s) => sum + Number(s.commission_amount || 0), 0);
      const uniqueFarmers = new Set(salesData.map(s => s.farmer_id)).size;

      return {
        totalFarmers: uniqueFarmers,
        totalSales: salesData.length,
        totalRevenue,
        mechanisationJobs: mechanisationResult.count || 0,
        visitsCompleted: visitsResult.count || 0,
        trainingsHeld: trainingsResult.count || 0,
        totalCommission,
        pendingSync: 0,
      };
    },
    enabled: !!totId,
    staleTime: 1000 * 60 * 3,
  });
}

/**
 * Monthly sales trend data from Supabase view
 */
export function useMonthlySalesData(params?: { localMrId?: string; totId?: string; year?: number }) {
  return useQuery({
    queryKey: dashboardKeys.monthlySales(params),
    queryFn: async () => {
      const year = params?.year || new Date().getFullYear();
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      let query = supabase
        .from('sales')
        .select('sale_date, total_amount')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate);

      if (params?.localMrId) {
        query = query.eq('local_mr_id', params.localMrId);
      }
      if (params?.totId) {
        query = query.eq('tot_id', params.totId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, { value: number; count: number }> = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      months.forEach(month => {
        monthlyData[month] = { value: 0, count: 0 };
      });

      (data || []).forEach(sale => {
        const monthIndex = new Date(sale.sale_date).getMonth();
        const monthName = months[monthIndex];
        monthlyData[monthName].value += Number(sale.total_amount || 0);
        monthlyData[monthName].count += 1;
      });

      return months.map(month => ({
        month,
        value: monthlyData[month].value,
        count: monthlyData[month].count,
      }));
    },
    staleTime: 1000 * 60 * 15,
  });
}

/**
 * Product performance (top selling) from Supabase
 */
export function useProductPerformance(localMrId?: string) {
  return useQuery({
    queryKey: dashboardKeys.productPerformance(localMrId),
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select('product_id, total_amount, products(name)');

      if (localMrId) {
        query = query.eq('local_mr_id', localMrId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by product
      const productMap: Record<string, { name: string; value: number }> = {};
      
      (data || []).forEach((sale: any) => {
        const productId = sale.product_id;
        const productName = sale.products?.name || 'Unknown';
        
        if (!productMap[productId]) {
          productMap[productId] = { name: productName, value: 0 };
        }
        productMap[productId].value += Number(sale.total_amount || 0);
      });

      return Object.entries(productMap)
        .map(([productId, { name, value }]) => ({
          productId,
          name,
          value,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Top performers (TOTs or Farmers) from Supabase
 */
export function useTopPerformers(type: 'tots' | 'farmers', localMrId?: string) {
  return useQuery({
    queryKey: dashboardKeys.topPerformers(type, localMrId),
    queryFn: async (): Promise<TopPerformer[]> => {
      if (type === 'tots') {
        // Get TOT performance from the secure function
        const { data, error } = await supabase
          .rpc('get_tot_performance', localMrId ? { _local_mr_id: localMrId } : {});

        if (error) throw error;

        return (data || [])
          .sort((a: any, b: any) => Number(b.total_revenue || 0) - Number(a.total_revenue || 0))
          .slice(0, 5)
          .map((t: any, index: number) => ({
            id: t.tot_id || '',
            name: t.tot_name || 'Unknown',
            metric: 'Revenue',
            value: `KES ${Number(t.total_revenue || 0).toLocaleString()}`,
            rank: index + 1,
          }));
      } else {
        // Get top farmers by sales
        let query = supabase
          .from('sales')
          .select('farmer_id, total_amount, farmers(name)');

        if (localMrId) {
          query = query.eq('local_mr_id', localMrId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Aggregate by farmer
        const farmerMap: Record<string, { name: string; total: number }> = {};
        
        (data || []).forEach((sale: any) => {
          const farmerId = sale.farmer_id;
          const farmerName = sale.farmers?.name || 'Unknown';
          
          if (!farmerMap[farmerId]) {
            farmerMap[farmerId] = { name: farmerName, total: 0 };
          }
          farmerMap[farmerId].total += Number(sale.total_amount || 0);
        });

        return Object.entries(farmerMap)
          .map(([id, { name, total }]) => ({ id, name, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
          .map((f, index) => ({
            id: f.id,
            name: f.name,
            metric: 'Purchases',
            value: `KES ${f.total.toLocaleString()}`,
            rank: index + 1,
          }));
      }
    },
    staleTime: 1000 * 60 * 8,
  });
}
