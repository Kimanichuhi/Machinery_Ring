import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalActivity, ActivityItem } from '@/hooks/api/useGlobalActivity';
import { useGlobalActivityRealtime } from '@/hooks/api/useGlobalActivityRealtime';
import { 
  ShoppingCart, 
  GraduationCap, 
  Tractor, 
  MapPin, 
  UserPlus,
  Activity
} from 'lucide-react';

const activityIcons: Record<ActivityItem['type'], React.ElementType> = {
  sale: ShoppingCart,
  training: GraduationCap,
  booking: Tractor,
  visit: MapPin,
  farmer: UserPlus,
};

const activityColors: Record<ActivityItem['type'], string> = {
  sale: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  training: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  booking: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  visit: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  farmer: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
};

interface GlobalRecentActivityProps {
  limit?: number;
  className?: string;
}

export function GlobalRecentActivity({ limit = 15, className }: GlobalRecentActivityProps) {
  const { data: activities, isLoading } = useGlobalActivity(limit);
  
  // Enable real-time updates
  useGlobalActivityRealtime();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {!activities || activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No recent activity
            </p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type];
                const colorClass = activityColors[activity.type];

                return (
                  <div key={activity.id} className="flex items-start gap-3 group">
                    <div className={`p-2 rounded-full ${colorClass} transition-transform group-hover:scale-110`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {activity.time}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
