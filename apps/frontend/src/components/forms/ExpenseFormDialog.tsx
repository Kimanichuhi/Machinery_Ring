// src/components/forms/ExpenseFormDialog.tsx
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLocalMRs } from '@/hooks/api/useLocalMRs';
import { CreateExpenseDto, Expense, UpdateExpenseDto } from '@/hooks/api/useExpenses';

export const EXPENSE_CATEGORIES = [
  'Fuel & Transport',
  'Machinery Maintenance',
  'Salaries & Wages',
  'Utilities',
  'Office Supplies',
  'Farmer Support',
  'Training & Events',
  'Communication',
  'Rent',
  'Other',
];

export const EXPENSE_PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
];

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateExpenseDto | UpdateExpenseDto) => void;
  expense?: Expense | null;
  isSubmitting?: boolean;
}

const emptyForm = {
  category: EXPENSE_CATEGORIES[0],
  description: '',
  amount: '',
  paymentMethod: 'cash',
  vendor: '',
  localMrId: '',
  notes: '',
  date: new Date().toISOString().split('T')[0],
};

export function ExpenseFormDialog({ open, onOpenChange, onSubmit, expense, isSubmitting }: ExpenseFormDialogProps) {
  const { toast } = useToast();
  const { data: localMRs = [] } = useLocalMRs();
  const [formData, setFormData] = useState(emptyForm);
  const isEditing = !!expense;

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setFormData({
        category: expense.category,
        description: expense.description,
        amount: String(expense.amount),
        paymentMethod: expense.payment_method,
        vendor: expense.vendor || '',
        localMrId: expense.local_mr_id || '',
        notes: expense.notes || '',
        date: expense.expense_date ? expense.expense_date.split('T')[0] : new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData(emptyForm);
    }
  }, [open, expense]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (!formData.description.trim()) {
      toast({ title: 'Validation Error', description: 'Please describe what this expense was for', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid amount greater than zero', variant: 'destructive' });
      return;
    }

    const payload = {
      category: formData.category,
      description: formData.description.trim(),
      amount,
      payment_method: formData.paymentMethod,
      vendor: formData.vendor.trim() || undefined,
      local_mr_id: formData.localMrId || null,
      notes: formData.notes.trim() || undefined,
      expense_date: formData.date ? new Date(formData.date).toISOString() : undefined,
    };

    onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Record New Expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 px-1">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose category" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {EXPENSE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              placeholder="What was this expense for?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Amount (KES) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {EXPENSE_PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Paid To (optional)</Label>
            <Input
              placeholder="Vendor, supplier, or payee"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Local MR (optional)</Label>
            <Select value={formData.localMrId || 'none'} onValueChange={(value) => setFormData({ ...formData, localMrId: value === 'none' ? '' : value })}>
              <SelectTrigger>
                <SelectValue placeholder="Not tied to a Local MR" />
              </SelectTrigger>
              <SelectContent className="z-[200] max-h-[200px] overflow-y-auto">
                <SelectItem value="none">Not tied to a Local MR</SelectItem>
                {localMRs.map((mr) => (
                  <SelectItem key={mr.id} value={mr.id}>{mr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Expense Date *</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any extra detail worth recording"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="wheat" className="flex-1" disabled={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
