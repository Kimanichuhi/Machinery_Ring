// src/hooks/api/useVisits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Visit {
  id: string;
  farmer_id: string;
  tot_id: string;
  local_mr_id: string | null;
  purpose: string;
  notes: string | null;
  visit_date: string;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_completed: boolean;
  parent_visit_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  farmer_name?: string;
  tot_name?: string;
  local_mr_name?: string;
}

export interface VisitFilters {
  localMrId?: string;
  totId?: string;
  farmerId?: string;
}

export const visitKeys = {
  all: ['visits'] as const,
  lists: () => [...visitKeys.all, 'list'] as const,
  list: (filters: VisitFilters = {}) => [...visitKeys.lists(), filters] as const,
  details: () => [...visitKeys.all, 'detail'] as const,
  detail: (id: string) => [...visitKeys.details(), id] as const,
};

export function useVisits(filters: VisitFilters = {}) {
  return useQuery({
    queryKey: visitKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('visits')
        .select(`
          *,
          farmers!visits_farmer_id_fkey(name),
          local_mrs!visits_local_mr_id_fkey(name)
        `)
        .order('visit_date', { ascending: false });

      if (filters.localMrId) {
        query = query.eq('local_mr_id', filters.localMrId);
      }
      if (filters.totId) {
        query = query.eq('tot_id', filters.totId);
      }
      if (filters.farmerId) {
        query = query.eq('farmer_id', filters.farmerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((v: any) => ({
        ...v,
        farmer_name: v.farmers?.name || '',
        local_mr_name: v.local_mrs?.name || '',
        farmerName: v.farmers?.name || '',
        farmerId: v.farmer_id,
        totId: v.tot_id,
        localMrId: v.local_mr_id,
        date: v.visit_date,
      }));
    },
    staleTime: 1000 * 60 * 3,
  });
}

export function useVisit(id: string) {
  return useQuery({
    queryKey: visitKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          farmers!visits_farmer_id_fkey(name),
          local_mrs!visits_local_mr_id_fkey(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...data,
        farmer_name: data.farmers?.name || '',
        local_mr_name: data.local_mrs?.name || '',
        farmerName: data.farmers?.name || '',
        date: data.visit_date,
      };
    },
    enabled: !!id,
  });
}

export interface CreateVisitDto {
  farmer_id: string;
  tot_id: string;
  local_mr_id?: string;
  purpose: string;
  notes?: string;
  visit_date?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  parent_visit_id?: string;
  // Legacy fields for backwards compatibility
  participant_type?: 'farmer' | 'tot';
  profile_id?: string;
}

export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVisitDto) => {
      // Build insert data - visits always have a farmer_id and tot_id
      const insertData = {
        farmer_id: data.farmer_id,
        tot_id: data.tot_id,
        local_mr_id: data.local_mr_id || null,
        purpose: data.purpose,
        notes: data.notes || null,
        visit_date: data.visit_date || new Date().toISOString(),
        follow_up_required: data.follow_up_required || false,
        follow_up_date: data.follow_up_date || null,
        parent_visit_id: data.parent_visit_id || null,
      };

      const { data: visit, error } = await supabase
        .from('visits')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return visit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      toast.success('Visit logged successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to log visit');
    },
  });
}

export function useUpdateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateVisitDto> }) => {
      const { data: visit, error } = await supabase
        .from('visits')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return visit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      toast.success('Visit updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update visit');
    },
  });
}

export function useDeleteVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      toast.success('Visit deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete visit');
    },
  });
}
