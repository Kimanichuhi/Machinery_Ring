// src/hooks/api/useFarmerTrainings.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FarmerTrainingAttendance {
  id: string;
  training_id: string;
  attended: boolean;
  created_at: string;
  // Training details
  title: string;
  training_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  venue: string | null;
  duration_hours: number | null;
  trainer: string | null;
  status: string;
  local_mr_name?: string;
}

export const farmerTrainingKeys = {
  all: ['farmer-trainings'] as const,
  list: (farmerId: string) => [...farmerTrainingKeys.all, farmerId] as const,
};

/**
 * Fetches all trainings a specific farmer has attended
 * Uses the training_attendees junction table
 */
export function useFarmerTrainings(farmerId: string) {
  return useQuery({
    queryKey: farmerTrainingKeys.list(farmerId),
    queryFn: async () => {
      // Fetch training attendees for this farmer
      const { data: attendances, error: attendancesError } = await supabase
        .from('training_attendees')
        .select('*')
        .eq('farmer_id', farmerId);

      if (attendancesError) throw attendancesError;

      if (!attendances || attendances.length === 0) {
        return [];
      }

      // Get training IDs
      const trainingIds = attendances.map(a => a.training_id);

      // Fetch training details
      const { data: trainings, error: trainingsError } = await supabase
        .from('trainings')
        .select('*')
        .in('id', trainingIds);

      if (trainingsError) throw trainingsError;

      // Fetch local MR names for trainings
      const localMrIds = (trainings || [])
        .map(t => t.local_mr_id)
        .filter((id): id is string => id !== null);

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

      // Build training map
      const trainingsMap = new Map(
        (trainings || []).map(t => [t.id, {
          ...t,
          local_mr_name: t.local_mr_id ? localMrsMap[t.local_mr_id] : undefined,
        }])
      );

      // Combine attendance with training details
      return attendances.map(attendance => {
        const training = trainingsMap.get(attendance.training_id);
        return {
          id: attendance.id,
          training_id: attendance.training_id,
          attended: attendance.attended,
          created_at: attendance.created_at,
          title: training?.title || 'Unknown Training',
          training_type: training?.training_type || '',
          scheduled_date: training?.scheduled_date || '',
          scheduled_time: training?.scheduled_time,
          venue: training?.venue,
          duration_hours: training?.duration_hours,
          trainer: training?.trainer,
          status: training?.status || '',
          local_mr_name: training?.local_mr_name,
        } as FarmerTrainingAttendance;
      }).sort((a, b) => 
        new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
      );
    },
    enabled: !!farmerId,
    staleTime: 1000 * 60 * 5,
  });
}
