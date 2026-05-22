// src/hooks/api/useMachinery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Machinery {
  id: string;
  name: string;
  category: string;
  model: string | null;
  registration_number: string | null;
  condition: string | null;
  status: string;
  hourly_rate: number;
  daily_rate: number;
  local_mr_id: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  local_mr_name?: string;
}

export interface MachineryFilters {
  localMrId?: string;
  status?: string;
  category?: string;
}

export const machineryKeys = {
  all: ['machinery'] as const,
  lists: () => [...machineryKeys.all, 'list'] as const,
  list: (filters: MachineryFilters = {}) => [...machineryKeys.lists(), filters] as const,
  details: () => [...machineryKeys.all, 'detail'] as const,
  detail: (id: string) => [...machineryKeys.details(), id] as const,
};

export function useMachinery(filters: MachineryFilters = {}) {
  return useQuery({
    queryKey: machineryKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('machinery')
        .select(`
          *,
          local_mrs!machinery_local_mr_id_fkey(name)
        `)
        .order('name');

      if (filters.localMrId) {
        query = query.eq('local_mr_id', filters.localMrId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(m => ({
        ...m,
        local_mr_name: m.local_mrs?.name || '',
        // Legacy format
        pricePerAcre: m.daily_rate,
        type: m.category,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useMachineryItem(id: string) {
  return useQuery({
    queryKey: machineryKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machinery')
        .select(`
          *,
          local_mrs!machinery_local_mr_id_fkey(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...data,
        local_mr_name: data.local_mrs?.name || '',
        pricePerAcre: data.daily_rate,
        type: data.category,
      };
    },
    enabled: !!id,
  });
}

export interface CreateMachineryDto {
  name: string;
  category: string;
  model?: string;
  registration_number?: string;
  condition?: string;
  status?: string;
  hourly_rate?: number;
  daily_rate?: number;
  local_mr_id?: string;
}

export function useCreateMachinery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMachineryDto) => {
      const { data: machinery, error } = await supabase
        .from('machinery')
        .insert({
          name: data.name,
          category: data.category,
          model: data.model,
          registration_number: data.registration_number,
          condition: data.condition || 'good',
          status: data.status || 'available',
          hourly_rate: data.hourly_rate || 0,
          daily_rate: data.daily_rate || 0,
          local_mr_id: data.local_mr_id,
        })
        .select()
        .single();

      if (error) throw error;
      return machinery;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineryKeys.all });
      toast.success('Machinery added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add machinery');
    },
  });
}

export function useBulkCreateMachinery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: CreateMachineryDto[]) => {
      const insertData = items.map(data => ({
        name: data.name,
        category: data.category,
        model: data.model || null,
        registration_number: data.registration_number || null,
        condition: data.condition || 'good',
        status: data.status || 'available',
        hourly_rate: data.hourly_rate || 0,
        daily_rate: data.daily_rate || 0,
        local_mr_id: data.local_mr_id || null,
      }));

      const { data: machinery, error } = await supabase
        .from('machinery')
        .insert(insertData)
        .select();

      if (error) throw error;
      return machinery;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: machineryKeys.all });
      toast.success(`Successfully added ${variables.length} machinery items`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to bulk add machinery');
    },
  });
}

export function useUpdateMachinery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateMachineryDto> }) => {
      const { data: machinery, error } = await supabase
        .from('machinery')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return machinery;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineryKeys.all });
      toast.success('Machinery updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update machinery');
    },
  });
}

export function useDeleteMachinery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('machinery')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineryKeys.all });
      toast.success('Machinery deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete machinery');
    },
  });
}

export function useUpdateMachineryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'available' | 'in_use' | 'maintenance' | 'retired' }) => {
      const { error } = await supabase
        .from('machinery')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: machineryKeys.all });
      toast.success(`Machinery marked as ${status}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}
