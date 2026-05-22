// src/components/dashboard/LocalMRPerformanceTable.tsx
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Download, 
  Building2, 
  Users, 
  TrendingUp,
  ChevronRight,
  UserCheck,
  ShoppingCart,
  Tractor
} from 'lucide-react';
import { LocalMR, Sale, MechanisationJob, Farmer } from '@/types';

interface LocalMRPerformanceTableProps {
  localMRs: LocalMR[];
  sales: Sale[];
  jobs: MechanisationJob[];
  farmers: Farmer[];
}

export function LocalMRPerformanceTable({ 
  localMRs, 
  sales, 
  jobs, 
  farmers 
}: LocalMRPerformanceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMR, setSelectedMR] = useState<LocalMR | null>(null);

  // Calculate metrics for each Local MR
  const mrMetrics = localMRs.map(mr => {
    const mrSales = sales.filter(s => s.localMrId === mr.id);
    const mrJobs = jobs.filter(j => j.localMrId === mr.id);
    const mrFarmers = farmers.filter(f => f.localMrId === mr.id);
    
    const totalRevenue = mrSales
      .filter(s => s.status === 'completed')
      .reduce((acc, s) => acc + (s.total || 0), 0);
    
    const mechanisationDemand = mrJobs.length;
    const completedJobs = mrJobs.filter(j => j.status === 'completed').length;
    
    // Performance status based on revenue thresholds
    let performanceStatus: 'high' | 'medium' | 'low' = 'medium';
    if (totalRevenue > 500000) performanceStatus = 'high';
    else if (totalRevenue < 100000) performanceStatus = 'low';

    return {
      ...mr,
      totalSales: mrSales.length,
      totalRevenue,
      mechanisationDemand,
      completedJobs,
      farmerCount: mrFarmers.length,
      performanceStatus,
    };
  });

  // Filter by search term
  const filteredMRs = mrMetrics.filter(mr =>
    mr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mr.managerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `KES ${(value / 1000000).toFixed(1)}M`;
    return `KES ${(value / 1000).toFixed(0)}K`;
  };

  const getStatusBadge = (status: 'high' | 'medium' | 'low') => {
    switch (status) {
      case 'high':
        return <Badge variant="success">High Performer</Badge>;
      case 'medium':
        return <Badge variant="secondary">Average</Badge>;
      case 'low':
        return <Badge variant="warning">Needs Attention</Badge>;
    }
  };

  // Get detailed data for selected MR
  const getSelectedMRDetails = () => {
    if (!selectedMR) return null;
    
    const mrSales = sales.filter(s => s.localMrId === selectedMR.id);
    const mrJobs = jobs.filter(j => j.localMrId === selectedMR.id);
    const mrFarmers = farmers.filter(f => f.localMrId === selectedMR.id);
    
    return {
      sales: mrSales,
      jobs: mrJobs,
      farmers: mrFarmers,
      totalRevenue: mrSales.filter(s => s.status === 'completed').reduce((acc, s) => acc + (s.total || 0), 0),
      totalCommission: mrSales.filter(s => s.status === 'completed').reduce((acc, s) => acc + (s.commissionAmount || 0), 0),
    };
  };

  const selectedDetails = getSelectedMRDetails();

  return (
    <>
      <Card variant="elevated">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Local MR Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search Local MRs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Local MR</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead className="text-center">TOTs</TableHead>
                  <TableHead className="text-center">Farmers</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-center">Mech. Jobs</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMRs.map((mr) => (
                  <TableRow key={mr.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{mr.name}</TableCell>
                    <TableCell>{mr.managerName}</TableCell>
                    <TableCell className="text-center">{mr.totalTots}</TableCell>
                    <TableCell className="text-center">{mr.farmerCount}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(mr.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {mr.completedJobs}/{mr.mechanisationDemand}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedMR(mr)}
                      >
                        Details <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredMRs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No Local MRs found matching your search.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedMR} onOpenChange={() => setSelectedMR(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedMR?.name} Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedMR && selectedDetails && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-xl text-center">
                  <UserCheck className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{selectedMR.totalTots}</p>
                  <p className="text-xs text-muted-foreground">TOTs</p>
                </div>
                <div className="p-4 bg-muted rounded-xl text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{selectedDetails.farmers.length}</p>
                  <p className="text-xs text-muted-foreground">Farmers</p>
                </div>
                <div className="p-4 bg-muted rounded-xl text-center">
                  <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{selectedDetails.sales.length}</p>
                  <p className="text-xs text-muted-foreground">Sales</p>
                </div>
                <div className="p-4 bg-muted rounded-xl text-center">
                  <Tractor className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{selectedDetails.jobs.length}</p>
                  <p className="text-xs text-muted-foreground">Mech. Jobs</p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-4 bg-primary/5 rounded-xl">
                <h4 className="font-semibold mb-3">Financial Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(selectedDetails.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Commission</p>
                    <p className="text-xl font-bold text-secondary">
                      {formatCurrency(selectedDetails.totalCommission)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Manager Info */}
              <div className="p-4 border rounded-xl">
                <h4 className="font-semibold mb-2">Manager Information</h4>
                <p className="text-sm"><strong>Name:</strong> {selectedMR.managerName}</p>
                <p className="text-sm"><strong>Location:</strong> {selectedMR.subcounty}, {selectedMR.ward}</p>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF Report
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
