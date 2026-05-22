import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useFarmers } from '@/hooks/api/useFarmers';
import { useLocalMRs } from '@/hooks/api/useLocalMRs';
import { useUsers } from '@/hooks/api/useUsers';
import { useCreateBooking } from '@/hooks/api/useMachineryBookings';

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineryId: string;
  machineryName: string;
}

export function BookingDialog({ open, onOpenChange, machineryId, machineryName }: BookingDialogProps) {
  const [formData, setFormData] = useState({
    farmer_id: '',
    local_mr_id: '',
    tot_id: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    purpose: '',
    notes: '',
  });

  const { data: farmers = [] } = useFarmers();
  const { data: localMRs = [] } = useLocalMRs();
  const { data: users = [] } = useUsers({ role: 'tot' });
  const createBooking = useCreateBooking();

  // Filter TOTs by selected Local MR
  const filteredTots = useMemo(() => {
    if (!formData.local_mr_id) return users;
    return users.filter(u => u.local_mr_id === formData.local_mr_id);
  }, [users, formData.local_mr_id]);

  const handleSubmit = () => {
    if (!formData.start_date || !formData.end_date) {
      return;
    }

    createBooking.mutate({
      machinery_id: machineryId,
      farmer_id: formData.farmer_id || undefined,
      local_mr_id: formData.local_mr_id || undefined,
      tot_id: formData.tot_id || undefined,
      start_date: formData.start_date,
      end_date: formData.end_date,
      start_time: formData.start_time || undefined,
      end_time: formData.end_time || undefined,
      purpose: formData.purpose || undefined,
      notes: formData.notes || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          farmer_id: '',
          local_mr_id: '',
          tot_id: '',
          start_date: '',
          end_date: '',
          start_time: '',
          end_time: '',
          purpose: '',
          notes: '',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book {machineryName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={e => setFormData(p => ({ ...p, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={e => setFormData(p => ({ ...p, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Local MR</Label>
            <Select value={formData.local_mr_id} onValueChange={v => setFormData(p => ({ ...p, local_mr_id: v, tot_id: '' }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Local MR" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {localMRs.map(mr => (
                  <SelectItem key={mr.id} value={mr.id}>{mr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>TOT (Connected By)</Label>
            <Select value={formData.tot_id} onValueChange={v => setFormData(p => ({ ...p, tot_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select TOT" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {filteredTots.map(tot => (
                  <SelectItem key={tot.id} value={tot.id}>{tot.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Farmer</Label>
            <Select value={formData.farmer_id} onValueChange={v => setFormData(p => ({ ...p, farmer_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Farmer" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {farmers.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Purpose</Label>
            <Input
              placeholder="e.g., Land preparation, Harvesting"
              value={formData.purpose}
              onChange={e => setFormData(p => ({ ...p, purpose: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createBooking.isPending}>
            {createBooking.isPending ? 'Booking...' : 'Create Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
