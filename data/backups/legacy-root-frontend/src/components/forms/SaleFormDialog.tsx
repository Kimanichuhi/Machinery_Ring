// src/components/forms/SaleFormDialog.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFarmers } from '@/hooks/api/useFarmers';
import { useProducts } from '@/hooks/api/useProducts';
import { useLocalMRs } from '@/hooks/api/useLocalMRs';
import { useTotsByLocalMR } from '@/hooks/api/useTotsByLocalMR';
import { useUsers } from '@/hooks/api/useUsers';
import { Loader2 } from 'lucide-react';
import { CreateSaleDto } from '@/hooks/api/useSales';

interface SaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (sale: CreateSaleDto) => void;
}

export function SaleFormDialog({ open, onOpenChange, onSubmit }: SaleFormDialogProps) {
  const { toast } = useToast();
  const [recorderType, setRecorderType] = useState<'tot' | 'office_employee'>('tot');
  const [formData, setFormData] = useState({
    farmerId: '',
    productId: '',
    localMrId: '',
    totId: '',
    quantity: 1,
    date: new Date().toISOString().split('T')[0],
    deliveryNoteNumber: '',
  });

  const { data: farmers = [], isLoading: farmersLoading, error: farmersError, refetch: refetchFarmers } = useFarmers();
  const { data: products = [], isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts();
  const { data: localMRs = [] } = useLocalMRs();
  const { data: tots = [], isLoading: totsLoading } = useTotsByLocalMR(formData.localMrId);
  const { data: allUsers = [] } = useUsers();
  const officeEmployees = useMemo(
    () => (allUsers as any[]).filter((u) => u.role === 'office_employee' && u.status === 'active'),
    [allUsers]
  );

  const selectedProduct = useMemo(() => products.find((p) => p.id === formData.productId), [formData.productId, products]);
  const selectedFarmer = useMemo(() => farmers.find((f) => f.id === formData.farmerId), [formData.farmerId, farmers]);

  const sellingPrice = (selectedProduct as any)?.sellingPrice ?? selectedProduct?.unitPrice ?? 0;
  const buyingPrice = (selectedProduct as any)?.buyingPrice ?? 0;
  const profitPerUnit = Math.max(sellingPrice - buyingPrice, 0);
  const total = sellingPrice * formData.quantity;
  const profit = profitPerUnit * formData.quantity;
  const isOfficeSale = recorderType === 'office_employee';
  const totShare = isOfficeSale ? 0 : profit * 0.4;
  const regionalShare = isOfficeSale ? 0 : profit * 0.5;
  const localShare = isOfficeSale ? 0 : profit * 0.1;
  const formatCurrency = (value: number) => `KES ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const isLoading = farmersLoading || productsLoading;
  const hasError = farmersError || productsError;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setRecorderType('tot');
      setFormData({
        farmerId: '',
        productId: '',
        localMrId: localMRs[0]?.id || '',
        totId: '',
        quantity: 1,
        date: new Date().toISOString().split('T')[0],
        deliveryNoteNumber: '',
      });
    }
  }, [open, localMRs]);

  // Reset selected user when toggling recorder type
  useEffect(() => {
    setFormData((prev) => ({ ...prev, totId: '' }));
  }, [recorderType]);

  // Reset TOT when Local MR changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, totId: '' }));
  }, [formData.localMrId]);

  // Auto-select local MR from farmer
  useEffect(() => {
    if (selectedFarmer?.localMrId) {
      setFormData(prev => ({ ...prev, localMrId: selectedFarmer.localMrId || prev.localMrId }));
    }
  }, [selectedFarmer]);

  // Validate quantity against stock
  useEffect(() => {
    if (selectedProduct && formData.quantity > selectedProduct.inStock) {
      setFormData(prev => ({ ...prev, quantity: Math.max(1, selectedProduct.inStock) }));
    }
  }, [selectedProduct, formData.quantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId || formData.quantity < 1) {
      toast({ title: 'Validation Error', description: 'Please select a product and quantity', variant: 'destructive' });
      return;
    }

    if (!formData.localMrId) {
      toast({ title: 'Validation Error', description: 'Please select a Local MR', variant: 'destructive' });
      return;
    }

    if (!formData.totId) {
      toast({ title: 'Validation Error', description: isOfficeSale ? 'Please select an office employee' : 'Please select a TOT who made this sale', variant: 'destructive' });
      return;
    }

    if (formData.quantity > (selectedProduct?.inStock || 0)) {
      toast({ title: 'Stock Error', description: 'Quantity exceeds available stock', variant: 'destructive' });
      return;
    }

    const saleData: CreateSaleDto = {
      farmer_id: formData.farmerId || null,
      product_id: formData.productId,
      tot_id: formData.totId,
      local_mr_id: formData.localMrId,
      quantity: formData.quantity,
      sale_date: formData.date ? new Date(formData.date).toISOString() : undefined,
      delivery_note_number: formData.deliveryNoteNumber.trim() || undefined,
    };

    try {
      onSubmit(saleData);
      onOpenChange(false);
    } catch {
      toast({ title: 'Submission Error', description: 'Failed to submit sale', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Record New Sale</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 px-1">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-3" />
              <span>Loading...</span>
            </div>
          )}
          {farmersError && (
            <div className="text-center py-12 text-destructive">
              Failed to load farmers. <Button onClick={() => refetchFarmers()}>Retry</Button>
            </div>
          )}
          {productsError && (
            <div className="text-center py-12 text-destructive">
              Failed to load products. <Button onClick={() => refetchProducts()}>Retry</Button>
            </div>
          )}
          {!isLoading && !hasError && (
            <>
              <div className="space-y-2">
                <Label>Recorded by *</Label>
                <Select value={recorderType} onValueChange={(v) => setRecorderType(v as 'tot' | 'office_employee')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="tot">TOT (earns commission)</SelectItem>
                    <SelectItem value="office_employee">Office Employee (no commission)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Local MR *</Label>
                <Select value={formData.localMrId} onValueChange={(value) => setFormData({ ...formData, localMrId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose Local MR" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {localMRs.map((mr) => (
                      <SelectItem key={mr.id} value={mr.id}>{mr.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {recorderType === 'tot' ? (
                <div className="space-y-2">
                  <Label>Select TOT *</Label>
                  <Select 
                    value={formData.totId} 
                    onValueChange={(value) => setFormData({ ...formData, totId: value })}
                    disabled={!formData.localMrId || totsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.localMrId ? 'Select Local MR first' : 
                        totsLoading ? 'Loading TOTs...' : 
                        tots.length === 0 ? 'No TOTs in this MR' : 
                        'Choose TOT'
                      } />
                    </SelectTrigger>
                    <SelectContent className="z-[200] max-h-[200px] overflow-y-auto">
                      {tots.map((tot) => (
                        <SelectItem key={tot.id} value={tot.id}>
                          {tot.name} ({tot.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select Office Employee *</Label>
                  <Select 
                    value={formData.totId} 
                    onValueChange={(value) => setFormData({ ...formData, totId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={officeEmployees.length === 0 ? 'No office employees registered' : 'Choose office employee'} />
                    </SelectTrigger>
                    <SelectContent className="z-[200] max-h-[200px] overflow-y-auto">
                      {officeEmployees.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Office employees do not earn commission on this sale.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Select Farmer (optional)</Label>
                <Select value={formData.farmerId || 'walk-in'} onValueChange={(value) => setFormData({ ...formData, farmerId: value === 'walk-in' ? '' : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Walk-in / no farmer" />
                  </SelectTrigger>
                  <SelectContent className="z-[200] max-h-[200px] overflow-y-auto">
                    <SelectItem value="walk-in">Walk-in (no farmer)</SelectItem>
                    {farmers.map((farmer) => (
                      <SelectItem key={farmer.id} value={farmer.id}>
                        {farmer.name} - {farmer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Product *</Label>
                <Select value={formData.productId} onValueChange={(value) => setFormData({ ...formData, productId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={products.length === 0 ? 'No products' : 'Choose product'} />
                  </SelectTrigger>
                  <SelectContent className="z-[200] max-h-[200px]">
                    {products.map((product) => (
                      <SelectItem 
                        key={product.id} 
                        value={product.id} 
                        disabled={(product.inStock ?? 0) <= 0}
                        className="cursor-pointer"
                      >
                        {product.name} - {formatCurrency(product.unitPrice)} ({product.inStock ?? 0} in stock)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedProduct?.inStock || 999}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Sale Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Note Number</Label>
                <Input
                  type="text"
                  placeholder="e.g. DN-00123"
                  value={formData.deliveryNoteNumber}
                  onChange={(e) => setFormData({ ...formData, deliveryNoteNumber: e.target.value })}
                />
              </div>

              {selectedProduct && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm">Summary</h4>
                  <div className="flex justify-between text-sm">
                    <span>Revenue:</span>
                    <span className="font-semibold">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Profit:</span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(profit)}</span>
                  </div>
                  {isOfficeSale ? (
                    <div className="border-t border-border pt-2 mt-2 text-xs text-muted-foreground italic">
                      Office Employee sale — no commission is paid out for this sale.
                    </div>
                  ) : (
                    <div className="border-t border-border pt-2 mt-2 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">TOT (40%)</span><span className="font-medium">{formatCurrency(totShare)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Regional MR (50%)</span><span className="font-medium">{formatCurrency(regionalShare)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Local MR (10%)</span><span className="font-medium">{formatCurrency(localShare)}</span></div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="wheat" className="flex-1" disabled={isLoading || !!hasError}>
              Submit Sale
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
