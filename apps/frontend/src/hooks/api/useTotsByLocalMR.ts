// src/hooks/api/useTotsByLocalMR.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TotUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  localMrId: string;
}

/**
 * Fetch TOTs assigned to a specific Local MR from Supabase
 */
export function useTotsByLocalMR(localMrId: string) {
  return useQuery({
    queryKey: ['tots', 'localMr', localMrId],
    queryFn: async () => {
      if (!localMrId) return [];

      // Get TOT assignments for this Local MR
      const { data: assignments, error: assignError } = await supabase
        .from('tot_assignments')
        .select('tot_id')
        .eq('local_mr_id', localMrId)
        .eq('status', 'active');

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) return [];

      const totIds = assignments.map(a => a.tot_id);

      // Get profiles for these TOTs
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, status')
        .in('id', totIds);

      if (profileError) throw profileError;

      return (profiles || []).map((p): TotUser => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone || undefined,
        status: p.status,
        localMrId,
      }));
    },
    enabled: !!localMrId,
    staleTime: 1000 * 60 * 5,
  });
}
