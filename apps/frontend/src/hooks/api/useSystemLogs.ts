// src/hooks/api/useSystemLogs.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DisplaySystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  module: string;
  message: string;
  userId?: string;
  userName?: string;
}

export const systemLogKeys = {
  all: ['system-logs'] as const,
  list: () => [...systemLogKeys.all, 'list'] as const,
  audit: () => [...systemLogKeys.all, 'audit'] as const,
};

/**
 * Fetch audit logs from Supabase (replaces legacy system logs)
 * The system now uses audit_logs table for tracking actions
 */
export function useSystemLogs() {
  return useQuery({
    queryKey: systemLogKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          entity,
          entity_id,
          actor_id,
          actor_role,
          before_data,
          after_data,
          ip_address,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map((log): DisplaySystemLog => ({
        id: log.id,
        timestamp: new Date(log.created_at).toISOString(),
        level: 'info',
        module: log.entity,
        message: `${log.action} on ${log.entity}${log.entity_id ? ` (${log.entity_id.substring(0, 8)}...)` : ''}`,
        userId: log.actor_id || undefined,
        userName: log.actor_role || undefined,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch audit logs with detailed information
 */
export function useAuditLogs(filters?: {
  entity?: string;
  action?: string;
  actorId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...systemLogKeys.audit(), filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          entity,
          entity_id,
          actor_id,
          actor_role,
          before_data,
          after_data,
          ip_address,
          user_agent,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (filters?.entity) {
        query = query.eq('entity', filters.entity);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.actorId) {
        query = query.eq('actor_id', filters.actorId);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}
