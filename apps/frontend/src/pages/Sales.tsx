import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, TrendingUp, Calendar, Download, Package, FileSpreadsheet, FileText, MoreVertical, Upload } from 'lucide-react';
import { exportSalesToExcel, exportSalesToPDF } from '@/lib/exportUtils';
import { SaleFormDialog } from '@/components/forms/SaleFormDialog';
import { EditSaleDialog } from '@/components/forms/EditSaleDialog';
import { BulkUploadDialog } from '@/components/bulk-upload/BulkUploadDialog';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Sale } from '@/types';
import { useSales, useCreateSale, useProducts, useCompleteSale, useCancelSale, useUncancelSale, useBulkCreateSales } from '@/hooks/api';
import { useFarmers } from '@/hooks/api/useFarmers';
import { useUsers } from '@/hooks/api/useUsers';
import { useLocalMRs } from '@/hooks/api/useLocalMRs';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Sales() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [productFilter, setProductFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const { addNotification } = useNotifications();
  const { user, isAdmin, canEdit } = useAuth();

  // API hooks
  const { data: sales = [], isLoading } = useSales();
  const { data: products = [] } = useProducts();
  const { data: farmers = [] } = useFarmers();
  const { data: users = [] } = useUsers();
  const { data: localMRs = [] } = useLocalMRs();
  const createSale = useCreateSale();
  const bulkCreateSales = useBulkCreateSales();
  const completeSale = useCompleteSale();
  const cancelSale = useCancelSale();
  const uncancelSale = useUncancelSale();

  const completedSales = sales.filter(s => s.status === 'completed');
  const trimmedSearch = searchQuery.trim().toLowerCase();
  const trimmedStart = startDate.trim();
  const trimmedEnd = endDate.trim();
  // Build inclusive local-day boundaries to avoid timezone drift
  const startBoundary = useMemo(
    () => (trimmedStart ? new Date(`${trimmedStart}T00:00:00`) : null),
    [trimmedStart],
  );
  const endBoundary = useMemo(
    () => (trimmedEnd ? new Date(`${trimmedEnd}T23:59:59.999`) : null),
    [trimmedEnd],
  );
  const getSaleSortTime = (sale: any) => {
    const primaryTime = sale.date ? new Date(sale.date).getTime() : 0;
    const fallbackTime = sale.created_at ? new Date(sale.created_at).getTime() : 0;
    return Number.isNaN(primaryTime) || primaryTime === 0 ? fallbackTime : primaryTime;
  };

  const filteredSales = useMemo(() => sales.filter((sale: any) => {
    const farmerName = sale.farmerName ?? '';
    const productName = sale.productName ?? '';
    const dn = (sale.deliveryNoteNumber ?? '').toString();
    const matchesSearch = !trimmedSearch ||
      farmerName.toLowerCase().includes(trimmedSearch) ||
      productName.toLowerCase().includes(trimmedSearch) ||
      dn.toLowerCase().includes(trimmedSearch);
    const matchesProduct = productFilter === 'all' || sale.productId === productFilter;
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    const saleDate = sale.date ? new Date(sale.date) : null;
    const matchesStart = !startBoundary || (saleDate && saleDate >= startBoundary);
    const matchesEnd = !endBoundary || (saleDate && saleDate <= endBoundary);
    return matchesSearch && matchesProduct && matchesStatus && matchesStart && matchesEnd;
  }).sort((a: any, b: any) => {
    const dateDifference = getSaleSortTime(b) - getSaleSortTime(a);
    if (dateDifference !== 0) return dateDifference;

    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return createdB - createdA;
  }), [endBoundary, productFilter, sales, startBoundary, statusFilter, trimmedSearch]);

  const totalRevenue = completedSales.reduce((acc, sale) => acc + sale.total, 0);
  const totalCommission = completedSales.reduce((acc, sale) => acc + sale.commissionAmount, 0);

  const handleAddSale = (data: any) => {
    if (!canEdit) {
      toast.error('You do not have permission to record sales');
      return;
    }
    createSale.mutate(data);
    addNotification({
      title: 'New Sale Recorded',
      message: `Sale recorded successfully`,
      type: 'sale',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      default: return 'destructive';
    }
  };

  const formatCurrency = (value: number) => `KES ${value.toLocaleString()}`;

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const handleCompleteSale = (id: string) => {
    if (!isAdmin) return;
    completeSale.mutate(id);
  };

  const handleCancelSale = (id: string) => {
    if (!isAdmin) return;
    cancelSale.mutate({ id, reason: 'Cancelled by admin' });
  };

  // Manager and Coordinator can export reports
  const canExport = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'local_mr_coordinator';

  const handleBulkUpload = async (data: any[]) => {
    // Resolve names to IDs
    const errors: string[] = [];
    const salesToCreate: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row (header is row 1)

      // Resolve farmer (optional - blank = walk-in)
      let farmerId: string | null = null;
      const rawFarmer = String(row.farmer ?? '').trim();
      if (rawFarmer && rawFarmer.toLowerCase() !== 'walk-in') {
        const farmer = (farmers as any[]).find(f => f.name?.toLowerCase() === rawFarmer.toLowerCase());
        if (!farmer) {
          errors.push(`Row ${rowNum}: Farmer "${row.farmer}" not found (use blank or "walk-in" for no farmer)`);
          continue;
        }
        farmerId = farmer.id;
      }

      // Resolve product
      const productName = String(row.product).trim().toLowerCase();
      const product = (products as any[]).find(p => p.name?.toLowerCase() === productName);
      if (!product) {
        errors.push(`Row ${rowNum}: Product "${row.product}" not found`);
        continue;
      }

      // Resolve TOT
      const totName = String(row.tot).trim().toLowerCase();
      const tot = (users as any[]).find(u => u.name?.toLowerCase() === totName && u.role === 'tot');
      if (!tot) {
        errors.push(`Row ${rowNum}: TOT "${row.tot}" not found`);
        continue;
      }

      // Get TOT's local MR from their assignment
      const { data: assignment } = await supabase
        .from('tot_assignments')
        .select('local_mr_id')
        .eq('tot_id', tot.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!assignment?.local_mr_id) {
        errors.push(`Row ${rowNum}: TOT "${row.tot}" has no active Local MR assignment`);
        continue;
      }

      salesToCreate.push({
        farmer_id: farmerId,
        product_id: product.id,
        tot_id: tot.id,
        local_mr_id: assignment.local_mr_id,
        quantity: Number(row.quantity),
        ...(row.sale_date ? { sale_date: String(row.sale_date).trim() } : {}),
        ...(row.payment_method ? { payment_method: String(row.payment_method).trim().toLowerCase() } : {}),
        ...(row.notes ? { notes: String(row.notes).trim() } : {}),
      });
    }

    if (errors.length > 0) {
      toast.warning(`${errors.length} rows skipped`, {
        description: errors.slice(0, 3).join('; ') + (errors.length > 3 ? `... and ${errors.length - 3} more` : ''),
      });
    }

    if (salesToCreate.length === 0) {
      throw new Error('No valid sales to upload. Check farmer, product, and TOT names.');
    }

    await bulkCreateSales.mutateAsync(salesToCreate);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Sales</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Record and manage product sales' : 'View product sales'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { exportSalesToExcel(filteredSales); toast.success('Exported to Excel'); }}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { exportSalesToPDF(filteredSales); toast.success('Exported to PDF'); }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Admin only: Record Sale & Bulk Upload buttons */}
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsBulkUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
              <Button variant="wheat" size="sm" onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Record Sale
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4" variant="forest">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold font-heading truncate">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs sm:text-sm opacity-80">Total Revenue</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-accent-foreground">{sales.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Sales</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold font-heading text-secondary truncate">{formatCurrency(totalCommission)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Commission</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-emerald-700">
                {completedSales.length}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by farmer, product or delivery note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map(product => (
                  <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-[160px]" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">To</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-[160px]" />
            </div>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
                Clear dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Recent Sales ({filteredSales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Delivery #</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Farmer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Qty</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Profit</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">TOT 40%</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Reg 50%</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Local 10%</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  {isAdmin && <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale: any, index) => {
                  const farmerLabel = sale.farmerId ? (sale.farmerName || 'Unknown') : 'Walk-in';
                  return (
                  <tr
                    key={sale.id}
                    className="border-b border-border/50 hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="py-3 px-4 text-sm">{formatDate(sale.date)}</td>
                    <td className="py-3 px-4 text-sm font-mono text-xs">{sale.deliveryNoteNumber || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                          {farmerLabel.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-medium text-sm">{farmerLabel}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">{sale.productName}</td>
                    <td className="py-3 px-4 text-sm font-medium">{sale.quantity}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-primary">{formatCurrency(sale.total)}</td>
                    <td className="py-3 px-4 text-sm font-medium text-emerald-700">{formatCurrency(sale.profitAmount ?? 0)}</td>
                    <td className="py-3 px-4 text-sm">{formatCurrency(sale.totCommission ?? 0)}</td>
                    <td className="py-3 px-4 text-sm">{formatCurrency(sale.regionalMrCommission ?? 0)}</td>
                    <td className="py-3 px-4 text-sm">{formatCurrency(sale.localMrCommission ?? 0)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusColor(sale.status) as any}>{sale.status}</Badge>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(sale.status !== 'cancelled' || isAdmin) && (
                              <DropdownMenuItem onClick={() => setEditingSale(sale)}>
                                Edit
                              </DropdownMenuItem>
                            )}
                            {sale.status === 'cancelled' && isAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => uncancelSale.mutate({ id: sale.id, status: 'pending' })}>
                                  Uncancel → Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => uncancelSale.mutate({ id: sale.id, status: 'completed' })}>
                                  Uncancel → Completed
                                </DropdownMenuItem>
                              </>
                            )}
                            {sale.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleCompleteSale(sale.id)}>
                                Complete
                              </DropdownMenuItem>
                            )}
                            {sale.status !== 'cancelled' && (
                              <DropdownMenuItem 
                                onClick={() => handleCancelSale(sale.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                Cancel Sale
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sale Form Dialog - Admin only */}
      {isAdmin && (
        <>
          <SaleFormDialog
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            onSubmit={handleAddSale}
          />
          <BulkUploadDialog
            open={isBulkUploadOpen}
            onOpenChange={setIsBulkUploadOpen}
            entityType="sales"
            onUpload={handleBulkUpload}
          />
          <EditSaleDialog
            open={!!editingSale}
            onOpenChange={(o) => { if (!o) setEditingSale(null); }}
            sale={editingSale}
          />
        </>
      )}
    </div>
  );
}
