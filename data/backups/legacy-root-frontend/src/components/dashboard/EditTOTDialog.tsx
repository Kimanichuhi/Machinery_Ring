import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateUser } from '@/hooks/api/useUsers';
import { useSupabaseLocalMRs } from '@/hooks/api/useSupabaseDashboard';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditTOTDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tot: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    status: string;
    localMrId?: string;
  } | null;
}

export function EditTOTDialog({ open, onOpenChange, tot }: EditTOTDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    localMrId: '',
    status: 'active' as 'active' | 'inactive',
  });

  const updateUser = useUpdateUser();
  const { data: localMRs = [] } = useSupabaseLocalMRs();

  useEffect(() => {
    if (tot) {
      setFormData({
        name: tot.name || '',
        email: tot.email || '',
        phone: tot.phone || '',
        localMrId: tot.localMrId || '',
        status: tot.status === 'inactive' ? 'inactive' : 'active',
      });
    }
  }, [tot]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''));

  const handleSubmit = () => {
    if (!tot) return;
    if (!formData.name.trim()) return toast.error('Name is required');
    if (!validateEmail(formData.email)) return toast.error('Valid email required');
    if (!validatePhone(formData.phone)) return toast.error('Valid phone required (10-15 digits)');
    if (!formData.localMrId) return toast.error('Please assign a Local MR');

    updateUser.mutate(
      {
        id: tot.id,
        data: {
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone.trim(),
          role: 'tot',
          status: formData.status,
          localMrId: formData.localMrId,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err: any) => toast.error(err.message || 'Failed to update TOT'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit TOT</DialogTitle>
          <DialogDescription>Update details for {tot?.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label>Phone Number *</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
              maxLength={15}
            />
          </div>

          <div className="space-y-2">
            <Label>Local MR *</Label>
            <Select value={formData.localMrId} onValueChange={(v) => setFormData(p => ({ ...p, localMrId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Local MR" />
              </SelectTrigger>
              <SelectContent>
                {localMRs.map((mr) => (
                  <SelectItem key={mr.id} value={mr.id}>
                    {mr.name} ({mr.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData(p => ({ ...p, status: v as 'active' | 'inactive' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateUser.isPending}>
            {updateUser.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
