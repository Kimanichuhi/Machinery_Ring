import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, Calendar, DollarSign, User, AlertTriangle } from 'lucide-react';
import { useMachineryServiceHistory } from '@/hooks/api/useMachineryService';
import { Skeleton } from '@/components/ui/skeleton';

interface MachineryServiceHistoryProps {
  machineryId?: string;
  showMachineryName?: boolean;
}

const serviceTypeColors: Record<string, string> = {
  routine: 'secondary',
  repair: 'warning',
  inspection: 'default',
  overhaul: 'destructive',
};

export function MachineryServiceHistory({ machineryId, showMachineryName = false }: MachineryServiceHistoryProps) {
  const { data: records = [], isLoading } = useMachineryServiceHistory({ machineryId });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No service records found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map(record => (
        <Card key={record.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                {showMachineryName && (
                  <p className="font-semibold">{record.machinery_name}</p>
                )}
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  <span className="font-medium">{record.description}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(record.service_date), 'MMM d, yyyy')}</span>
                  </div>
                  {(record.cost ?? 0) > 0 && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>KES {(record.cost ?? 0).toLocaleString()}</span>
                    </div>
                  )}
                  {record.performed_by && (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{record.performed_by}</span>
                    </div>
                  )}
                </div>
                {record.next_service_date && (
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Next service: {format(new Date(record.next_service_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
              <Badge variant={serviceTypeColors[record.service_type] as any}>
                {record.service_type}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
