import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, MapPin, X, Play, CheckCircle } from 'lucide-react';
import { useMachineryBookings, useUpdateBookingStatus, useCancelBooking } from '@/hooks/api/useMachineryBookings';
import { Skeleton } from '@/components/ui/skeleton';

interface MachineryBookingsListProps {
  machineryId?: string;
  showMachineryName?: boolean;
  isAdmin?: boolean;
}

const statusColors: Record<string, string> = {
  scheduled: 'secondary',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'destructive',
};

export function MachineryBookingsList({ machineryId, showMachineryName = false, isAdmin = false }: MachineryBookingsListProps) {
  const { data: bookings = [], isLoading } = useMachineryBookings({ machineryId });
  const updateStatus = useUpdateBookingStatus();
  const cancelBooking = useCancelBooking();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No bookings found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map(booking => (
        <Card key={booking.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                {showMachineryName && (
                  <p className="font-semibold">{booking.machinery_name}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(booking.start_date), 'MMM d, yyyy')}
                    {booking.end_date !== booking.start_date && (
                      <> - {format(new Date(booking.end_date), 'MMM d, yyyy')}</>
                    )}
                  </span>
                </div>
                {booking.farmer_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4" />
                    <span>{booking.farmer_name}</span>
                  </div>
                )}
                {booking.local_mr_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{booking.local_mr_name}</span>
                  </div>
                )}
                {booking.purpose && (
                  <p className="text-sm">{booking.purpose}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={statusColors[booking.status] as any}>
                  {booking.status.replace('_', ' ')}
                </Badge>
                {isAdmin && booking.status === 'scheduled' && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({
                        id: booking.id,
                        status: 'in_progress',
                        machineryId: booking.machinery_id,
                      })}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelBooking.mutate({
                        id: booking.id,
                        machineryId: booking.machinery_id,
                      })}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                {isAdmin && booking.status === 'in_progress' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus.mutate({
                      id: booking.id,
                      status: 'completed',
                      machineryId: booking.machinery_id,
                    })}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Complete
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
