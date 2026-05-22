import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MachineryBooking {
  id: string;
  machinery_id: string;
  farmer_id: string | null;
  mechanisation_job_id: string | null;
  booked_by: string;
  local_mr_id: string | null;
  tot_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  purpose: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  machinery_name?: string;
  farmer_name?: string;
  local_mr_name?: string;
  tot_name?: string;
}

export interface CreateBookingDto {
  machinery_id: string;
  farmer_id?: string;
  mechanisation_job_id?: string;
  local_mr_id?: string;
  tot_id?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  purpose?: string;
  notes?: string;
}

export const bookingKeys = {
  all: ['machinery-bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters: { machineryId?: string; status?: string } = {}) => [...bookingKeys.lists(), filters] as const,
  byMachinery: (machineryId: string) => [...bookingKeys.all, 'machinery', machineryId] as const,
};

export function useMachineryBookings(filters: { machineryId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('machinery_bookings')
        .select(`
          *,
          machinery:machinery_id(name),
          farmer:farmer_id(name),
          local_mr:local_mr_id(name),
          tot:tot_id(name)
        `)
        .order('start_date', { ascending: false });

      if (filters.machineryId) {
        query = query.eq('machinery_id', filters.machineryId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(b => ({
        ...b,
        machinery_name: b.machinery?.name || '',
        farmer_name: b.farmer?.name || '',
        local_mr_name: b.local_mr?.name || '',
        tot_name: b.tot?.name || '',
      }));
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBookingDto) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: booking, error } = await supabase
        .from('machinery_bookings')
        .insert({
          ...data,
          booked_by: user.id,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;

      // Update machinery status to in_use if booking starts today
      const today = new Date().toISOString().split('T')[0];
      if (data.start_date === today) {
        await supabase
          .from('machinery')
          .update({ status: 'in_use' })
          .eq('id', data.machinery_id);
      }

      return booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['machinery'] });
      toast.success('Booking created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create booking');
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, machineryId }: { id: string; status: string; machineryId: string }) => {
      const { error } = await supabase
        .from('machinery_bookings')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // Update machinery status based on booking status
      if (status === 'in_progress') {
        await supabase.from('machinery').update({ status: 'in_use' }).eq('id', machineryId);
      } else if (status === 'completed' || status === 'cancelled') {
        // Check if there are other active bookings
        const { data: activeBookings } = await supabase
          .from('machinery_bookings')
          .select('id')
          .eq('machinery_id', machineryId)
          .in('status', ['scheduled', 'in_progress'])
          .neq('id', id);

        if (!activeBookings?.length) {
          await supabase.from('machinery').update({ status: 'available' }).eq('id', machineryId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['machinery'] });
      toast.success('Booking status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update booking');
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, machineryId }: { id: string; machineryId: string }) => {
      const { error } = await supabase
        .from('machinery_bookings')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      // Check if machinery can be set back to available
      const { data: activeBookings } = await supabase
        .from('machinery_bookings')
        .select('id')
        .eq('machinery_id', machineryId)
        .in('status', ['scheduled', 'in_progress'])
        .neq('id', id);

      if (!activeBookings?.length) {
        await supabase.from('machinery').update({ status: 'available' }).eq('id', machineryId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['machinery'] });
      toast.success('Booking cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel booking');
    },
  });
}
