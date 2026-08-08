import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/queryConfig';
import { fetchCommunicationStats } from '@/lib/backend';

/**
 * Live counts for the Communication dashboard's SMS metric cards.
 * These tables (communication_messages/scheduled_messages) aren't in the
 * generated Supabase types yet, so — matching every other read in this
 * module (templates, scheduled SMS, weather) — this goes through the
 * Express backend rather than a direct typed Supabase query.
 */
export function useCommunicationStats() {
  return useQuery({
    queryKey: ['communication-stats'],
    queryFn: fetchCommunicationStats,
    staleTime: STALE_TIME.SHORT,
  });
}
