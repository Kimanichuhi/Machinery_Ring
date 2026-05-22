import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Calendar, MapPin, User, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOverdueFollowUps, usePendingFollowUps, OverdueVisit } from '@/hooks/api/useOverdueFollowUps';
import { MarkFollowUpCompleteDialog } from './MarkFollowUpCompleteDialog';

interface OverdueFollowUpsProps {
  localMrId?: string;
  totId?: string;
  limit?: number;
  showPending?: boolean;
}

export function OverdueFollowUps({ localMrId, totId, limit = 5, showPending = false }: OverdueFollowUpsProps) {
  const navigate = useNavigate();
  const [selectedVisit, setSelectedVisit] = useState<OverdueVisit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { data: overdueVisits = [], isLoading: overdueLoading } = useOverdueFollowUps({ localMrId, totId });
  const { data: pendingVisits = [], isLoading: pendingLoading } = usePendingFollowUps({ localMrId, totId });

  const isLoading = overdueLoading || pendingLoading;
  const allVisits = showPending 
    ? [...overdueVisits, ...pendingVisits].slice(0, limit)
    : overdueVisits.slice(0, limit);
  const totalCount = showPending 
    ? overdueVisits.length + pendingVisits.length
    : overdueVisits.length;

  const getDaysOverdue = (followUpDate: string) => {
    const date = new Date(followUpDate);
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyBadge = (daysOverdue: number) => {
    if (daysOverdue > 14) return { variant: 'destructive' as const, label: 'Critical' };
    if (daysOverdue > 7) return { variant: 'warning' as const, label: 'High' };
    if (daysOverdue > 0) return { variant: 'secondary' as const, label: 'Overdue' };
    return { variant: 'outline' as const, label: 'Upcoming' };
  };

  const handleMarkComplete = (e: React.MouseEvent, visit: OverdueVisit) => {
    e.stopPropagation();
    setSelectedVisit(visit);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Follow-up Visits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Follow-up Visits
              {overdueVisits.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {overdueVisits.length} overdue
                </Badge>
              )}
            </CardTitle>
            {totalCount > limit && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/visits')}
                className="text-xs"
              >
                View All
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {allVisits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20 text-primary" />
              <p className="text-sm">No pending follow-ups</p>
              <p className="text-xs">All visits are up to date!</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {allVisits.map(visit => {
                  const daysOverdue = getDaysOverdue(visit.follow_up_date!);
                  const urgency = getUrgencyBadge(daysOverdue);
                  const isOverdue = daysOverdue > 0;

                  return (
                    <div 
                      key={visit.id} 
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        isOverdue 
                          ? 'border-warning/30 bg-warning/5 hover:bg-warning/10' 
                          : 'border-border bg-muted/30 hover:bg-muted/50'
                      }`}
                      onClick={() => navigate(`/visits/${visit.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{visit.farmer_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={urgency.variant} className="text-xs flex-shrink-0">
                            {urgency.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => handleMarkComplete(e, visit)}
                            title="Mark as completed"
                          >
                            <CheckCircle2 className="w-3 h-3 text-primary" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {isOverdue 
                              ? `${daysOverdue} days overdue` 
                              : `Due in ${Math.abs(daysOverdue)} days`}
                          </span>
                        </div>
                        {visit.local_mr_name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{visit.local_mr_name}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        Purpose: {visit.purpose}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <MarkFollowUpCompleteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        visit={selectedVisit}
      />
    </>
  );
}
