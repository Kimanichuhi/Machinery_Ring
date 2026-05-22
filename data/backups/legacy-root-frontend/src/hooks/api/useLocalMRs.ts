// src/hooks/api/useLocalMRs.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LocalMRData {
  id: string;
  name: string;
  region: string;
  county: string;
  sub_county: string | null;
  ward: string | null;
  coordinator_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  totalTots?: number;
  totalFarmers?: number;
  coordinatorName?: string;
}

export interface CreateLocalMRDto {
  name: string;
  code?: string;
  region: string;
  county: string;
  sub_county?: string;
  ward?: string;
  coordinator_id?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface UpdateLocalMRDto {
  name?: string;
  region?: string;
  county?: string;
  sub_county?: string;
  ward?: string;
  coordinator_id?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: string;
}

export const localMrKeys = {
  all: ['localMrs'] as const,
  lists: () => [...localMrKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown> = {}) => [...localMrKeys.lists(), filters] as const,
  details: () => [...localMrKeys.all, 'detail'] as const,
  detail: (id: string) => [...localMrKeys.details(), id] as const,
  stats: () => [...localMrKeys.all, 'stats'] as const,
  statsById: (id: string) => [...localMrKeys.stats(), id] as const,
};

/**
 * Fetch all Local MRs from Supabase
 */
export function useLocalMRs() {
  return useQuery({
    queryKey: localMrKeys.lists(),
    queryFn: async () => {
      // Fetch local_mrs
      const { data: localMrs, error } = await supabase
        .from('local_mrs')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching local MRs:', error);
        throw error;
      }

      // Get unique coordinator IDs (filter out null values)
      const coordinatorIds = (localMrs || [])
        .map(mr => mr.coordinator_id)
        .filter((id): id is string => id !== null);
      
      // Fetch coordinator profiles separately
      let coordinatorsMap: Record<string, string> = {};
      if (coordinatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', coordinatorIds);
        
        coordinatorsMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Fetch TOT counts per local_mr
      const { data: totCounts } = await supabase
        .from('tot_assignments')
        .select('local_mr_id')
        .eq('status', 'active');

      // Fetch farmer counts per local_mr
      const { data: farmerCounts } = await supabase
        .from('farmers')
        .select('local_mr_id')
        .eq('status', 'active');

      // Aggregate counts
      const totByMr = (totCounts || []).reduce((acc, t) => {
        acc[t.local_mr_id] = (acc[t.local_mr_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const farmerByMr = (farmerCounts || []).reduce((acc, f) => {
        if (f.local_mr_id) {
          acc[f.local_mr_id] = (acc[f.local_mr_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return (localMrs || []).map((mr: any) => ({
        id: mr.id,
        name: mr.name,
        code: mr.name.substring(0, 3).toUpperCase(),
        region: mr.region,
        county: mr.county,
        subcounty: mr.sub_county || '',
        ward: mr.ward || '',
        coordinator_id: mr.coordinator_id,
        coordinatorName: mr.coordinator_id ? (coordinatorsMap[mr.coordinator_id] || 'Unassigned') : 'Unassigned',
        managerName: mr.coordinator_id ? (coordinatorsMap[mr.coordinator_id] || 'Unassigned') : 'Unassigned',
        contact_email: mr.contact_email,
        contact_phone: mr.contact_phone,
        status: mr.status,
        totalTots: totByMr[mr.id] || 0,
        totalFarmers: farmerByMr[mr.id] || 0,
        created_at: mr.created_at,
        updated_at: mr.updated_at,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch single Local MR
 */
export function useLocalMR(id: string) {
  return useQuery({
    queryKey: localMrKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('local_mrs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Fetch coordinator profile separately if exists
      let coordinator: { id: string; name: string; email: string; phone: string | null } | null = null;
      if (data.coordinator_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, email, phone')
          .eq('id', data.coordinator_id)
          .single();
        coordinator = profile;
      }

      return { ...data, coordinator };
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Create Local MR
 */
export function useCreateLocalMR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLocalMRDto) => {
      const { data: newMR, error } = await supabase
        .from('local_mrs')
        .insert({
          name: data.name,
          region: data.region,
          county: data.county,
          sub_county: data.sub_county || null,
          ward: data.ward || null,
          coordinator_id: data.coordinator_id || null,
          contact_email: data.contact_email || null,
          contact_phone: data.contact_phone || null,
        })
        .select()
        .single();

      if (error) throw error;
      return newMR;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: localMrKeys.all });
      toast.success('Local MR created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create Local MR');
    },
  });
}

/**
 * Update Local MR
 */
export function useUpdateLocalMR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLocalMRDto }) => {
      const { data: updated, error } = await supabase
        .from('local_mrs')
        .update({
          name: data.name,
          region: data.region,
          county: data.county,
          sub_county: data.sub_county,
          ward: data.ward,
          coordinator_id: data.coordinator_id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: localMrKeys.all });
      queryClient.invalidateQueries({ queryKey: localMrKeys.detail(variables.id) });
      toast.success('Local MR updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update Local MR');
    },
  });
}

/**
 * Delete Local MR
 */
export function useDeleteLocalMR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('local_mrs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: localMrKeys.all });
      toast.success('Local MR deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete Local MR');
    },
  });
}
