// src/hooks/api/useTrainings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Training {
  id: string;
  title: string;
  description: string | null;
  training_type: string;
  trainer_id: string;
  local_mr_id: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_hours: number | null;
  venue: string | null;
  max_attendees: number | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  trainer_name?: string;
  local_mr_name?: string;
  attendees_count?: number;
}

export interface TrainingFilters {
  localMrId?: string;
  trainerId?: string;
  status?: string;
}

export const trainingKeys = {
  all: ['trainings'] as const,
  lists: () => [...trainingKeys.all, 'list'] as const,
  list: (filters: TrainingFilters = {}) => [...trainingKeys.lists(), filters] as const,
  details: () => [...trainingKeys.all, 'detail'] as const,
  detail: (id: string) => [...trainingKeys.details(), id] as const,
};

export function useTrainings(filters: TrainingFilters = {}) {
  return useQuery({
    queryKey: trainingKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('trainings')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (filters.localMrId) {
        query = query.eq('local_mr_id', filters.localMrId);
      }
      if (filters.trainerId) {
        query = query.eq('trainer_id', filters.trainerId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching trainings:', error);
        throw error;
      }

      // Get unique local_mr_ids and trainer_ids (filter out null values with type guard)
      const localMrIds = (data || [])
        .map(t => t.local_mr_id)
        .filter((id): id is string => id !== null);
      const trainerIds = (data || [])
        .map(t => t.trainer_id)
        .filter((id): id is string => id !== null);

      // Fetch local MR names
      let localMrsMap: Record<string, string> = {};
      if (localMrIds.length > 0) {
        const { data: localMrs } = await supabase
          .from('local_mrs')
          .select('id, name')
          .in('id', localMrIds);
        localMrsMap = (localMrs || []).reduce((acc, m) => {
          acc[m.id] = m.name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Fetch trainer names
      let trainersMap: Record<string, string> = {};
      if (trainerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', trainerIds);
        trainersMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Fetch attendee counts
      const trainingIds = (data || []).map(t => t.id);
      let attendeeCounts: Record<string, number> = {};
      if (trainingIds.length > 0) {
        const { data: attendees } = await supabase
          .from('training_attendees')
          .select('training_id')
          .in('training_id', trainingIds);
        attendeeCounts = (attendees || []).reduce((acc, a) => {
          acc[a.training_id] = (acc[a.training_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }

      return (data || []).map((t: any) => ({
        ...t,
        local_mr_name: t.local_mr_id ? (localMrsMap[t.local_mr_id] || '') : '',
        attendees_count: attendeeCounts[t.id] || 0,
        // Use trainer text field if available, fallback to trainer_id lookup
        trainer: t.trainer || null,
        trainerName: t.trainer || trainersMap[t.trainer_id] || 'Trainer',
        type: t.training_type,
        location: t.venue || '',
        date: t.scheduled_date,
        duration: t.duration_hours || 0,
        attendees: Array(attendeeCounts[t.id] || 0).fill({}),
        topics: t.description ? t.description.split(',').map((s: string) => s.trim()) : [],
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useTraining(id: string) {
  return useQuery({
    queryKey: trainingKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Fetch local MR name
      let localMrName = '';
      if (data.local_mr_id) {
        const { data: localMr } = await supabase
          .from('local_mrs')
          .select('name')
          .eq('id', data.local_mr_id)
          .single();
        localMrName = localMr?.name || '';
      }

      // Fetch trainer name
      let trainerName = 'Trainer';
      if (data.trainer_id) {
        const { data: trainer } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', data.trainer_id)
          .single();
        trainerName = trainer?.name || 'Trainer';
      }

      // Fetch attendees (both farmers and TOTs)
      const { data: attendees } = await supabase
        .from('training_attendees')
        .select('farmer_id, profile_id, attended')
        .eq('training_id', id);

      return {
        ...data,
        local_mr_name: localMrName,
        // Use trainer text field if available, fallback to trainer_id lookup
        trainer: data.trainer || null,
        trainerName: data.trainer || trainerName,
        type: data.training_type,
        location: data.venue || '',
        date: data.scheduled_date,
        duration: data.duration_hours || 0,
        attendees: attendees || [],
        topics: data.description ? data.description.split(',').map((s: string) => s.trim()) : [],
      };
    },
    enabled: !!id,
  });
}

export interface CreateTrainingDto {
  title: string;
  description?: string;
  training_type: string;
  trainer_id: string;
  trainer?: string; // Text field for trainer name
  local_mr_id?: string;
  scheduled_date: string;
  scheduled_time?: string;
  duration_hours?: number;
  venue?: string;
  max_attendees?: number;
  status?: string;
}

export function useCreateTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTrainingDto) => {
      const { data: training, error } = await supabase
        .from('trainings')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return training;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.all });
      toast.success('Training scheduled successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create training');
    },
  });
}

export function useUpdateTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTrainingDto> }) => {
      const { data: training, error } = await supabase
        .from('trainings')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return training;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.all });
      toast.success('Training updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update training');
    },
  });
}

export function useDeleteTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trainings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.all });
      toast.success('Training deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete training');
    },
  });
}

export function useCompleteTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trainings')
        .update({
          status: 'Completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.all });
      toast.success('Training marked as completed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete training');
    },
  });
}

export function useAddAttendee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trainingId, farmerId }: { trainingId: string; farmerId: string }) => {
      const { error } = await supabase
        .from('training_attendees')
        .insert({
          training_id: trainingId,
          farmer_id: farmerId,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.detail(variables.trainingId) });
      toast.success('Attendee added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add attendee');
    },
  });
}

export interface AttendeeInput {
  id: string;
  type: 'farmer' | 'tot';
}

export function useAddMultipleAttendees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trainingId, attendees }: { trainingId: string; attendees: AttendeeInput[] }) => {
      // Separate farmers and TOTs
      const attendeeRecords = attendees.map(attendee => {
        if (attendee.type === 'tot') {
          return {
            training_id: trainingId,
            farmer_id: null,
            profile_id: attendee.id,
            attended: true,
          };
        } else {
          return {
            training_id: trainingId,
            farmer_id: attendee.id,
            profile_id: null,
            attended: true,
          };
        }
      });

      // Insert attendees one by one to avoid upsert issues with the new constraint
      for (const record of attendeeRecords) {
        // Check if already exists
        let existsQuery = supabase
          .from('training_attendees')
          .select('id')
          .eq('training_id', trainingId);
        
        if (record.farmer_id) {
          existsQuery = existsQuery.eq('farmer_id', record.farmer_id);
        } else if (record.profile_id) {
          existsQuery = existsQuery.eq('profile_id', record.profile_id);
        }

        const { data: existing } = await existsQuery.maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('training_attendees')
            .insert(record);
          
          if (error) throw error;
        }
      }
      
      // Note: trainings_attended count is now automatically updated via database trigger
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.detail(variables.trainingId) });
      queryClient.invalidateQueries({ queryKey: trainingKeys.all });
      // Also invalidate farmers to reflect the trigger-updated training counts
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
      queryClient.invalidateQueries({ queryKey: ['supabase', 'farmers'] });
      queryClient.invalidateQueries({ queryKey: ['farmer-trainings'] });
      toast.success('Attendance recorded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record attendance');
    },
  });
}
