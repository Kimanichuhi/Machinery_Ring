// src/hooks/api/useFarmers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Farmer {
  id: string;
  name: string;
  phone: string | null;
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
  // Sensitive PII moved to farmer_private_data table (admin/manager only)
  status: string;
  local_mr_id: string | null;
  registered_by: string | null;
  visits_count: number;
  trainings_attended: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  local_mr_name?: string;
}

export interface FarmerFilters {
  localMrId?: string;
  search?: string;
  status?: string;
}

export const farmerKeys = {
  all: ['farmers'] as const,
  lists: () => [...farmerKeys.all, 'list'] as const,
  list: (filters: FarmerFilters = {}) => [...farmerKeys.lists(), filters] as const,
  details: () => [...farmerKeys.all, 'detail'] as const,
  detail: (id: string) => [...farmerKeys.details(), id] as const,
};

// Helper function to fetch all records with pagination (bypasses 1000 row limit)
async function fetchAllFarmers(filters: FarmerFilters) {
  const pageSize = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('farmers')
      .select(`
        *,
        local_mrs!farmers_local_mr_id_fkey(name)
      `)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

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

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

export function useFarmers(filters: FarmerFilters = {}) {
  return useQuery({
    queryKey: farmerKeys.list(filters),
    queryFn: async () => {
      const data = await fetchAllFarmers(filters);
      
      return (data || []).map(f => ({
        ...f,
        local_mr_name: f.local_mrs?.name || null,
        localMrName: f.local_mrs?.name || '',
        // Map to legacy format for compatibility
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
        // Add required computed fields
        trainingsAttended: f.trainings_attended || 0,
        visitsCount: f.visits_count || 0,
        totalPurchases: 0,
        mechanisationCount: 0,
        registeredBy: f.registered_by || '',
        createdAt: f.created_at,
        phone: f.phone || '',
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useFarmer(id: string) {
  return useQuery({
    queryKey: farmerKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmers')
        .select(`
          *,
          local_mrs!farmers_local_mr_id_fkey(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return {
        ...data,
        local_mr_name: data.local_mrs?.name || null,
        localMrName: data.local_mrs?.name || '',
        location: {
          village: data.village || '',
          county: data.county || '',
          subCounty: data.sub_county || '',
          subcounty: data.sub_county || '',
          ward: data.ward || '',
        },
        localMrId: data.local_mr_id,
        farmSize: data.farm_size,
        valueChain: data.farming_type || 'Mixed Farming',
        farmerCategory: data.status === 'active' ? 'Existing' : 'Pioneer',
        farmerRating: data.visits_count > 5 ? 'High-Value' : data.visits_count > 0 ? 'Active' : 'Dormant',
        trainingsAttended: data.trainings_attended || 0,
        visitsCount: data.visits_count || 0,
        totalPurchases: 0,
        mechanisationCount: 0,
        registeredBy: data.registered_by || '',
        createdAt: data.created_at,
        phone: data.phone || '',
      };
    },
    enabled: !!id,
  });
}

export interface CreateFarmerDto {
  name: string;
  phone?: string;
  email?: string;
  county: string;
  sub_county?: string;
  ward?: string;
  village?: string;
  farm_size?: number;
  farming_type?: string;
  crops?: string[];
  livestock?: string[];
  gender?: string;
  // Sensitive PII (id_number, date_of_birth) is managed separately in farmer_private_data (admin/manager only)
  local_mr_id?: string;
}

export function useCreateFarmer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFarmerDto) => {
      const { data: farmer, error } = await supabase
        .from('farmers')
        .insert({
          name: data.name,
          phone: data.phone,
          email: data.email,
          county: data.county,
          sub_county: data.sub_county,
          ward: data.ward,
          village: data.village,
          farm_size: data.farm_size,
          farming_type: data.farming_type,
          crops: data.crops,
          livestock: data.livestock,
          gender: data.gender,
          local_mr_id: data.local_mr_id,
        })
        .select()
        .single();

      if (error) throw error;
      return farmer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerKeys.all });
      toast.success('Farmer registered successfully');
    },
    onError: (error: any) => {
      const msg = error?.message || '';
      if (msg.includes('idx_farmers_unique_phone') || msg.includes('duplicate key')) {
        toast.error('A farmer with this phone number already exists');
      } else {
        toast.error(msg || 'Failed to register farmer');
      }
    },
  });
}

export function useUpdateFarmer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateFarmerDto> }) => {
      const { data: farmer, error } = await supabase
        .from('farmers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return farmer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerKeys.all });
      toast.success('Farmer updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update farmer');
    },
  });
}

export function useDeleteFarmer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('farmers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerKeys.all });
      toast.success('Farmer deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete farmer');
    },
  });
}
