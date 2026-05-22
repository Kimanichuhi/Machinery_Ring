import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Download, 
  Users, 
  ShoppingCart, 
  Tractor, 
  GraduationCap, 
  TrendingUp,
  Calendar,
  Building2,
  MapPin,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Data hooks
import { useFarmers } from '@/hooks/api/useFarmers';
import { useSales } from '@/hooks/api/useSales';
import { useMachineryBookings } from '@/hooks/api/useMachineryBookings';
import { useTrainings } from '@/hooks/api/useTrainings';
import { useVisits } from '@/hooks/api/useVisits';

// Export utilities
import {
  exportFarmersToExcel,
  exportFarmersToPDF,
  exportSalesToExcel,
  exportSalesToPDF,
  exportMechanisationToExcel,
  exportMechanisationToPDF,
  exportTrainingsToExcel,
  exportTrainingsToPDF,
  exportVisitsToExcel,
  exportVisitsToPDF,
  exportCommissionToExcel,
  exportCommissionToPDF,
  exportPerformanceToExcel,
  exportPerformanceToPDF,
  CommissionData,
  PerformanceData,
} from '@/lib/exportUtils';

const reportTypes = [
  { id: 'sales', title: 'Sales Report', description: 'Sales transactions, revenue, and commissions', icon: ShoppingCart, color: 'forest' },
  { id: 'farmers', title: 'Farmer Profiles', description: 'Farmer registry with contact details', icon: Users, color: 'wheat' },
  { id: 'machinery', title: 'Machinery Report', description: 'Machinery bookings and jobs summary', icon: Tractor, color: 'earth' },
  { id: 'trainings', title: 'Training Report', description: 'Capacity building and attendance', icon: GraduationCap, color: 'forest' },
  { id: 'visits', title: 'Visits Report', description: 'Field visits and farmer interactions', icon: MapPin, color: 'wheat' },
  { id: 'commission', title: 'Commission Report', description: 'Commission earnings breakdown', icon: FileText, color: 'earth' },
];

const managerReports = [
  { id: 'performance', title: 'Performance Report', description: 'TOT metrics and targets achieved', icon: TrendingUp, color: 'forest' },
  { id: 'branch', title: 'Branch Performance', description: 'Branch-level analytics', icon: Building2, color: 'wheat' },
];

export function Reports() {
  const { user } = useAuth();
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const currentMonth = format(new Date(), 'MMMM yyyy');

  // Fetch all data
  const { data: farmers = [], isLoading: farmersLoading } = useFarmers();
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: machineryBookings = [], isLoading: machLoading } = useMachineryBookings();
  const { data: trainings = [], isLoading: trainingsLoading } = useTrainings();
  const { data: visits = [], isLoading: visitsLoading } = useVisits();

  const isLoading = farmersLoading || salesLoading || machLoading || trainingsLoading || visitsLoading;

  // Filter data by date range
  const filterByDateRange = <T extends { created_at?: string; sale_date?: string; scheduled_date?: string; visit_date?: string; start_date?: string }>(data: T[]) => {
    if (!startDate && !endDate) return data;
    
    return data.filter(item => {
      const itemDate = item.sale_date || item.scheduled_date || item.visit_date || item.start_date || item.created_at;
      if (!itemDate) return true;
      
      const date = new Date(itemDate);
      if (startDate && date < new Date(startDate)) return false;
      if (endDate && date > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  };

  const filteredSales = filterByDateRange(sales);
  const filteredMachineryBookings = filterByDateRange(machineryBookings);
  const filteredTrainings = filterByDateRange(trainings);
  const filteredVisits = filterByDateRange(visits);

  const allReports = user?.role === 'manager' || user?.role === 'admin' 
    ? [...reportTypes, ...managerReports] 
    : reportTypes;

  // Calculate summary stats using filtered data
  const summary = useMemo(() => {
    const totalSales = filteredSales.reduce((sum, s) => sum + (s.total || s.total_amount || 0), 0);
    const totalCommission = filteredSales.reduce((sum, s) => sum + (s.commissionAmount || s.commission_amount || 0), 0);
    return {
      farmers: farmers.length,
      sales: filteredSales.length,
      totalSales,
      totalCommission,
      trainings: filteredTrainings.length,
      visits: filteredVisits.length,
      machinery: filteredMachineryBookings.length,
    };
  }, [farmers, filteredSales, filteredTrainings, filteredVisits, filteredMachineryBookings]);

  // Prepare commission data using filtered sales
  const commissionData: CommissionData[] = useMemo(() => {
    const totMap = new Map<string, CommissionData>();
    
    filteredSales.forEach(sale => {
      const totId = sale.totId || sale.tot_id || '';
      const existing = totMap.get(totId) || {
        totName: sale.totName || 'Unknown TOT',
        localMrName: sale.localMrName || '',
        salesCount: 0,
        totalSales: 0,
        totalCommission: 0,
        paidCommission: 0,
        pendingCommission: 0,
      };
      
      existing.salesCount += 1;
      existing.totalSales += sale.total || sale.total_amount || 0;
      existing.totalCommission += sale.commissionAmount || sale.commission_amount || 0;
      if (sale.commission_paid) {
        existing.paidCommission += sale.commissionAmount || sale.commission_amount || 0;
      } else {
        existing.pendingCommission += sale.commissionAmount || sale.commission_amount || 0;
      }
      
      totMap.set(totId, existing);
    });
    
    return Array.from(totMap.values());
  }, [filteredSales]);

  // Prepare performance data using filtered data
  const performanceData: PerformanceData[] = useMemo(() => {
    const totMap = new Map<string, PerformanceData>();
    
    // Aggregate sales data
    filteredSales.forEach(sale => {
      const totId = sale.totId || sale.tot_id || '';
      const existing = totMap.get(totId) || {
        name: sale.totName || 'Unknown TOT',
        localMrName: sale.localMrName || '',
        farmersServed: 0,
        totalSales: 0,
        totalRevenue: 0,
        mechanisationJobs: 0,
        trainingsHeld: 0,
        visitsLogged: 0,
      };
      
      existing.totalSales += 1;
      existing.totalRevenue += sale.total || sale.total_amount || 0;
      totMap.set(totId, existing);
    });
    
    // Add machinery bookings data
    filteredMachineryBookings.forEach((booking: any) => {
      const totId = booking.booked_by || '';
      if (totMap.has(totId)) {
        totMap.get(totId)!.mechanisationJobs += 1;
      }
    });
    
    // Add trainings data
    filteredTrainings.forEach(training => {
      const trainerId = training.trainer_id || '';
      if (totMap.has(trainerId)) {
        totMap.get(trainerId)!.trainingsHeld += 1;
      }
    });
    
    // Add visits data
    filteredVisits.forEach(visit => {
      const totId = visit.tot_id || '';
      if (totMap.has(totId)) {
        totMap.get(totId)!.visitsLogged += 1;
      }
    });
    
    return Array.from(totMap.values());
  }, [filteredSales, filteredMachineryBookings, filteredTrainings, filteredVisits]);

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'forest': return 'bg-primary text-primary-foreground';
      case 'wheat': return 'bg-accent text-accent-foreground';
      case 'earth': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  const handleExport = async (reportId: string, format: 'pdf' | 'excel') => {
    setLoadingReport(`${reportId}-${format}`);
    
    try {
      const userName = user?.name || 'System User';
      
      switch (reportId) {
        case 'farmers':
          if (format === 'pdf') {
            await exportFarmersToPDF(farmers as any, 'farmers_report', userName);
          } else {
            exportFarmersToExcel(farmers as any, 'farmers_report');
          }
          break;
          
        case 'sales':
          if (format === 'pdf') {
            await exportSalesToPDF(filteredSales as any, 'sales_report', userName);
          } else {
            exportSalesToExcel(filteredSales as any, 'sales_report');
          }
          break;
          
        case 'machinery':
          // Use mechanisation export functions for machinery bookings
          if (format === 'pdf') {
            await exportMechanisationToPDF(filteredMachineryBookings as any, 'machinery_report', userName);
          } else {
            exportMechanisationToExcel(filteredMachineryBookings as any, 'machinery_report');
          }
          break;
          
        case 'trainings':
          if (format === 'pdf') {
            await exportTrainingsToPDF(filteredTrainings as any, 'trainings_report', userName);
          } else {
            exportTrainingsToExcel(filteredTrainings as any, 'trainings_report');
          }
          break;
          
        case 'visits':
          if (format === 'pdf') {
            await exportVisitsToPDF(filteredVisits as any, 'visits_report', userName);
          } else {
            exportVisitsToExcel(filteredVisits as any, 'visits_report');
          }
          break;
          
        case 'commission':
          if (format === 'pdf') {
            await exportCommissionToPDF(commissionData, 'commission_report', userName);
          } else {
            exportCommissionToExcel(commissionData, 'commission_report');
          }
          break;
          
        case 'performance':
        case 'branch':
          if (format === 'pdf') {
            await exportPerformanceToPDF(performanceData, 'performance_report', userName);
          } else {
            exportPerformanceToExcel(performanceData, 'performance_report');
          }
          break;
          
        default:
          toast.error('Report type not supported yet');
          return;
      }
      
      toast.success(`${format.toUpperCase()} report exported successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setLoadingReport(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and export reports in PDF or Excel</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={clearDateFilters}
            disabled={!startDate && !endDate}
          >
            Clear Filters
          </Button>
        </div>
        {(startDate || endDate) && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing data from {startDate || 'beginning'} to {endDate || 'now'}
          </p>
        )}
      </Card>

      {/* Monthly Summary */}
      <Card variant="gradient" className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-base sm:text-lg font-semibold mb-1">
              {startDate || endDate ? 'Filtered Summary' : 'Monthly Summary'}
            </h3>
            <p className="text-xs sm:text-sm opacity-80">
              {startDate || endDate ? 'Based on selected date range' : `${currentMonth} overview`}
            </p>
          </div>
          {isLoading ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-12 w-20" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{summary.farmers}</p>
                <p className="text-xs opacity-80">Farmers</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.sales}</p>
                <p className="text-xs opacity-80">Sales</p>
              </div>
              <div>
                <p className="text-2xl font-bold">KES {(summary.totalSales / 1000).toFixed(0)}K</p>
                <p className="text-xs opacity-80">Revenue</p>
              </div>
              <div>
                <p className="text-2xl font-bold">KES {(summary.totalCommission / 1000).toFixed(0)}K</p>
                <p className="text-xs opacity-80">Commission</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {allReports.map((report, index) => {
          const getRecordCount = () => {
            switch (report.id) {
              case 'farmers': return farmers.length;
              case 'sales': return filteredSales.length;
              case 'machinery': return filteredMachineryBookings.length;
              case 'trainings': return filteredTrainings.length;
              case 'visits': return filteredVisits.length;
              case 'commission': return commissionData.length;
              case 'performance':
              case 'branch': return performanceData.length;
              default: return 0;
            }
          };
          
          const recordCount = getRecordCount();
          const isPdfLoading = loadingReport === `${report.id}-pdf`;
          const isExcelLoading = loadingReport === `${report.id}-excel`;
          
          return (
            <Card 
              key={report.id}
              variant="elevated"
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getColorClass(report.color)}`}>
                    <report.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">{recordCount} records</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
                <CardTitle className="text-sm sm:text-lg mb-1">{report.title}</CardTitle>
                <CardDescription className="text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">
                  {report.description}
                </CardDescription>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs h-8 sm:h-9"
                    onClick={() => handleExport(report.id, 'pdf')}
                    disabled={isLoading || isPdfLoading || recordCount === 0}
                  >
                    {isPdfLoading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1" />
                    )}
                    PDF
                  </Button>
                  <Button 
                    variant="forest" 
                    size="sm" 
                    className="flex-1 text-xs h-8 sm:h-9"
                    onClick={() => handleExport(report.id, 'excel')}
                    disabled={isLoading || isExcelLoading || recordCount === 0}
                  >
                    {isExcelLoading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1" />
                    )}
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Data Status */}
      <Card variant="elevated">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Data Overview</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Current data available for reports
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-semibold">{summary.farmers}</p>
                <p className="text-xs text-muted-foreground">Farmers</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-semibold">{summary.sales}</p>
                <p className="text-xs text-muted-foreground">Sales</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Tractor className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-semibold">{summary.machinery}</p>
                <p className="text-xs text-muted-foreground">Mach Jobs</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <GraduationCap className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-semibold">{summary.trainings}</p>
                <p className="text-xs text-muted-foreground">Trainings</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <MapPin className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-semibold">{summary.visits}</p>
                <p className="text-xs text-muted-foreground">Visits</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <FileText className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-semibold">{commissionData.length}</p>
                <p className="text-xs text-muted-foreground">TOTs</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
