import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFarmers } from '@/hooks/api/useFarmers';
import { useUpdateSale, UpdateSaleDto } from '@/hooks/api/useSales';
import { useAuth } from '@/contexts/AuthContext';

interface EditSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: any | null;
}

export function EditSaleDialog({ open, onOpenChange, sale }: EditSaleDialogProps) {
  const { data: farmers = [] } = useFarmers();
  const updateSale = useUpdateSale();
  const { user, isAdmin } = useAuth();

  const [form, setForm] = useState({
    farmerId: '',
    date: '',
    deliveryNoteNumber: '',
    paymentMethod: 'cash',
    notes: '',
  });

  useEffect(() => {
    if (sale && open) {
      setForm({
        farmerId: sale.farmerId || sale.farmer_id || '',
        date: sale.date ? new Date(sale.date).toISOString().split('T')[0] : '',
        deliveryNoteNumber: sale.deliveryNoteNumber || sale.delivery_note_number || '',
        paymentMethod: sale.payment_method || 'cash',
        notes: sale.notes || '',
      });
    }
  }, [sale, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    const updates: UpdateSaleDto = {
      farmer_id: form.farmerId || null,
      sale_date: form.date ? new Date(form.date).toISOString() : undefined,
      delivery_note_number: form.deliveryNoteNumber.trim() || null,
      payment_method: form.paymentMethod,
      notes: form.notes.trim() || null,
    };
    await updateSale.mutateAsync({ id: sale.id, updates });
    onOpenChange(false);
  };

  const isCancelled = sale && sale.status === 'cancelled';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Sale {sale?.status === 'completed' && <span className="text-xs text-muted-foreground font-normal ml-2">(completed — financial fields locked)</span>}</DialogTitle>
        </DialogHeader>
        {isCancelled && !isAdmin ? (
          <div className="py-6 text-sm text-muted-foreground">
            This sale has been cancelled and cannot be edited. Contact an administrator to make changes.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Farmer (optional)</Label>
              <Select value={form.farmerId || 'walk-in'} onValueChange={(v) => setForm({ ...form, farmerId: v === 'walk-in' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[200] max-h-[200px] overflow-y-auto">
                  <SelectItem value="walk-in">Walk-in (no farmer)</SelectItem>
                  {farmers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name} - {f.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sale Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} max={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="space-y-2">
              <Label>Delivery Note Number</Label>
              <Input value={form.deliveryNoteNumber} onChange={(e) => setForm({ ...form, deliveryNoteNumber: e.target.value })} placeholder="e.g. DN-00123" />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" variant="wheat" className="flex-1" disabled={updateSale.isPending}>
                {updateSale.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
