import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  weekly_reports: boolean;
  daily_digest: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationSettingsKeys = {
  all: ['notification-settings'] as const,
  user: (userId: string) => [...notificationSettingsKeys.all, userId] as const,
};

export function useNotificationSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: notificationSettingsKeys.user(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no settings exist, create default settings
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            email_notifications: true,
            sms_notifications: false,
            push_notifications: true,
            weekly_reports: true,
            daily_digest: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newSettings as NotificationSettings;
      }

      return data as NotificationSettings;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<Omit<NotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_settings')
        .update(settings)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationSettingsKeys.all });
      toast.success('Settings saved');
    },
    onError: (error: Error) => {
      toast.error('Failed to save settings');
      console.error('Error updating notification settings:', error);
    },
  });
}