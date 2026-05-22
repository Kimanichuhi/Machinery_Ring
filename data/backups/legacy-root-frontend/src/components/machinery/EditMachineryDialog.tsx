import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useUpdateMachinery } from '@/hooks/api/useMachinery';
import { Loader2 } from 'lucide-react';

const MACHINERY_CATEGORIES = [
  'Tractors',
  'Harvesters',
  'Ploughs',
  'Planters',
  'Sprayers',
  'Irrigation Equipment',
  'Threshers',
  'Transport',
  'Other',
] as const;

type MachineryStatus = 'available' | 'in_use' | 'maintenance' | 'retired';

interface EditMachineryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machinery: {
    id: string;
    name: string;
    category: string;
    model?: string | null;
    registration_number?: string | null;
    condition?: string | null;
    status: string;
    daily_rate: number;
    hourly_rate: number;
  } | null;
}

export function EditMachineryDialog({ open, onOpenChange, machinery }: EditMachineryDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    model: '',
    registration_number: '',
    condition: 'good',
    status: 'available' as MachineryStatus,
    daily_rate: 0,
    hourly_rate: 0,
  });

  const updateMachinery = useUpdateMachinery();

  useEffect(() => {
    if (machinery) {
      setFormData({
        name: machinery.name,
        category: machinery.category,
        model: machinery.model || '',
        registration_number: machinery.registration_number || '',
        condition: machinery.condition || 'good',
        status: machinery.status as MachineryStatus,
        daily_rate: machinery.daily_rate,
        hourly_rate: machinery.hourly_rate,
      });
    }
  }, [machinery]);

  const handleSubmit = () => {
    if (!machinery || !formData.name || !formData.category) return;

    updateMachinery.mutate({
      id: machinery.id,
      data: {
        name: formData.name,
        category: formData.category,
        model: formData.model || undefined,
        registration_number: formData.registration_number || undefined,
        condition: formData.condition,
        status: formData.status,
        daily_rate: formData.daily_rate,
        hourly_rate: formData.hourly_rate,
      },
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Machinery</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="Machinery name"
            />
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {MACHINERY_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={formData.model}
                onChange={e => setFormData(p => ({ ...p, model: e.target.value }))}
                placeholder="e.g., John Deere 5045"
              />
            </div>
            <div className="space-y-2">
              <Label>Reg. Number</Label>
              <Input
                value={formData.registration_number}
                onChange={e => setFormData(p => ({ ...p, registration_number: e.target.value }))}
                placeholder="e.g., KAA 123X"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Daily Rate (KES)</Label>
              <Input
                type="number"
                value={formData.daily_rate}
                onChange={e => setFormData(p => ({ ...p, daily_rate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate (KES)</Label>
              <Input
                type="number"
                value={formData.hourly_rate}
                onChange={e => setFormData(p => ({ ...p, hourly_rate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={v => setFormData(p => ({ ...p, condition: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v as MachineryStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateMachinery.isPending}>
            {updateMachinery.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}