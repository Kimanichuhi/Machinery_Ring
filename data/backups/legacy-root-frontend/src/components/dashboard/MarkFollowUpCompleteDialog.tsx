import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle2, CalendarIcon, Loader2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useMarkFollowUpComplete, OverdueVisit } from '@/hooks/api/useOverdueFollowUps';
import { useCreateVisit } from '@/hooks/api/useVisits';

interface MarkFollowUpCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: OverdueVisit | null;
}

export function MarkFollowUpCompleteDialog({
  open,
  onOpenChange,
  visit,
}: MarkFollowUpCompleteDialogProps) {
  const [createLinkedVisit, setCreateLinkedVisit] = useState(false);
  const [notes, setNotes] = useState('');
  const [scheduleAnother, setScheduleAnother] = useState(false);
  const [nextFollowUpDate, setNextFollowUpDate] = useState<Date | null>(null);

  const { mutate: markComplete, isPending: isMarkingComplete } = useMarkFollowUpComplete();
  const { mutate: createVisit, isPending: isCreatingVisit } = useCreateVisit();

  const isPending = isMarkingComplete || isCreatingVisit;

  const handleSubmit = () => {
    if (!visit) return;

    // Mark the original visit's follow-up as complete
    markComplete(
      { visitId: visit.id },
      {
        onSuccess: () => {
          // If user wants to create a linked follow-up visit
          if (createLinkedVisit) {
            createVisit(
              {
                farmer_id: visit.farmer_id,
                tot_id: visit.tot_id,
                local_mr_id: visit.local_mr_id || undefined,
                purpose: `Follow-up: ${visit.purpose}`,
                notes: notes || `Follow-up visit for ${visit.farmer_name}`,
                visit_date: new Date().toISOString(),
                parent_visit_id: visit.id,
                follow_up_required: scheduleAnother,
                follow_up_date: scheduleAnother && nextFollowUpDate 
                  ? nextFollowUpDate.toISOString() 
                  : undefined,
              },
              {
                onSuccess: () => {
                  resetAndClose();
                },
              }
            );
          } else {
            resetAndClose();
          }
        },
      }
    );
  };

  const resetAndClose = () => {
    setCreateLinkedVisit(false);
    setNotes('');
    setScheduleAnother(false);
    setNextFollowUpDate(null);
    onOpenChange(false);
  };

  if (!visit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Complete Follow-up
          </DialogTitle>
          <DialogDescription>
            Mark the follow-up for <strong>{visit.farmer_name}</strong> as completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Option to create a linked visit record */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30">
            <Checkbox
              id="createLinkedVisit"
              checked={createLinkedVisit}
              onCheckedChange={(checked) => setCreateLinkedVisit(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="createLinkedVisit" className="cursor-pointer flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Create a linked follow-up visit record
              </Label>
              <p className="text-xs text-muted-foreground">
                This will log a new visit linked to the original, reflecting in TOT stats and farmer history.
              </p>
            </div>
          </div>

          {createLinkedVisit && (
            <div className="space-y-4 animate-fade-in">
              {/* Notes for the follow-up visit */}
              <div className="space-y-2">
                <Label htmlFor="notes">Visit Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes from the follow-up visit..."
                  rows={3}
                />
              </div>

              {/* Option to schedule another follow-up */}
              <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/30">
                <Checkbox
                  id="scheduleAnother"
                  checked={scheduleAnother}
                  onCheckedChange={(checked) => {
                    setScheduleAnother(checked === true);
                    if (!checked) setNextFollowUpDate(null);
                  }}
                />
                <Label htmlFor="scheduleAnother" className="cursor-pointer">
                  Schedule another follow-up visit
                </Label>
              </div>

              {scheduleAnother && (
                <div className="space-y-2 animate-fade-in">
                  <Label>Next Follow-up Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !nextFollowUpDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {nextFollowUpDate
                          ? format(nextFollowUpDate, "PPP")
                          : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={nextFollowUpDate || undefined}
                        onSelect={(date) => setNextFollowUpDate(date || null)}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Complete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
