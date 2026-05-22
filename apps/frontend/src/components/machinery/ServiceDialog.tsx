import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCreateServiceRecord } from '@/hooks/api/useMachineryService';

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineryId: string;
  machineryName: string;
}

export function ServiceDialog({ open, onOpenChange, machineryId, machineryName }: ServiceDialogProps) {
  const [formData, setFormData] = useState({
    service_type: 'routine' as 'routine' | 'repair' | 'inspection' | 'overhaul',
    service_date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    performed_by: '',
    next_service_date: '',
    odometer_reading: '',
    notes: '',
  });

  const createService = useCreateServiceRecord();

  const handleSubmit = () => {
    if (!formData.description || !formData.service_date) {
      return;
    }

    createService.mutate({
      machinery_id: machineryId,
      service_type: formData.service_type,
      service_date: formData.service_date,
      description: formData.description,
      cost: formData.cost ? Number(formData.cost) : undefined,
      performed_by: formData.performed_by || undefined,
      next_service_date: formData.next_service_date || undefined,
      odometer_reading: formData.odometer_reading ? Number(formData.odometer_reading) : undefined,
      notes: formData.notes || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          service_type: 'routine',
          service_date: new Date().toISOString().split('T')[0],
          description: '',
          cost: '',
          performed_by: '',
          next_service_date: '',
          odometer_reading: '',
          notes: '',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Service for {machineryName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service Type *</Label>
              <Select
                value={formData.service_type}
                onValueChange={v => setFormData(p => ({ ...p, service_type: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="overhaul">Overhaul</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service Date *</Label>
              <Input
                type="date"
                value={formData.service_date}
                onChange={e => setFormData(p => ({ ...p, service_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Describe the service performed..."
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cost (KES)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.cost}
                onChange={e => setFormData(p => ({ ...p, cost: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Performed By</Label>
              <Input
                placeholder="Technician name"
                value={formData.performed_by}
                onChange={e => setFormData(p => ({ ...p, performed_by: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Next Service Date</Label>
              <Input
                type="date"
                value={formData.next_service_date}
                onChange={e => setFormData(p => ({ ...p, next_service_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Odometer Reading</Label>
              <Input
                type="number"
                placeholder="Hours/KM"
                value={formData.odometer_reading}
                onChange={e => setFormData(p => ({ ...p, odometer_reading: e.target.value }))}
              />
            </div>
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
          <Button onClick={handleSubmit} disabled={createService.isPending}>
            {createService.isPending ? 'Saving...' : 'Log Service'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
