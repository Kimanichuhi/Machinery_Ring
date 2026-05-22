import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { exportFarmersToExcel, exportFarmersToPDF } from '@/lib/exportUtils';
import { FarmerFormDialog } from '@/components/forms/FarmerFormDialog';
import { BulkUploadDialog } from '@/components/bulk-upload/BulkUploadDialog';
import { TablePagination } from '@/components/ui/table-pagination';
import { Farmer } from '@/types';
import { usePaginatedFarmers, useFarmerStats } from '@/hooks/api/usePaginatedFarmers';
import { useFarmers, useCreateFarmer, useUpdateFarmer, useDeleteFarmer } from '@/hooks/api/useFarmers';
import { useLocalMRs } from '@/hooks/api';
import { supabase } from '@/integrations/supabase/client';
import {
  Search,
  Plus,
  MapPin,
  Phone,
  Download,
  Users,
  FileSpreadsheet,
  FileText,
  Star,
  Eye,
  Upload,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export function Farmers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin, canEdit } = useAuth();
  const { addNotification } = useNotifications();

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [localMrFilter, setLocalMrFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  
  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [deletingFarmer, setDeletingFarmer] = useState<Farmer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Purge farmer state
  const [isPurgeOpen, setIsPurgeOpen] = useState(false);
  const [purgePhone, setPurgePhone] = useState('');
  const [isPurgeLoading, setIsPurgeLoading] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeImpact, setPurgeImpact] = useState<{
    farmerId: string;
    farmerName?: string;
    county?: string;
    village?: string;
    counts: {
      sales: number;
      visits: number;
      trainingAttendances: number;
      mechanisationJobs: number;
      machineryBookings: number;
    };
  } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [localMrFilter, ratingFilter]);

  // Build filters object
  const filters = {
    search: debouncedSearch || undefined,
    localMrId: localMrFilter !== 'all' ? localMrFilter : undefined,
  };

  // API hooks - server-side pagination
  const {
    data: farmers,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
  } = usePaginatedFarmers(filters, { page, pageSize });

  // Stats query (efficient count-based)
  const { data: stats } = useFarmerStats({
    localMrId: localMrFilter !== 'all' ? localMrFilter : undefined,
  });

  // For exports - fetch all farmers (lazy, only when exporting)
  const { data: allFarmers = [], refetch: fetchAllFarmers } = useFarmers({
    localMrId: localMrFilter !== 'all' ? localMrFilter : undefined,
  });

  const { data: localMRs = [] } = useLocalMRs();
  const createFarmer = useCreateFarmer();
  const updateFarmer = useUpdateFarmer();
  const deleteFarmer = useDeleteFarmer();

  // Auto-open add modal from Quick Actions (Admin only)
  useEffect(() => {
    if (searchParams.get('add') === 'new' && isAdmin) {
      setIsFormOpen(true);
      searchParams.delete('add');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, isAdmin]);

  // Client-side filter for rating (applied after server-side pagination)
  const filteredFarmers = farmers.filter(farmer => {
    const matchesRating = ratingFilter === 'all' || farmer.farmerRating === ratingFilter;
    return matchesRating;
  });

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'High-Value': return 'success';
      case 'Active': return 'forest';
      default: return 'warning';
    }
  };

  const handleSubmitFarmer = (data: Partial<Farmer>) => {
    if (!canEdit) {
      toast.error('You do not have permission to add farmers');
      return;
    }
    
    if (editingFarmer) {
      updateFarmer.mutate({ id: editingFarmer.id, data: data as any });
    } else {
      createFarmer.mutate(data as any);
      addNotification({
        title: 'Farmer Added',
        message: `New farmer registered successfully`,
        type: 'farmer',
      });
    }
  };

  const handleDeleteFarmer = async () => {
    if (!deletingFarmer) return;
    setIsDeleting(true);
    try {
      await deleteFarmer.mutateAsync(deletingFarmer.id);
      setDeletingFarmer(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Purge farmer handlers
  const handlePurgePreview = async () => {
    if (!purgePhone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsPurgeLoading(true);
    setPurgeImpact(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('purge-farmer', {
        body: { phone: purgePhone.trim(), preview: true },
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to lookup farmer');
        return;
      }

      if (!data.found) {
        toast.info('No farmer found with this phone number');
        return;
      }

      setPurgeImpact(data.impact);
    } catch (err: any) {
      toast.error(err.message || 'Failed to check farmer');
    } finally {
      setIsPurgeLoading(false);
    }
  };

  const handlePurgeExecute = async () => {
    if (!purgeImpact?.farmerId) return;

    setIsPurging(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('purge-farmer', {
        body: { phone: purgePhone.trim(), preview: false },
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to purge farmer');
        return;
      }

      toast.success(data.message || 'Farmer purged successfully');
      setPurgePhone('');
      setPurgeImpact(null);
      setIsPurgeOpen(false);
      
      // Refresh the farmers list
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to purge farmer');
    } finally {
      setIsPurging(false);
    }
  };

  const resetPurgeDialog = () => {
    setPurgePhone('');
    setPurgeImpact(null);
    setIsPurgeOpen(false);
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    // Fetch all farmers for export
    const { data: exportData } = await fetchAllFarmers();
    const farmersToExport = exportData || allFarmers;
    
    if (farmersToExport.length === 0) {
      toast.error('No farmers to export');
      return;
    }
    try {
      if (format === 'excel') exportFarmersToExcel(farmersToExport, 'farmers_export');
      else exportFarmersToPDF(farmersToExport, 'farmers_export');
      toast.success(`Exported ${farmersToExport.length} farmers to ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to export: ${error}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page
  };

  // Manager and Coordinator can export reports
  const canExport = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'local_mr_coordinator';

  if (isLoading && !isFetching) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Farmers</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Manage registered farmers' : 'View registered farmers'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Download className="w-4 h-4 mr-2" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="w-4 h-4 mr-2" /> Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Admin only: Actions dropdown */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="forest" size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Farmer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsBulkUploadOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" /> Bulk Upload
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setIsPurgeOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Purge by Phone
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Hide Local MR filter for TOTs - they only see their MR farmers via RLS */}
            {user?.role !== 'tot' && (
              <Select value={localMrFilter} onValueChange={setLocalMrFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Local MR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Local MRs</SelectItem>
                  {localMRs.map(mr => (
                    <SelectItem key={mr.id} value={mr.id}>{mr.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="High-Value">High-Value</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Dormant">Dormant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4" variant="forest">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading">
                {(stats?.total || totalCount).toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm opacity-80">Total Farmers</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-primary">
                {(stats?.highValue || 0).toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">High-Value</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-emerald-600">
                {(stats?.active || 0).toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Farmers List */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            All Farmers ({totalCount.toLocaleString()})
          </CardTitle>
          {isFetching && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Farmer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Location</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Rating</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Value Chain</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFarmers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading farmers...' : 'No farmers found'}
                    </td>
                  </tr>
                ) : (
                  filteredFarmers.map((farmer) => (
                    <tr 
                      key={farmer.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {farmer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{farmer.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {farmer.phone || 'No phone'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {farmer.location.village}{farmer.location.ward ? `, ${farmer.location.ward}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getRatingColor(farmer.farmerRating) as any} className="flex items-center gap-1 w-fit">
                          <Star className="w-3 h-3" />
                          {farmer.farmerRating}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">{farmer.valueChain}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/farmers/${farmer.id}`)}>
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                          {/* Only Admin can edit/delete farmers */}
                          {isAdmin && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditingFarmer(farmer as any);
                                setIsFormOpen(true);
                              }}>
                                Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeletingFarmer(farmer as any)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            isLoading={isFetching}
          />
        </CardContent>
      </Card>

      {/* Farmer Form Dialog - Admin only */}
      {isAdmin && (
        <FarmerFormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingFarmer(null);
          }}
          onSubmit={handleSubmitFarmer}
          farmer={editingFarmer}
        />
      )}

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        entityType="farmers"
        onUpload={async (data) => {
          // Resolve local_mr names to IDs
          const mrList = localMRs || [];
          const farmersToInsert = data.map(row => {
            let localMrId: string | null = null;
            if (row.local_mr) {
              const mrName = String(row.local_mr).trim().toLowerCase();
              const matchedMR = mrList.find(mr => mr.name.toLowerCase() === mrName);
              if (matchedMR) localMrId = matchedMR.id;
            }
            return {
              name: String(row.name),
              county: 'Nyandarua',
              sub_county: row.sub_county ? String(row.sub_county) : null,
              ward: row.ward ? String(row.ward) : null,
              village: row.village ? String(row.village) : null,
              phone: row.phone ? String(row.phone) : null,
              email: row.email ? String(row.email) : null,
              farming_type: row.farming_type ? String(row.farming_type) : null,
              farm_size: row.farm_size ? Number(row.farm_size) : null,
              local_mr_id: localMrId,
            };
          });

          // Warn about unmatched MR names
          const unmatchedRows = data.filter(row => {
            if (!row.local_mr) return false;
            const mrName = String(row.local_mr).trim().toLowerCase();
            return !mrList.find(mr => mr.name.toLowerCase() === mrName);
          });
          if (unmatchedRows.length > 0) {
            toast.warning(`${unmatchedRows.length} row(s) had unrecognized Local MR names and were uploaded without MR assignment.`);
          }

          // Check for duplicate phones in upload batch and against existing farmers
          const phonesInBatch = farmersToInsert
            .map(f => f.phone)
            .filter((p): p is string => !!p && p.trim() !== '');
          
          if (phonesInBatch.length > 0) {
            // Check for duplicates within the batch itself
            const seen = new Set<string>();
            const batchDupes: string[] = [];
            phonesInBatch.forEach(p => {
              if (seen.has(p)) batchDupes.push(p);
              seen.add(p);
            });
            if (batchDupes.length > 0) {
              throw new Error(`Duplicate phone numbers found in upload: ${batchDupes.join(', ')}`);
            }

            // Check against existing farmers in DB
            const { data: existingFarmers } = await supabase
              .from('farmers')
              .select('phone, name')
              .in('phone', phonesInBatch);
            
            if (existingFarmers && existingFarmers.length > 0) {
              const dupeNames = existingFarmers.map(f => `${f.name} (${f.phone})`).join(', ');
              throw new Error(`These farmers already exist: ${dupeNames}`);
            }
          }

          const { error } = await supabase.from('farmers').insert(farmersToInsert);
          if (error) {
            if (error.message?.includes('idx_farmers_unique_phone') || error.message?.includes('duplicate key')) {
              throw new Error('One or more farmers with the same phone number already exist in the system');
            }
            throw error;
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingFarmer} onOpenChange={(open) => !open && setDeletingFarmer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Farmer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingFarmer?.name}</strong>? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFarmer}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purge Farmer Dialog */}
      <Dialog open={isPurgeOpen} onOpenChange={(open) => !open && resetPurgeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Purge Farmer by Phone
            </DialogTitle>
            <DialogDescription>
              This will permanently delete a farmer and ALL their associated data including sales, visits, training records, and mechanisation jobs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter phone number (e.g., 0712345678)"
                value={purgePhone}
                onChange={(e) => setPurgePhone(e.target.value)}
                disabled={isPurgeLoading || isPurging}
              />
              <Button
                variant="outline"
                onClick={handlePurgePreview}
                disabled={isPurgeLoading || isPurging || !purgePhone.trim()}
              >
                {isPurgeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Lookup'
                )}
              </Button>
            </div>

            {purgeImpact && (
              <div className="border rounded-lg p-4 space-y-3 bg-destructive/5 border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="font-medium text-destructive">Impact Preview</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p><strong>Farmer:</strong> {purgeImpact.farmerName || 'Unknown'}</p>
                  <p><strong>Location:</strong> {purgeImpact.village || 'N/A'}, {purgeImpact.county || 'N/A'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-background rounded p-2">
                    <span className="text-muted-foreground">Sales:</span>
                    <span className="ml-2 font-medium">{purgeImpact.counts.sales}</span>
                  </div>
                  <div className="bg-background rounded p-2">
                    <span className="text-muted-foreground">Visits:</span>
                    <span className="ml-2 font-medium">{purgeImpact.counts.visits}</span>
                  </div>
                  <div className="bg-background rounded p-2">
                    <span className="text-muted-foreground">Trainings:</span>
                    <span className="ml-2 font-medium">{purgeImpact.counts.trainingAttendances}</span>
                  </div>
                  <div className="bg-background rounded p-2">
                    <span className="text-muted-foreground">Mech Jobs:</span>
                    <span className="ml-2 font-medium">{purgeImpact.counts.mechanisationJobs}</span>
                  </div>
                </div>

                <p className="text-xs text-destructive font-medium">
                  ⚠️ All records above will be permanently deleted!
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetPurgeDialog} disabled={isPurging}>
              Cancel
            </Button>
            {purgeImpact && (
              <Button
                variant="destructive"
                onClick={handlePurgeExecute}
                disabled={isPurging}
              >
                {isPurging ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Purging...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Purge Farmer
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
