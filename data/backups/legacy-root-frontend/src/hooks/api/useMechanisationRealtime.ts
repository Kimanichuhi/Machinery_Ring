import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mechanisationKeys } from './useMechanisation';
import { bookingKeys } from './useMachineryBookings';
import { toast } from 'sonner';

export function useMechanisationRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to mechanisation_jobs changes
    const mechanisationChannel = supabase
      .channel('mechanisation-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mechanisation_jobs',
        },
        (payload) => {
          console.log('Mechanisation change:', payload);
          
          // Invalidate all mechanisation queries
          queryClient.invalidateQueries({ queryKey: mechanisationKeys.all });
          
          // Show toast for significant events
          if (payload.eventType === 'INSERT') {
            toast.info('New mechanisation booking created');
          } else if (payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            if (newData.status === 'completed') {
              toast.success('Mechanisation job completed');
            } else if (newData.status === 'approved') {
              toast.success('Mechanisation job approved');
            }
          }
        }
      )
      .subscribe();

    // Subscribe to machinery_bookings changes
    const bookingsChannel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'machinery_bookings',
        },
        (payload) => {
          console.log('Booking change:', payload);
          queryClient.invalidateQueries({ queryKey: bookingKeys.all });
          queryClient.invalidateQueries({ queryKey: ['machinery'] });
        }
      )
      .subscribe();

    // Subscribe to machinery changes
    const machineryChannel = supabase
      .channel('machinery-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'machinery',
        },
        (payload) => {
          console.log('Machinery change:', payload);
          queryClient.invalidateQueries({ queryKey: ['machinery'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(mechanisationChannel);
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(machineryChannel);
    };
  }, [queryClient]);
}
