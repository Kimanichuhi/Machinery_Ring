import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Notification sound as a base64 encoded short beep
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' +
  'tvT18A' + 'gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA'.repeat(10) +
  '/4D/gP+A/4D/gP+A/4D/gP+A/4D/gP+A/4D/gP+A/4D/gP+A/4D/gP+A/4D/gP+A/4D/gP+A/4D/gP+A'.repeat(5);

const notificationTypeLabels: Record<string, string> = {
  sale: 'New Sale',
  training: 'Training Update',
  booking: 'Machinery Booking',
  visit: 'Farm Visit',
  system: 'System Alert',
  alert: 'Alert',
  info: 'Information',
};

export function useNotificationAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;

    return () => {
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as {
            id: string;
            title: string;
            message: string;
            type: string;
          };

          // Play notification sound
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {
              // Audio play may fail if user hasn't interacted with page
            });
          }

          // Show toast notification
          const typeLabel = notificationTypeLabels[notification.type] || 'Notification';
          toast(notification.title, {
            description: notification.message,
            duration: 5000,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = '/notifications';
              },
            },
          });

          // Invalidate queries to refresh notification data
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
