// src/hooks/api/usePaginatedFarmers.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaginatedFarmer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  county: string;
  sub_county: string | null;
  ward: string | null;
  village: string | null;
  farm_size: number | null;
  farming_type: string | null;
  crops: string[] | null;
  livestock: string[] | null;
  gender: string | null;
  status: string;
  local_mr_id: string | null;
  registered_by: string | null;
  visits_count: number;
  trainings_attended: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
  // Computed/joined fields
  local_mr_name: string;
  localMrName: string;
  localMrId: string | null;
  farmSize: number | null;
  valueChain: string;
  farmerCategory: string;
  farmerRating: string;
  trainingsAttended: number;
  visitsCount: number;
  totalPurchases: number;
  mechanisationCount: number;
  registeredBy: string;
  createdAt: string;
  location: {
    village: string;
    county: string;
    subCounty: string;
    subcounty: string;
    ward: string;
  };
}

export interface PaginatedFarmerFilters {
  localMrId?: string;
  search?: string;
  status?: string;
  ratingFilter?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const paginatedFarmerKeys = {
  all: ['farmers', 'paginated'] as const,
  list: (filters: PaginatedFarmerFilters, pagination: PaginationParams) => 
    [...paginatedFarmerKeys.all, filters, pagination] as const,
  count: (filters: PaginatedFarmerFilters) => 
    [...paginatedFarmerKeys.all, 'count', filters] as const,
};

// Fetch total count for pagination
async function fetchFarmersCount(filters: PaginatedFarmerFilters): Promise<number> {
  let query = supabase
    .from('farmers')
    .select('*', { count: 'exact', head: true });

  if (filters.localMrId) {
    query = query.eq('local_mr_id', filters.localMrId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,village.ilike.%${filters.search}%`);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

// Fetch paginated farmers
async function fetchPaginatedFarmers(
  filters: PaginatedFarmerFilters,
  pagination: PaginationParams
): Promise<PaginatedFarmer[]> {
  const from = (pagination.page - 1) * pagination.pageSize;
  const to = from + pagination.pageSize - 1;

  let query = supabase
    .from('farmers')
    .select(`
      *,
      local_mrs!farmers_local_mr_id_fkey(name)
    `)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.localMrId) {
    query = query.eq('local_mr_id', filters.localMrId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,village.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((f: any) => ({
    ...f,
    local_mr_name: f.local_mrs?.name || '',
    localMrName: f.local_mrs?.name || '',
    location: {
      village: f.village || '',
      county: f.county || '',
      subCounty: f.sub_county || '',
      subcounty: f.sub_county || '',
      ward: f.ward || '',
    },
    localMrId: f.local_mr_id,
    farmSize: f.farm_size,
    valueChain: f.farming_type || 'Mixed Farming',
    farmerCategory: f.status === 'active' ? 'Existing' : 'Pioneer',
    farmerRating: f.visits_count > 5 ? 'High-Value' : f.visits_count > 0 ? 'Active' : 'Dormant',
    trainingsAttended: f.trainings_attended || 0,
    visitsCount: f.visits_count || 0,
    totalPurchases: 0,
    mechanisationCount: 0,
    registeredBy: f.registered_by || '',
    createdAt: f.created_at,
    phone: f.phone || '',
  }));
}

export function usePaginatedFarmers(
  filters: PaginatedFarmerFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 25 }
) {
  // Fetch count for pagination metadata
  const countQuery = useQuery({
    queryKey: paginatedFarmerKeys.count(filters),
    queryFn: () => fetchFarmersCount(filters),
    staleTime: 1000 * 60 * 2,
  });

  // Fetch paginated data
  const dataQuery = useQuery({
    queryKey: paginatedFarmerKeys.list(filters, pagination),
    queryFn: () => fetchPaginatedFarmers(filters, pagination),
    staleTime: 1000 * 60 * 2,
  });

  const totalCount = countQuery.data || 0;
  const totalPages = Math.ceil(totalCount / pagination.pageSize);

  return {
    data: dataQuery.data || [],
    totalCount,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages,
    isLoading: dataQuery.isLoading || countQuery.isLoading,
    isFetching: dataQuery.isFetching,
    error: dataQuery.error || countQuery.error,
    refetch: dataQuery.refetch,
  };
}

// Hook for stats (uses count queries - efficient for large datasets)
export function useFarmerStats(filters: PaginatedFarmerFilters = {}) {
  return useQuery({
    queryKey: ['farmers', 'stats', filters],
    queryFn: async () => {
      // Get counts for each rating type using separate queries
      const [totalResult, highValueResult, activeResult] = await Promise.all([
        supabase
          .from('farmers')
          .select('*', { count: 'exact', head: true })
          .match(filters.localMrId ? { local_mr_id: filters.localMrId } : {}),
        supabase
          .from('farmers')
          .select('*', { count: 'exact', head: true })
          .gt('visits_count', 5)
          .match(filters.localMrId ? { local_mr_id: filters.localMrId } : {}),
        supabase
          .from('farmers')
          .select('*', { count: 'exact', head: true })
          .gt('visits_count', 0)
          .lte('visits_count', 5)
          .match(filters.localMrId ? { local_mr_id: filters.localMrId } : {}),
      ]);

      return {
        total: totalResult.count || 0,
        highValue: highValueResult.count || 0,
        active: activeResult.count || 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
