// src/components/OfflineBanner.tsx
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, X, Cloud, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSyncStatus } from '@/hooks/api/useSyncStatus'; // Real pending count

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  const { data: syncStatus } = useSyncStatus();
  const pendingCount = syncStatus?.pending || 0;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-dismiss when back online
  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  // Hide if online and no pending, or dismissed
  if ((isOnline && pendingCount === 0) || dismissed) return null;

  const isOffline = !isOnline;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium shadow-lg transition-all duration-500',
        isOffline
          ? 'bg-orange-500 text-orange-950 animate-in slide-in-from-top'
          : 'bg-amber-500/95 text-amber-950 backdrop-blur-sm animate-pulse'
      )}
      role="alert"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <WifiOff className="w-5 h-5 animate-pulse" />
          <span>
            You're offline. {pendingCount > 0 ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} queued for sync.` : 'Changes will sync when you reconnect.'}
          </span>
        </>
      ) : (
        <>
          <Cloud className="w-5 h-5 text-emerald-600" />
          <span className="flex items-center gap-2">
            <span>Back online!</span>
            {pendingCount > 0 && (
              <>
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>{pendingCount} item{pendingCount > 1 ? 's' : ''} syncing...</span>
              </>
            )}
          </span>
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-7 w-7 rounded-full hover:bg-white/20 transition-colors',
          isOffline ? 'text-orange-950' : 'text-amber-950'
        )}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
