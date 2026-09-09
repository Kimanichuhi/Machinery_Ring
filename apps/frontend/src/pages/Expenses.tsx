import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState, EmptyState } from '@/components/common/QueryState';
import { Search, Plus, Wallet, Receipt, Calendar, MoreVertical, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { ExpenseFormDialog, EXPENSE_CATEGORIES } from '@/components/forms/ExpenseFormDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useVoidExpense,
  useDeleteExpense,
  Expense,
} from '@/hooks/api/useExpenses';
import { TablePagination } from '@/components/ui/table-pagination';
import { useClientPagination } from '@/hooks/useClientPagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Expenses() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [voidingExpense, setVoidingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { isAdmin, isManager } = usePermissions();
  const canManageExpenses = isAdmin || isManager;

  const { data: expenses = [], isLoading, error: expensesError, refetch: refetchExpenses } = useExpenses();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const voidExpense = useVoidExpense();
  const deleteExpense = useDeleteExpense();

  const trimmedSearch = searchQuery.trim().toLowerCase();
  const trimmedStart = startDate.trim();
  const trimmedEnd = endDate.trim();
  const startBoundary = useMemo(
    () => (trimmedStart ? new Date(`${trimmedStart}T00:00:00`) : null),
    [trimmedStart],
  );
  const endBoundary = useMemo(
    () => (trimmedEnd ? new Date(`${trimmedEnd}T23:59:59.999`) : null),
    [trimmedEnd],
  );

  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    const matchesSearch = !trimmedSearch ||
      expense.description.toLowerCase().includes(trimmedSearch) ||
      (expense.vendor || '').toLowerCase().includes(trimmedSearch);
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    const expenseDate = expense.expense_date ? new Date(expense.expense_date) : null;
    const matchesStart = !startBoundary || (expenseDate && expenseDate >= startBoundary);
    const matchesEnd = !endBoundary || (expenseDate && expenseDate <= endBoundary);
    return matchesSearch && matchesCategory && matchesStatus && matchesStart && matchesEnd;
  }), [categoryFilter, endBoundary, expenses, startBoundary, statusFilter, trimmedSearch]);

  const activeExpenses = expenses.filter((e) => e.status === 'recorded');
  const totalSpent = activeExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const now = new Date();
  const monthlySpent = activeExpenses
    .filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const topCategory = useMemo(() => {
    const totals = new Map<string, number>();
    activeExpenses.forEach((e) => totals.set(e.category, (totals.get(e.category) || 0) + Number(e.amount)));
    let best: { name: string; amount: number } | null = null;
    totals.forEach((amount, name) => {
      if (!best || amount > best.amount) best = { name, amount };
    });
    return best;
  }, [activeExpenses]);

  const {
    page,
    pageSize,
    totalPages,
    paginatedItems: paginatedExpenses,
    setPage,
    setPageSize,
  } = useClientPagination(filteredExpenses, 25);

  const formatCurrency = (value: number) => `KES ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const formatDate = (date: string) => new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));

  const handleAddExpense = (data: any) => {
    if (!canManageExpenses) {
      toast.error('You do not have permission to record expenses');
      return;
    }
    createExpense.mutate(data);
  };

  const handleUpdateExpense = (data: any) => {
    if (!editingExpense) return;
    updateExpense.mutate({ id: editingExpense.id, updates: data }, {
      onSuccess: () => setEditingExpense(null),
    });
  };

  const handleVoidExpense = () => {
    if (!voidingExpense) return;
    voidExpense.mutate(voidingExpense.id, { onSuccess: () => setVoidingExpense(null) });
  };

  const handleDeleteExpense = () => {
    if (!isAdmin || !deletingExpense) return;
    deleteExpense.mutate(deletingExpense.id, { onSuccess: () => setDeletingExpense(null) });
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    const { exportExpensesToExcel, exportExpensesToPDF } = await import('@/lib/exportUtils');
    if (format === 'excel') {
      exportExpensesToExcel(filteredExpenses, 'expenses');
    } else {
      await exportExpensesToPDF(filteredExpenses, 'expenses');
    }
    toast.success(`Exported to ${format === 'excel' ? 'Excel' : 'PDF'}`);
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (expensesError) {
    return <ErrorState message="Failed to load expenses." onRetry={() => refetchExpenses()} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            {canManageExpenses ? 'Record and manage every operational expense' : 'View operational expenses'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="w-4 h-4 mr-2" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canManageExpenses && (
            <Button variant="wheat" size="sm" onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Record Expense
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4" variant="forest">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold font-heading truncate">{formatCurrency(totalSpent)}</p>
              <p className="text-xs sm:text-sm opacity-80">Total Expenses</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold font-heading text-emerald-700 truncate">{formatCurrency(monthlySpent)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">This Month</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-accent-foreground">{activeExpenses.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Recorded</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold font-heading text-secondary truncate">{topCategory?.name || '—'}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Top Category</p>
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
                placeholder="Search by description or payee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="recorded">Recorded</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
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

      {/* Expenses List */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Expenses ({filteredExpenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Paid To</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Method</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Recorded By</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  {canManageExpenses && <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={canManageExpenses ? 9 : 8}>
                      <EmptyState
                        title="No expenses found"
                        description="Try adjusting your search or filters."
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((expense, index) => (
                    <tr
                      key={expense.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="py-3 px-4 text-sm">{formatDate(expense.expense_date)}</td>
                      <td className="py-3 px-4 text-sm">{expense.category}</td>
                      <td className="py-3 px-4 text-sm max-w-[240px] truncate" title={expense.description}>{expense.description}</td>
                      <td className="py-3 px-4 text-sm">{expense.vendor || '—'}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-primary">{formatCurrency(expense.amount)}</td>
                      <td className="py-3 px-4 text-sm capitalize">{expense.payment_method.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-sm">{expense.recorded_by_name || '—'}</td>
                      <td className="py-3 px-4">
                        <Badge variant={expense.status === 'voided' ? 'destructive' : 'success'}>{expense.status}</Badge>
                      </td>
                      {canManageExpenses && (
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" aria-label={`Actions for expense ${expense.description}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {expense.status !== 'voided' && (
                                <>
                                  <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setVoidingExpense(expense)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    Void
                                  </DropdownMenuItem>
                                </>
                              )}
                              {expense.status === 'voided' && isAdmin && (
                                <DropdownMenuItem
                                  onClick={() => setDeletingExpense(expense)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalCount={filteredExpenses.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[25, 50, 100]}
          />
        </CardContent>
      </Card>

      {canManageExpenses && (
        <>
          <ExpenseFormDialog
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            onSubmit={handleAddExpense}
            isSubmitting={createExpense.isPending}
          />
          <ExpenseFormDialog
            open={!!editingExpense}
            onOpenChange={(o) => { if (!o) setEditingExpense(null); }}
            onSubmit={handleUpdateExpense}
            expense={editingExpense}
            isSubmitting={updateExpense.isPending}
          />

          <AlertDialog open={!!voidingExpense} onOpenChange={(o) => { if (!o) setVoidingExpense(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Void this expense?</AlertDialogTitle>
                <AlertDialogDescription>
                  This marks the expense as voided instead of deleting it, so it stays in the audit trail
                  {voidingExpense ? ` (${voidingExpense.description})` : ''} but no longer counts toward totals.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleVoidExpense}
                  disabled={voidExpense.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Void
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={!!deletingExpense} onOpenChange={(o) => { if (!o) setDeletingExpense(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete this expense?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the voided expense
                  {deletingExpense ? ` (${deletingExpense.description})` : ''}. The change remains in the audit log. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteExpense}
                  disabled={deleteExpense.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
