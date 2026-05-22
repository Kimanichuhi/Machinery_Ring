// src/hooks/api/useSyncStatus.ts
import { useQuery } from '@tanstack/react-query';

// Simple sync status hook - returns pending sync count
export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync', 'status'],
    queryFn: async () => {
      // In a real app, this would check IndexedDB or a sync queue
      // For now, return 0 (no pending items)
      return { pending: 0 };
    },
    refetchInterval: false,
    staleTime: 5000,
  });
}
