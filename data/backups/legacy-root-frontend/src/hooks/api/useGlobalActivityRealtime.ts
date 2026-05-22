import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Real-time subscription hook for global activity updates.
 * Listens to changes on sales, trainings, machinery_bookings, visits, and farmers tables.
 */
export function useGlobalActivityRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('global-activity-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['global-activity'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trainings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['global-activity'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'machinery_bookings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['global-activity'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['global-activity'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'farmers' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['global-activity'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_attendees' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['global-activity'] });
          queryClient.invalidateQueries({ queryKey: ['farmer-trainings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
