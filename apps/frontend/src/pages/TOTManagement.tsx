import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Search, Plus, MoreHorizontal, UserCog, Users, TrendingUp, 
  ShoppingCart, Tractor, GraduationCap, MapPin, FileText, 
  FileSpreadsheet, Phone, Mail, Calendar, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalMRs, useUsers, useFarmers } from '@/hooks/api';
import { format } from 'date-fns';
import { AddTOTDialog } from '@/components/dashboard/AddTOTDialog';
import { EditTOTDialog } from '@/components/dashboard/EditTOTDialog';

interface TOTPerformance {
  totId: string;
  totName: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  localMrName: string;
  totalSales: number;
  totalCommission: number;
  mechanisationJobsCompleted: number;
  trainingsConducted: number;
  visitsLogged: number;
  lastActivityDate?: Date;
}

export function TOTManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isCoordinator = user?.role === 'local_mr_coordinator';

  // API hooks - data is already normalized by select transforms
  const { data: localMRs = [] } = useLocalMRs();
  const { data: users = [] } = useUsers();
  const { data: farmers = [] } = useFarmers();

  // Get TOTs based on user role
  // Admin and Manager see all TOTs; Coordinator sees only their Local MR's TOTs
  const tots = (users as any[]).filter(u => {
    if (u.role !== 'tot') return false;
    if (isAdmin || isManager) return true;
    if (isCoordinator) return u.localMrId === user?.localMrId;
    return false;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTOT, setSelectedTOT] = useState<string | null>(null);
  const [editingTOTId, setEditingTOTId] = useState<string | null>(null);

  // Build TOT performance data with Local MR info - use metrics from fetchUsers
  const totsPerformance: TOTPerformance[] = tots.map(tot => {
    const localMr = (localMRs as any[]).find(mr => mr.id === tot.localMrId);
    return {
      totId: tot.id,
      totName: tot.name,
      phone: tot.phone || '',
      email: tot.email || '',
      status: tot.status === 'active' ? 'active' : 'inactive',
      localMrName: tot.localMrName || localMr?.name || 'Unassigned',
      totalSales: tot.totalRevenue || 0,
      totalCommission: tot.totalCommission || 0,
      mechanisationJobsCompleted: tot.completedJobsCount || tot.jobsCount || 0,
      trainingsConducted: tot.completedTrainingsCount || tot.trainingsCount || 0,
      visitsLogged: tot.visitsCount || 0,
      lastActivityDate: tot.lastActivityDate ? new Date(tot.lastActivityDate) : undefined,
    };
  });
  
  const filteredTOTs = totsPerformance.filter(tot =>
    tot.totName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tot.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tot.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tot.localMrName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTOTs = totsPerformance.filter(t => t.status === 'active').length;
  const inactiveTOTs = totsPerformance.filter(t => t.status === 'inactive').length;
  const totalCommission = totsPerformance.reduce((acc, t) => acc + t.totalCommission, 0);
  const totalSales = totsPerformance.reduce((acc, t) => acc + t.totalSales, 0);

  const formatCurrency = (value: number) => `KES ${value.toLocaleString()}`;

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'dd MMM yyyy');
  };

  const handleToggleStatus = (totId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    toast.success(`TOT status changed to ${newStatus}`);
  };

  const handleViewDetails = (totId: string) => {
    setSelectedTOT(totId);
  };

  const exportToPDF = () => {
    toast.success('PDF export started');
    let reportContent = `TOT MANAGEMENT REPORT\n${'='.repeat(50)}\n`;
    reportContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    reportContent += `SUMMARY\n${'-'.repeat(30)}\n`;
    reportContent += `Total TOTs: ${totsPerformance.length}\n`;
    reportContent += `Active: ${activeTOTs}\n`;
    reportContent += `Inactive: ${inactiveTOTs}\n`;
    reportContent += `Total Sales: ${formatCurrency(totalSales)}\n`;
    reportContent += `Total Commission: ${formatCurrency(totalCommission)}\n\n`;
    
    reportContent += `TOT DETAILS\n${'-'.repeat(30)}\n`;
    totsPerformance.forEach(tot => {
      reportContent += `\n${tot.totName} (${tot.localMrName})\n`;
      reportContent += `  Status: ${tot.status}\n`;
      reportContent += `  Phone: ${tot.phone}\n`;
      reportContent += `  Sales: ${formatCurrency(tot.totalSales)}\n`;
      reportContent += `  Commission: ${formatCurrency(tot.totalCommission)}\n`;
      reportContent += `  Jobs Completed: ${tot.mechanisationJobsCompleted}\n`;
      reportContent += `  Trainings: ${tot.trainingsConducted}\n`;
      reportContent += `  Visits: ${tot.visitsLogged}\n`;
    });
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tot_report_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const exportToExcel = () => {
    toast.success('Excel export started');
    let csvContent = 'TOT Name,Local MR,Status,Phone,Email,Total Sales (KES),Commission (KES),Jobs Completed,Trainings,Visits,Last Activity\n';
    
    totsPerformance.forEach(tot => {
      csvContent += `"${tot.totName}","${tot.localMrName}","${tot.status}","${tot.phone}","${tot.email}",${tot.totalSales},${tot.totalCommission},${tot.mechanisationJobsCompleted},${tot.trainingsConducted},${tot.visitsLogged},"${formatDate(tot.lastActivityDate)}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tot_data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const selectedTOTData = selectedTOT ? totsPerformance.find(t => t.totId === selectedTOT) : null;
  const farmersRegisteredByTOT = selectedTOT 
    ? (farmers as any[]).filter(f => f.registeredBy === selectedTOT).length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">TOT Management</h1>
          <p className="text-muted-foreground">
            {isAdmin || isManager ? 'View all TOTs across the organization' : 'View TOTs in your Local MR'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportToPDF}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          {isAdmin && <AddTOTDialog />}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCog className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total TOTs</p>
              <p className="text-2xl font-bold">{totsPerformance.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">{activeTOTs}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-xl font-bold">{formatCurrency(totalSales)}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="forest">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-80">Commission</p>
              <p className="text-xl font-bold">{formatCurrency(totalCommission)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search TOTs by name, phone, or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* TOTs Table */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">All TOTs ({filteredTOTs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TOT</TableHead>
                <TableHead>Local MR</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-center">Jobs</TableHead>
                <TableHead className="text-center">Trainings</TableHead>
                <TableHead className="text-center">Visits</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTOTs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No TOTs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTOTs.map((tot) => (
                  <TableRow key={tot.totId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {tot.totName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-medium">{tot.totName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {tot.localMrName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {tot.phone || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {tot.email || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tot.status === 'active' ? 'success' : 'secondary'}>
                        {tot.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(tot.totalSales)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-primary">{formatCurrency(tot.totalCommission)}</span>
                    </TableCell>
                    <TableCell className="text-center">{tot.mechanisationJobsCompleted}</TableCell>
                    <TableCell className="text-center">{tot.trainingsConducted}</TableCell>
                    <TableCell className="text-center">{tot.visitsLogged}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(tot.lastActivityDate)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(tot.totId)}>
                            View Details
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => setEditingTOTId(tot.totId)}>
                              Edit TOT
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      {/* TOT Details Dialog */}
      <Dialog open={!!selectedTOT} onOpenChange={() => setSelectedTOT(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>TOT Performance Details</DialogTitle>
          </DialogHeader>
          {selectedTOTData && (
            <div className="space-y-6">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  {selectedTOTData.totName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedTOTData.totName}</h3>
                  <p className="text-sm text-muted-foreground">{selectedTOTData.phone} • {selectedTOTData.email}</p>
                  <Badge variant={selectedTOTData.status === 'active' ? 'success' : 'secondary'} className="mt-1">
                    {selectedTOTData.status}
                  </Badge>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                  <ShoppingCart className="w-6 h-6 mx-auto text-primary mb-2" />
                  <p className="text-xl font-bold">{formatCurrency(selectedTOTData.totalSales)}</p>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                </Card>
                <Card className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 mx-auto text-green-600 mb-2" />
                  <p className="text-xl font-bold">{formatCurrency(selectedTOTData.totalCommission)}</p>
                  <p className="text-xs text-muted-foreground">Commission Earned</p>
                </Card>
                <Card className="p-4 text-center">
                  <Users className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-xl font-bold">{farmersRegisteredByTOT}</p>
                  <p className="text-xs text-muted-foreground">Farmers Registered</p>
                </Card>
              </div>

              {/* Activity Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <Tractor className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                  <p className="font-semibold">{selectedTOTData.mechanisationJobsCompleted}</p>
                  <p className="text-xs text-muted-foreground">Jobs</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <GraduationCap className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                  <p className="font-semibold">{selectedTOTData.trainingsConducted}</p>
                  <p className="text-xs text-muted-foreground">Trainings</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <MapPin className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                  <p className="font-semibold">{selectedTOTData.visitsLogged}</p>
                  <p className="text-xs text-muted-foreground">Visits</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditTOTDialog
        open={!!editingTOTId}
        onOpenChange={(o) => !o && setEditingTOTId(null)}
        tot={editingTOTId ? (() => {
          const t = tots.find((u: any) => u.id === editingTOTId);
          return t ? {
            id: t.id,
            name: t.name,
            email: t.email,
            phone: t.phone,
            status: t.status,
            localMrId: t.localMrId || t.local_mr_id,
          } : null;
        })() : null}
      />
    </div>
  );
}