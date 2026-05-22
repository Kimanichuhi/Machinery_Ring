// src/hooks/api/useMechanisation.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MechanisationJob {
  id: string;
  farmer_id: string;
  machinery_id: string;
  tot_id: string;
  local_mr_id: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  area_acres: number | null;
  duration_hours: number | null;
  total_cost: number;
  commission_per_acre: number | null;
  tot_commission: number | null;
  status: string;
  completion_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  farmer_name?: string;
  machinery_name?: string;
  tot_name?: string;
  local_mr_name?: string;
  // Computed
  farmerName?: string;
  machineryName?: string;
  totName?: string;
  localMrName?: string;
  acreage?: number;
  pricePerAcre?: number;
  totalPrice?: number;
  serviceType?: string;
  scheduledDate?: string;
  completionReport?: {
    summary: string;
    duration: string;
    completedAt: string;
    outcome: string;
  } | null;
}

export interface MechanisationFilters {
  localMrId?: string;
  totId?: string;
  status?: string;
  machineryId?: string;
}

export const mechanisationKeys = {
  all: ['mechanisation'] as const,
  lists: () => [...mechanisationKeys.all, 'list'] as const,
  list: (filters: MechanisationFilters = {}) => [...mechanisationKeys.lists(), filters] as const,
  details: () => [...mechanisationKeys.all, 'detail'] as const,
  detail: (id: string) => [...mechanisationKeys.details(), id] as const,
};

export function useMechanisationJobs(filters: MechanisationFilters = {}) {
  return useQuery({
    queryKey: mechanisationKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('mechanisation_jobs')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (filters.localMrId) {
        query = query.eq('local_mr_id', filters.localMrId);
      }
      if (filters.totId) {
        query = query.eq('tot_id', filters.totId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.machineryId) {
        query = query.eq('machinery_id', filters.machineryId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching mechanisation jobs:', error);
        throw error;
      }

      // Get unique IDs
      const farmerIds = [...new Set((data || []).map(j => j.farmer_id).filter(Boolean))];
      const machineryIds = [...new Set((data || []).map(j => j.machinery_id).filter(Boolean))];
      const localMrIds = [...new Set((data || []).map(j => j.local_mr_id).filter(Boolean))];
      const totIds = [...new Set((data || []).map(j => j.tot_id).filter(Boolean))];

      // Fetch related data in parallel
      const [farmersRes, machineryRes, localMrsRes, totsRes] = await Promise.all([
        farmerIds.length > 0 ? supabase.from('farmers').select('id, name').in('id', farmerIds) : { data: [] },
        machineryIds.length > 0 ? supabase.from('machinery').select('id, name, daily_rate').in('id', machineryIds) : { data: [] },
        localMrIds.length > 0 ? supabase.from('local_mrs').select('id, name').in('id', localMrIds) : { data: [] },
        totIds.length > 0 ? supabase.from('profiles').select('id, name').in('id', totIds) : { data: [] },
      ]);

      const farmersMap = (farmersRes.data || []).reduce((acc, f) => { acc[f.id] = f.name; return acc; }, {} as Record<string, string>);
      const machineryMap = (machineryRes.data || []).reduce((acc, m) => { acc[m.id] = { name: m.name, daily_rate: m.daily_rate }; return acc; }, {} as Record<string, { name: string; daily_rate: number }>);
      const localMrsMap = (localMrsRes.data || []).reduce((acc, m) => { acc[m.id] = m.name; return acc; }, {} as Record<string, string>);
      const totsMap = (totsRes.data || []).reduce((acc, t) => { acc[t.id] = t.name; return acc; }, {} as Record<string, string>);

      return (data || []).map((j: any) => ({
        ...j,
        farmer_name: farmersMap[j.farmer_id] || '',
        machinery_name: machineryMap[j.machinery_id]?.name || '',
        local_mr_name: localMrsMap[j.local_mr_id] || '',
        tot_name: totsMap[j.tot_id] || '',
        farmerName: farmersMap[j.farmer_id] || '',
        machineryName: machineryMap[j.machinery_id]?.name || '',
        farmerId: j.farmer_id,
        machineryId: j.machinery_id,
        totId: j.tot_id,
        localMrId: j.local_mr_id,
        acreage: j.area_acres || 0,
        pricePerAcre: machineryMap[j.machinery_id]?.daily_rate || 0,
        totalPrice: j.total_cost,
        serviceType: j.service_type,
        scheduledDate: j.scheduled_date,
        completionReport: j.completed_at ? {
          summary: j.completion_notes || 'Job completed',
          duration: `${j.duration_hours || 0} hours`,
          completedAt: j.completed_at,
          outcome: 'Successful',
        } : null,
      }));
    },
    staleTime: 1000 * 60 * 3,
  });
}

export function useMechanisationJob(id: string) {
  return useQuery({
    queryKey: mechanisationKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mechanisation_jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch related data
      const [farmerRes, machineryRes, localMrRes, totRes] = await Promise.all([
        supabase.from('farmers').select('name').eq('id', data.farmer_id).single(),
        supabase.from('machinery').select('name, daily_rate').eq('id', data.machinery_id).single(),
        supabase.from('local_mrs').select('name').eq('id', data.local_mr_id).single(),
        supabase.from('profiles').select('name').eq('id', data.tot_id).single(),
      ]);

      return {
        ...data,
        farmerName: farmerRes.data?.name || '',
        machineryName: machineryRes.data?.name || '',
        localMrName: localMrRes.data?.name || '',
        totName: totRes.data?.name || '',
        acreage: data.area_acres || 0,
        pricePerAcre: machineryRes.data?.daily_rate || 0,
        totalPrice: data.total_cost,
        scheduledDate: data.scheduled_date,
      };
    },
    enabled: !!id,
  });
}

export function usePendingMechanisation(localMrId?: string) {
  return useQuery({
    queryKey: mechanisationKeys.list({ localMrId, status: 'pending' }),
    queryFn: async () => {
      let query = supabase
        .from('mechanisation_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('scheduled_date', { ascending: true });

      if (localMrId) {
        query = query.eq('local_mr_id', localMrId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get unique IDs for related data
      const farmerIds = [...new Set((data || []).map(j => j.farmer_id).filter(Boolean))];
      const machineryIds = [...new Set((data || []).map(j => j.machinery_id).filter(Boolean))];
      const localMrIds = [...new Set((data || []).map(j => j.local_mr_id).filter(Boolean))];

      const [farmersRes, machineryRes, localMrsRes] = await Promise.all([
        farmerIds.length > 0 ? supabase.from('farmers').select('id, name').in('id', farmerIds) : { data: [] },
        machineryIds.length > 0 ? supabase.from('machinery').select('id, name').in('id', machineryIds) : { data: [] },
        localMrIds.length > 0 ? supabase.from('local_mrs').select('id, name').in('id', localMrIds) : { data: [] },
      ]);

      const farmersMap = (farmersRes.data || []).reduce((acc, f) => { acc[f.id] = f.name; return acc; }, {} as Record<string, string>);
      const machineryMap = (machineryRes.data || []).reduce((acc, m) => { acc[m.id] = m.name; return acc; }, {} as Record<string, string>);
      const localMrsMap = (localMrsRes.data || []).reduce((acc, m) => { acc[m.id] = m.name; return acc; }, {} as Record<string, string>);

      return (data || []).map(j => ({
        ...j,
        farmers: { name: farmersMap[j.farmer_id] || '' },
        machinery: { name: machineryMap[j.machinery_id] || '' },
        local_mrs: { name: localMrsMap[j.local_mr_id] || '' },
      }));
    },
    staleTime: 1000 * 60 * 2,
  });
}

export interface CreateMechanisationDto {
  farmer_id: string;
  machinery_id: string;
  tot_id: string;
  local_mr_id: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time?: string;
  area_acres?: number;
  total_cost?: number;
  commission_per_acre?: number;
}

export function useCreateMechanisation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMechanisationDto) => {
      const { data: job, error } = await supabase
        .from('mechanisation_jobs')
        .insert({
          farmer_id: data.farmer_id,
          machinery_id: data.machinery_id,
          tot_id: data.tot_id,
          local_mr_id: data.local_mr_id,
          service_type: data.service_type,
          scheduled_date: data.scheduled_date,
          scheduled_time: data.scheduled_time,
          area_acres: data.area_acres,
          total_cost: data.total_cost || 0,
          commission_per_acre: data.commission_per_acre || 100,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mechanisationKeys.all });
      toast.success('Mechanisation booking created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create booking');
    },
  });
}

export function useUpdateMechanisation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateMechanisationDto> }) => {
      const { data: job, error } = await supabase
        .from('mechanisation_jobs')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mechanisationKeys.all });
      toast.success('Booking updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update booking');
    },
  });
}

export function useApproveMechanisation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mechanisation_jobs')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mechanisationKeys.all });
      toast.success('Booking approved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve booking');
    },
  });
}

export function useRejectMechanisation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from('mechanisation_jobs')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mechanisationKeys.all });
      toast.success('Booking rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject booking');
    },
  });
}

export function useCompleteMechanisation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, report }: { id: string; report: { summary: string; duration: string; outcome: string } }) => {
      const { error } = await supabase
        .from('mechanisation_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: report.summary,
          duration_hours: parseFloat(report.duration) || 0,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mechanisationKeys.all });
      toast.success('Job marked as completed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete job');
    },
  });
}

export function useRescheduleMechanisation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const { error } = await supabase
        .from('mechanisation_jobs')
        .update({ scheduled_date: newDate })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mechanisationKeys.all });
      toast.success('Job rescheduled successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reschedule job');
    },
  });
}
