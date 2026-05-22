import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OverdueVisit {
  id: string;
  farmer_id: string;
  farmer_name: string;
  tot_id: string;
  tot_name?: string;
  local_mr_id: string | null;
  local_mr_name: string | null;
  purpose: string;
  notes: string | null;
  visit_date: string;
  follow_up_date: string;
  follow_up_required: boolean;
  follow_up_completed: boolean;
  parent_visit_id: string | null;
}

export interface OverdueFilters {
  localMrId?: string;
  totId?: string;
}

export function useOverdueFollowUps(filters: OverdueFilters = {}) {
  return useQuery({
    queryKey: ['overdue-followups', filters],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('visits')
        .select(`
          id,
          farmer_id,
          tot_id,
          local_mr_id,
          purpose,
          notes,
          visit_date,
          follow_up_date,
          follow_up_required,
          follow_up_completed,
          parent_visit_id,
          farmers!visits_farmer_id_fkey(name),
          local_mrs!visits_local_mr_id_fkey(name)
        `)
        .eq('follow_up_required', true)
        .eq('follow_up_completed', false)
        .not('follow_up_date', 'is', null)
        .lt('follow_up_date', today)
        .order('follow_up_date', { ascending: true });

      if (filters.localMrId) {
        query = query.eq('local_mr_id', filters.localMrId);
      }
      if (filters.totId) {
        query = query.eq('tot_id', filters.totId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((v: any) => ({
        id: v.id,
        farmer_id: v.farmer_id,
        farmer_name: v.farmers?.name || 'Unknown',
        tot_id: v.tot_id,
        local_mr_id: v.local_mr_id,
        local_mr_name: v.local_mrs?.name || null,
        purpose: v.purpose,
        notes: v.notes,
        visit_date: v.visit_date,
        follow_up_date: v.follow_up_date,
        follow_up_required: v.follow_up_required,
        follow_up_completed: v.follow_up_completed || false,
        parent_visit_id: v.parent_visit_id || null,
      })) as OverdueVisit[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to mark a follow-up as completed
export function useMarkFollowUpComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ visitId, createLinkedVisit }: { visitId: string; createLinkedVisit?: boolean }) => {
      // First, mark the original visit's follow-up as completed
      const { error: updateError } = await supabase
        .from('visits')
        .update({ follow_up_completed: true })
        .eq('id', visitId);

      if (updateError) throw updateError;

      return { visitId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overdue-followups'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Follow-up marked as completed');
    },
    onError: (error) => {
      console.error('Error marking follow-up complete:', error);
      toast.error('Failed to mark follow-up as complete');
    },
  });
}

// Hook to get pending follow-ups (upcoming, not overdue)
export function usePendingFollowUps(filters: OverdueFilters = {}) {
  return useQuery({
    queryKey: ['pending-followups', filters],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('visits')
        .select(`
          id,
          farmer_id,
          tot_id,
          local_mr_id,
          purpose,
          notes,
          visit_date,
          follow_up_date,
          follow_up_required,
          follow_up_completed,
          parent_visit_id,
          farmers!visits_farmer_id_fkey(name),
          local_mrs!visits_local_mr_id_fkey(name)
        `)
        .eq('follow_up_required', true)
        .eq('follow_up_completed', false)
        .not('follow_up_date', 'is', null)
        .gte('follow_up_date', today)
        .order('follow_up_date', { ascending: true });

      if (filters.localMrId) {
        query = query.eq('local_mr_id', filters.localMrId);
      }
      if (filters.totId) {
        query = query.eq('tot_id', filters.totId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((v: any) => ({
        id: v.id,
        farmer_id: v.farmer_id,
        farmer_name: v.farmers?.name || 'Unknown',
        tot_id: v.tot_id,
        local_mr_id: v.local_mr_id,
        local_mr_name: v.local_mrs?.name || null,
        purpose: v.purpose,
        notes: v.notes,
        visit_date: v.visit_date,
        follow_up_date: v.follow_up_date,
        follow_up_required: v.follow_up_required,
        follow_up_completed: v.follow_up_completed || false,
        parent_visit_id: v.parent_visit_id || null,
      })) as OverdueVisit[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
