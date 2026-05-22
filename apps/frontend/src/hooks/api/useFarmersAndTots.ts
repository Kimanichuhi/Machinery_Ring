// src/hooks/api/useFarmersAndTots.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FarmerOrTot {
  id: string;
  name: string;
  phone: string | null;
  village: string | null;
  local_mr_id: string | null;
  type: 'farmer' | 'tot';
}

export interface FarmersAndTotsFilters {
  localMrId?: string;
}

export const farmersAndTotsKeys = {
  all: ['farmers-and-tots'] as const,
  lists: () => [...farmersAndTotsKeys.all, 'list'] as const,
  list: (filters: FarmersAndTotsFilters = {}) => [...farmersAndTotsKeys.lists(), filters] as const,
};

export function useFarmersAndTots(filters: FarmersAndTotsFilters = {}) {
  return useQuery({
    queryKey: farmersAndTotsKeys.list(filters),
    queryFn: async () => {
      // Fetch farmers
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select('id, name, phone, village, local_mr_id')
        .order('name');

      if (farmersError) throw farmersError;

      // Fetch TOTs (users with role 'tot')
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'tot');

      if (rolesError) throw rolesError;

      const totIds = roles?.map(r => r.user_id) || [];

      // Fetch profiles for TOTs
      let tots: FarmerOrTot[] = [];
      if (totIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, phone')
          .in('id', totIds)
          .order('name');

        if (profilesError) throw profilesError;

        // Fetch TOT assignments for local_mr_id
        const { data: assignments, error: assignmentsError } = await supabase
          .from('tot_assignments')
          .select('tot_id, local_mr_id')
          .eq('status', 'active')
          .in('tot_id', totIds);

        if (assignmentsError) throw assignmentsError;

        const assignmentsMap = new Map(
          assignments?.map(a => [a.tot_id, a.local_mr_id]) || []
        );

        tots = (profiles || []).map(p => ({
          id: p.id,
          name: `${p.name} (TOT)`,
          phone: p.phone,
          village: null,
          local_mr_id: assignmentsMap.get(p.id) || null,
          type: 'tot' as const,
        }));
      }

      // Map farmers
      const farmersList: FarmerOrTot[] = (farmers || []).map(f => ({
        id: f.id,
        name: f.name,
        phone: f.phone,
        village: f.village,
        local_mr_id: f.local_mr_id,
        type: 'farmer' as const,
      }));

      // Combine farmers and TOTs
      let combined = [...farmersList, ...tots];

      // Apply local MR filter if provided
      if (filters.localMrId) {
        combined = combined.filter(item => item.local_mr_id === filters.localMrId);
      }

      // Sort by name
      combined.sort((a, b) => a.name.localeCompare(b.name));

      return combined;
    },
    staleTime: 1000 * 60 * 3,
  });
}
