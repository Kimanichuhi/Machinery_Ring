import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MachineryServiceRecord {
  id: string;
  machinery_id: string;
  service_type: 'routine' | 'repair' | 'inspection' | 'overhaul';
  service_date: string;
  description: string;
  cost: number;
  performed_by: string | null;
  next_service_date: string | null;
  odometer_reading: number | null;
  parts_replaced: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  machinery_name?: string;
}

export interface CreateServiceRecordDto {
  machinery_id: string;
  service_type: 'routine' | 'repair' | 'inspection' | 'overhaul';
  service_date: string;
  description: string;
  cost?: number;
  performed_by?: string;
  next_service_date?: string;
  odometer_reading?: number;
  parts_replaced?: string[];
  notes?: string;
}

export const serviceKeys = {
  all: ['machinery-service'] as const,
  lists: () => [...serviceKeys.all, 'list'] as const,
  list: (filters: { machineryId?: string } = {}) => [...serviceKeys.lists(), filters] as const,
  upcoming: () => [...serviceKeys.all, 'upcoming'] as const,
};

export function useMachineryServiceHistory(filters: { machineryId?: string } = {}) {
  return useQuery({
    queryKey: serviceKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('machinery_service_history')
        .select(`
          *,
          machinery:machinery_id(name)
        `)
        .order('service_date', { ascending: false });

      if (filters.machineryId) {
        query = query.eq('machinery_id', filters.machineryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(s => ({
        ...s,
        machinery_name: s.machinery?.name || '',
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpcomingMaintenance() {
  return useQuery({
    queryKey: serviceKeys.upcoming(),
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('machinery_service_history')
        .select(`
          *,
          machinery:machinery_id(name, status)
        `)
        .not('next_service_date', 'is', null)
        .gte('next_service_date', today)
        .lte('next_service_date', nextMonthStr)
        .order('next_service_date', { ascending: true });

      if (error) throw error;

      return (data || []).map(s => ({
        ...s,
        machinery_name: s.machinery?.name || '',
        machinery_status: s.machinery?.status || '',
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateServiceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateServiceRecordDto) => {
      const { data: record, error } = await supabase
        .from('machinery_service_history')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      // Update machinery's last/next service dates
      const updateData: Record<string, string | null> = {
        last_service_date: data.service_date,
      };
      if (data.next_service_date) {
        updateData.next_service_date = data.next_service_date;
      }

      await supabase
        .from('machinery')
        .update(updateData)
        .eq('id', data.machinery_id);

      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['machinery'] });
      toast.success('Service record added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add service record');
    },
  });
}

export function useDeleteServiceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('machinery_service_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      toast.success('Service record deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete service record');
    },
  });
}
