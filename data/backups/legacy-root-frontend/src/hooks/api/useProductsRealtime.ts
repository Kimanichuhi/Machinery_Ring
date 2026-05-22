import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { productKeys } from './useProducts';

/**
 * Hook to subscribe to real-time product updates
 * Automatically invalidates product queries when changes occur
 */
export function useProductsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          console.log('Product change detected:', payload.eventType);
          // Invalidate all product queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: productKeys.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
