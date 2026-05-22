import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, Wrench } from 'lucide-react';
import { useUpcomingMaintenance } from '@/hooks/api/useMachineryService';
import { Skeleton } from '@/components/ui/skeleton';

export function UpcomingMaintenance() {
  const { data: upcoming = [], isLoading } = useUpcomingMaintenance();

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  if (!upcoming.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="w-5 h-5" />
            Upcoming Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No scheduled maintenance in the next 30 days
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="w-5 h-5" />
          Upcoming Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.slice(0, 5).map(item => {
          const daysUntil = differenceInDays(new Date(item.next_service_date!), new Date());
          const isUrgent = daysUntil <= 7;

          return (
            <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <p className="font-medium">{item.machinery_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(item.next_service_date!), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <Badge variant={isUrgent ? 'destructive' : 'secondary'}>
                {isUrgent && <AlertTriangle className="w-3 h-3 mr-1" />}
                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
